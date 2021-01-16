/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

//! Conversions from legacy formats.

use std::convert::TryInto;
use std::fmt::Debug;

use crate::commit::{BlobSequenceValue, DataLoss, ScalarValue};
use crate::proto::tensorboard as pb;
use pb::summary_metadata::PluginData;

pub(crate) const SCALARS_PLUGIN_NAME: &str = "scalars";
pub(crate) const IMAGES_PLUGIN_NAME: &str = "images";
pub(crate) const AUDIO_PLUGIN_NAME: &str = "audio";
pub(crate) const GRAPHS_PLUGIN_NAME: &str = "graphs";
pub(crate) const GRAPH_TAGGED_RUN_METADATA_PLUGIN_NAME: &str = "graph_tagged_run_metadata";
pub(crate) const GRAPH_RUN_METADATA_PLUGIN_NAME: &str = "graph_run_metadata";
pub(crate) const GRAPH_RUN_METADATA_WITH_GRAPH_PLUGIN_NAME: &str = "graph_run_metadata_graph";
pub(crate) const GRAPH_KERAS_MODEL_PLUGIN_NAME: &str = "graph_keras_model";

/// The inner contents of a single value from an event.
///
/// This does not include associated step, wall time, tag, or summary metadata information. Step
/// and wall time are available on every event and just not tracked here. Tag and summary metadata
/// information are materialized on `Event`s whose `oneof what` is `tagged_run_metadata` or
/// `summary`, but implicit for graph defs. See [`GraphDefValue::initial_metadata`],
/// [`TaggedRunMetadataValue::initial_metadata`], and [`SummaryValue::initial_metadata`] for
/// type-specific helpers to determine summary metadata given appropriate information.
///
/// This is kept as close as possible to the on-disk event representation, since every record in
/// the stream is converted into this format.
///
/// There is no method provided to turn an [`Event`][`pb::Event`] proto into a stream of
/// `EventValue`s because what needs to be done there depends on the reader state. Specifically,
/// summary values' metadata needs to be read and converted from legacy formats only for the first
/// record in each time series, and it would be expensive and wasteful to do so unconditionally.
/// Thus, this logic is left to the run reader.
#[derive(Debug)]
pub enum EventValue {
    GraphDef(GraphDefValue),
    TaggedRunMetadata(TaggedRunMetadataValue),
    Summary(SummaryValue),
}

impl EventValue {
    /// Consumes this event value and enriches it into a scalar.
    ///
    /// This supports `simple_value` (TF 1.x) summaries as well as rank-0 tensors of type
    /// `DT_FLOAT`. Returns `DataLoss` if the value is a `GraphDef`, a tagged run metadata proto,
    /// an unsupported summary, or a tensor of the wrong rank.
    pub fn into_scalar(self) -> Result<ScalarValue, DataLoss> {
        let value_box = match self {
            EventValue::GraphDef(_) => return Err(DataLoss),
            EventValue::TaggedRunMetadata(_) => return Err(DataLoss),
            EventValue::Summary(SummaryValue(v)) => v,
        };
        match *value_box {
            pb::summary::value::Value::SimpleValue(f) => Ok(ScalarValue(f)),
            pb::summary::value::Value::Tensor(tp) => match tensor_proto_to_scalar(&tp) {
                Some(f) => Ok(ScalarValue(f)),
                None => Err(DataLoss),
            },
            _ => Err(DataLoss),
        }
    }

    /// Consumes this event value and enriches it into a blob sequence.
    ///
    /// This supports:
    ///
    ///   - `GraphDef`s;
    ///   - tagged run metadata protos;
    ///   - summaries with TensorFlow 1.x `image` or `audio`;
    ///   - summaries with `tensor` set to a rank-1 tensor of type `DT_STRING`;
    ///   - for audio metadata, summaries with `tensor` set to a shape-`[k, 2]` tensor of type
    ///     `DT_STRING`, in which case the second axis is assumed to represent string labels and is
    ///     dropped entirely;
    ///   - for graph sub-plugin metadata, summaries with `tensor` set to a rank-0 tensor of type
    ///     `DT_STRING`, which is converted to a shape-`[1]` tensor.
    pub fn into_blob_sequence(
        self,
        metadata: &pb::SummaryMetadata,
    ) -> Result<BlobSequenceValue, DataLoss> {
        match self {
            EventValue::GraphDef(GraphDefValue(blob)) => Ok(BlobSequenceValue(vec![blob])),
            EventValue::TaggedRunMetadata(TaggedRunMetadataValue(run_metadata)) => {
                Ok(BlobSequenceValue(vec![run_metadata]))
            }
            EventValue::Summary(SummaryValue(value_box)) => match *value_box {
                pb::summary::value::Value::Image(im) => {
                    let w = format!("{}", im.width).into_bytes();
                    let h = format!("{}", im.height).into_bytes();
                    let buf = im.encoded_image_string;
                    Ok(BlobSequenceValue(vec![w, h, buf]))
                }
                pb::summary::value::Value::Audio(au) => {
                    Ok(BlobSequenceValue(vec![au.encoded_audio_string]))
                }
                pb::summary::value::Value::Tensor(mut tp)
                    if tp.dtype == i32::from(pb::DataType::DtString) =>
                {
                    let shape = tp.tensor_shape.unwrap_or_default();
                    if shape.dim.len() == 1 {
                        Ok(BlobSequenceValue(tp.string_val))
                    } else if shape.dim.len() == 2
                        && shape.dim[1].size == 2
                        && is_plugin(&metadata, AUDIO_PLUGIN_NAME)
                    {
                        // Extract just the actual audio clips along the first axis.
                        let audio: Vec<Vec<u8>> = tp
                            .string_val
                            .chunks_exact_mut(2)
                            .map(|chunk| std::mem::take(&mut chunk[0]))
                            .collect();
                        Ok(BlobSequenceValue(audio))
                    } else if shape.dim.is_empty()
                        && tp.string_val.len() == 1
                        && (is_plugin(&metadata, GRAPH_RUN_METADATA_PLUGIN_NAME)
                            || is_plugin(&metadata, GRAPH_RUN_METADATA_WITH_GRAPH_PLUGIN_NAME)
                            || is_plugin(&metadata, GRAPH_KERAS_MODEL_PLUGIN_NAME))
                    {
                        let data = tp.string_val.into_iter().next().unwrap();
                        Ok(BlobSequenceValue(vec![data]))
                    } else {
                        Err(DataLoss)
                    }
                }
                _ => Err(DataLoss),
            },
        }
    }
}

fn tensor_proto_to_scalar(tp: &pb::TensorProto) -> Option<f32> {
    // Ensure that it's rank-0. Treat an absent `tensor_shape` as an empty message, which happens
    // to imply rank 0.
    match &tp.tensor_shape {
        Some(s) if !s.dim.is_empty() => return None,
        _ => (),
    }
    use pb::DataType;
    match DataType::from_i32(tp.dtype) {
        Some(DataType::DtFloat) => {
            // Could have data in either `float_val` or `tensor_content`.
            if let Some(f) = tp.float_val.first() {
                if tp.float_val.len() == 1 {
                    Some(*f)
                } else {
                    None
                }
            } else if let Ok(f) = (&*tp.tensor_content).try_into().map(f32::from_le_bytes) {
                Some(f)
            } else {
                None
            }
        }
        _ => None,
    }
}

/// Tests whether `md` has plugin name `plugin_name`.
fn is_plugin(md: &pb::SummaryMetadata, plugin_name: &str) -> bool {
    md.plugin_data
        .as_ref()
        .map_or(false, |pd| pd.plugin_name == plugin_name)
}

/// A value from an `Event` whose `graph_def` field is set.
///
/// This contains the raw bytes of a serialized `GraphDef` proto. It implies a fixed tag name and
/// plugin metadata, but these are not materialized.
pub struct GraphDefValue(pub Vec<u8>);

/// A value from an `Event` whose `tagged_run_metadata` field is set.
///
/// This contains only the `run_metadata` from the event (not the tag). This itself represents the
/// encoding of a `RunMetadata` proto, but that is deserialized at the plugin level.
pub struct TaggedRunMetadataValue(pub Vec<u8>);

/// A value from an `Event` whose `summary` field is set.
///
/// This contains a [`summary::value::Value`], which represents the underlying `oneof value` field
/// (a `simple_value`, `tensor`, etc.). It is not to be confused with a [`summary::Value`], which
/// is the container around a `summary::value::Value` that also has tag and metadata information.
///
/// This field is boxed because `Value`s are large (in turn because [`TensorProto`]s are large,
/// because each `repeated` field takes up 3 words for its `Vec`).
///
/// [`TensorProto`]: `pb::TensorProto`
/// [`summary::Value`]: `pb::summary::Value`
/// [`summary::value::Value`]: `pb::summary::value::Value`
#[derive(Debug)]
pub struct SummaryValue(pub Box<pb::summary::value::Value>);

impl GraphDefValue {
    /// Tag name used for run-level graphs.
    ///
    /// This must match `tensorboard.plugins.graph.metadata.RUN_GRAPH_NAME`.
    pub const TAG_NAME: &'static str = "__run_graph__";

    /// Determines the metadata for a time series whose first event is a
    /// [`GraphDef`][`EventValue::GraphDef`].
    pub fn initial_metadata() -> Box<pb::SummaryMetadata> {
        blank(GRAPHS_PLUGIN_NAME, pb::DataClass::BlobSequence)
    }
}

impl TaggedRunMetadataValue {
    /// Determines the metadata for a time series whose first event is a
    /// [`TaggedRunMetadata`][`EventValue::TaggedRunMetadata`].
    pub fn initial_metadata() -> Box<pb::SummaryMetadata> {
        blank(
            GRAPH_TAGGED_RUN_METADATA_PLUGIN_NAME,
            pb::DataClass::BlobSequence,
        )
    }
}

impl SummaryValue {
    /// Determines the metadata for a time series given its first event.
    ///
    /// This fills in the plugin name and/or data class for legacy summaries for which those values
    /// are implied but not explicitly set. You should only need to call this function on the first
    /// event from each time series; doing so for subsequent events would be wasteful.
    ///
    /// Rules, in order of decreasing precedence:
    ///
    ///   - If the initial metadata has a data class, it is taken as authoritative and returned
    ///     verbatim.
    ///   - If the summary value is of primitive type, an appropriate plugin metadata value is
    ///     synthesized: e.g. a `simple_value` becomes metadata for the scalars plugin. Any
    ///     existing metadata is ignored.
    ///   - If the metadata has a known plugin name, the appropriate data class is added: e.g., a
    ///     `"scalars"` metadata gets `DataClass::Scalar`.
    ///   - Otherwise, the metadata is returned as is (or an empty metadata value synthesized if
    ///     the given option was empty).
    pub fn initial_metadata(&self, md: Option<pb::SummaryMetadata>) -> Box<pb::SummaryMetadata> {
        use pb::summary::value::Value;

        match (md, &*self.0) {
            // Any summary metadata that sets its own data class is expected to already be in the right
            // form.
            (Some(md), _) if md.data_class != i32::from(pb::DataClass::Unknown) => Box::new(md),
            (_, Value::SimpleValue(_)) => blank(SCALARS_PLUGIN_NAME, pb::DataClass::Scalar),
            (_, Value::Image(_)) => blank(IMAGES_PLUGIN_NAME, pb::DataClass::BlobSequence),
            (_, Value::Audio(_)) => blank(AUDIO_PLUGIN_NAME, pb::DataClass::BlobSequence),
            (Some(mut md), _) => {
                // Use given metadata, but first set data class based on plugin name, if known.
                match md.plugin_data.as_ref().map(|pd| pd.plugin_name.as_str()) {
                    Some(SCALARS_PLUGIN_NAME) => {
                        md.data_class = pb::DataClass::Scalar.into();
                    }
                    Some(IMAGES_PLUGIN_NAME)
                    | Some(AUDIO_PLUGIN_NAME)
                    | Some(GRAPH_RUN_METADATA_PLUGIN_NAME)
                    | Some(GRAPH_RUN_METADATA_WITH_GRAPH_PLUGIN_NAME)
                    | Some(GRAPH_KERAS_MODEL_PLUGIN_NAME) => {
                        md.data_class = pb::DataClass::BlobSequence.into();
                    }
                    _ => {}
                };
                Box::new(md)
            }
            (None, _) => Box::new(pb::SummaryMetadata::default()),
        }
    }
}

impl Debug for GraphDefValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("GraphDefValue")
            .field(&format_args!("<{} bytes>", self.0.len()))
            .finish()
    }
}

impl Debug for TaggedRunMetadataValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("TaggedRunMetadataValue")
            .field(&format_args!("<{} bytes>", self.0.len()))
            .finish()
    }
}

/// Creates a summary metadata value with plugin name and data class, but no other contents.
fn blank(plugin_name: &str, data_class: pb::DataClass) -> Box<pb::SummaryMetadata> {
    Box::new(pb::SummaryMetadata {
        plugin_data: Some(PluginData {
            plugin_name: plugin_name.to_string(),
            ..Default::default()
        }),
        data_class: data_class.into(),
        ..Default::default()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use pb::summary::value::Value;

    fn tensor_shape(dims: &[i64]) -> pb::TensorShapeProto {
        pb::TensorShapeProto {
            dim: dims
                .iter()
                .map(|n| pb::tensor_shape_proto::Dim {
                    size: *n,
                    ..Default::default()
                })
                .collect(),
            ..Default::default()
        }
    }

    mod scalars {
        use super::*;

        #[test]
        fn test_metadata_tf1x_simple_value() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: "ignored_plugin".to_string(),
                    content: b"ignored_content".to_vec(),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::SimpleValue(0.125)));
            let result = v.initial_metadata(Some(md));

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: SCALARS_PLUGIN_NAME.to_string(),
                        ..Default::default()
                    }),
                    data_class: pb::DataClass::Scalar.into(),
                    ..Default::default()
                }
            );
        }

        #[test]
        fn test_metadata_tf2x_scalar_tensor_without_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: SCALARS_PLUGIN_NAME.to_string(),
                    content: b"preserved!".to_vec(),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtFloat.into(),
                tensor_shape: Some(tensor_shape(&[])),
                float_val: vec![0.125],
                ..Default::default()
            })));
            let result = v.initial_metadata(Some(md));

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: SCALARS_PLUGIN_NAME.to_string(),
                        content: b"preserved!".to_vec(),
                        ..Default::default()
                    }),
                    data_class: pb::DataClass::Scalar.into(),
                    ..Default::default()
                }
            );
        }

        #[test]
        fn test_enrich_simple_value() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::SimpleValue(0.125))));
            assert_eq!(v.into_scalar(), Ok(ScalarValue(0.125)));
        }

        #[test]
        fn test_enrich_valid_tensors() {
            let tensors = vec![
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    float_val: vec![0.125],
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    tensor_content: f32::to_le_bytes(0.125).to_vec(),
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: None, // no explicit tensor shape; treated as rank 0
                    tensor_content: f32::to_le_bytes(0.125).to_vec(),
                    ..Default::default()
                },
            ];
            for tensor in tensors {
                let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(tensor.clone()))));
                let expected = Ok(ScalarValue(0.125));
                let actual = v.into_scalar();
                assert_eq!(
                    actual, expected,
                    "into_scalar for {:?}: got {:?}, expected {:?}",
                    &tensor, actual, expected
                )
            }
        }

        #[test]
        fn test_enrich_short_tensors() {
            let tensors = vec![
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    float_val: vec![],
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    tensor_content: f32::to_le_bytes(0.125)[..2].to_vec(),
                    ..Default::default()
                },
            ];
            for tensor in tensors {
                let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(tensor.clone()))));
                let expected = Err(DataLoss);
                let actual = v.into_scalar();
                assert_eq!(
                    actual, expected,
                    "into_scalar for {:?}: got {:?}, expected {:?}",
                    &tensor, actual, expected
                )
            }
        }

        #[test]
        fn test_enrich_long_tensors() {
            let tensors = vec![
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    float_val: vec![0.125, 9.99],
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    tensor_content: [f32::to_le_bytes(0.125), f32::to_le_bytes(9.99)]
                        .iter()
                        .flatten()
                        .copied()
                        .collect(),
                    ..Default::default()
                },
            ];
            for tensor in tensors {
                let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(tensor.clone()))));
                let expected = Err(DataLoss);
                let actual = v.into_scalar();
                assert_eq!(
                    actual, expected,
                    "into_scalar for {:?}: got {:?}, expected {:?}",
                    &tensor, actual, expected
                )
            }
        }

        #[test]
        fn test_enrich_higher_rank_tensors() {
            let tensors = vec![
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[2, 2])),
                    float_val: vec![0.125, 9.99, 1.0, 2.0],
                    ..Default::default()
                },
                // Rank-3 tensor that happens to be of size 1: still invalid.
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: Some(tensor_shape(&[1, 1, 1])),
                    float_val: vec![0.125],
                    ..Default::default()
                },
            ];
            for tensor in tensors {
                let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(tensor.clone()))));
                let expected = Err(DataLoss);
                let actual = v.into_scalar();
                assert_eq!(
                    actual, expected,
                    "into_scalar for {:?}: got {:?}, expected {:?}",
                    &tensor, actual, expected
                )
            }
        }

        #[test]
        fn test_enrich_non_float_tensors() {
            let tensors = vec![
                pb::TensorProto {
                    dtype: pb::DataType::DtString.into(),
                    string_val: vec![b"abc".to_vec()],
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtInt32.into(),
                    int_val: vec![123],
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtDouble.into(),
                    double_val: vec![123.0],
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtDouble.into(),
                    tensor_content: f64::to_le_bytes(123.0).to_vec(),
                    ..Default::default()
                },
                pb::TensorProto::default(),
            ];
            for tensor in tensors {
                let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(tensor.clone()))));
                let expected = Err(DataLoss);
                let actual = v.into_scalar();
                assert_eq!(
                    actual, expected,
                    "into_scalar for {:?}: got {:?}, expected {:?}",
                    &tensor, actual, expected
                )
            }
        }

        #[test]
        fn test_enrich_graph_def() {
            let v = EventValue::GraphDef(GraphDefValue(vec![1, 2, 3, 4]));
            assert_eq!(v.into_scalar(), Err(DataLoss));
        }

        #[test]
        fn test_enrich_non_scalar_summary_values() {
            let image_value = Value::Image(pb::summary::Image::default());
            let v = EventValue::Summary(SummaryValue(Box::new(image_value)));
            assert_eq!(v.into_scalar(), Err(DataLoss));
        }
    }

    mod blob_sequences {
        use super::*;

        #[test]
        fn test_metadata_graph() {
            let md = GraphDefValue::initial_metadata();
            assert_eq!(&md.plugin_data.unwrap().plugin_name, GRAPHS_PLUGIN_NAME);
            assert_eq!(md.data_class, i32::from(pb::DataClass::BlobSequence));
        }

        #[test]
        fn test_metadata_tagged_run_metadata() {
            let md = TaggedRunMetadataValue::initial_metadata();
            assert_eq!(
                &md.plugin_data.unwrap().plugin_name,
                GRAPH_TAGGED_RUN_METADATA_PLUGIN_NAME
            );
            assert_eq!(md.data_class, i32::from(pb::DataClass::BlobSequence));
        }

        #[test]
        fn test_metadata_tf1x_image() {
            let v = SummaryValue(Box::new(Value::Image(pb::summary::Image {
                height: 480,
                width: 640,
                colorspace: 3,
                encoded_image_string: b"\x89PNGabc".to_vec(),
                ..Default::default()
            })));
            let result = v.initial_metadata(None);

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: IMAGES_PLUGIN_NAME.to_string(),
                        ..Default::default()
                    }),
                    data_class: pb::DataClass::BlobSequence.into(),
                    ..Default::default()
                }
            );
        }

        #[test]
        fn test_metadata_tf2x_image_without_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: IMAGES_PLUGIN_NAME.to_string(),
                    content: b"preserved!".to_vec(),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[2])),
                string_val: vec![b"\x89PNGabc".to_vec(), b"\x89PNGdef".to_vec()],
                ..Default::default()
            })));
            let result = v.initial_metadata(Some(md));

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: IMAGES_PLUGIN_NAME.to_string(),
                        content: b"preserved!".to_vec(),
                        ..Default::default()
                    }),
                    data_class: pb::DataClass::BlobSequence.into(),
                    ..Default::default()
                }
            );
        }

        #[test]
        fn test_metadata_tf1x_audio() {
            let v = SummaryValue(Box::new(Value::Audio(pb::summary::Audio {
                sample_rate: 44100.0,
                encoded_audio_string: b"RIFFabcd".to_vec(),
                ..Default::default()
            })));
            let result = v.initial_metadata(None);

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: AUDIO_PLUGIN_NAME.to_string(),
                        ..Default::default()
                    }),
                    data_class: pb::DataClass::BlobSequence.into(),
                    ..Default::default()
                }
            );
        }

        #[test]
        fn test_metadata_tf2x_audio_without_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: AUDIO_PLUGIN_NAME.to_string(),
                    content: b"preserved!".to_vec(),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[1, 2])),
                string_val: vec![b"\x89PNGabc".to_vec(), b"label".to_vec()],
                ..Default::default()
            })));
            let result = v.initial_metadata(Some(md));

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: AUDIO_PLUGIN_NAME.to_string(),
                        content: b"preserved!".to_vec(),
                        ..Default::default()
                    }),
                    data_class: pb::DataClass::BlobSequence.into(),
                    ..Default::default()
                }
            );
        }

        #[test]
        fn test_graph_subplugins() {
            for &plugin_name in &[
                GRAPH_RUN_METADATA_PLUGIN_NAME,
                GRAPH_RUN_METADATA_WITH_GRAPH_PLUGIN_NAME,
                GRAPH_KERAS_MODEL_PLUGIN_NAME,
            ] {
                let md = pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: plugin_name.to_string(),
                        content: b"1".to_vec(),
                        ..Default::default()
                    }),
                    ..Default::default()
                };
                let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                    dtype: pb::DataType::DtString.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    string_val: vec![b"some-graph-proto".to_vec()],
                    ..Default::default()
                })));

                // Test both metadata and enrichment here, for convenience.
                let initial_metadata = v.initial_metadata(Some(md));
                assert_eq!(
                    *initial_metadata,
                    pb::SummaryMetadata {
                        plugin_data: Some(PluginData {
                            plugin_name: plugin_name.to_string(),
                            content: b"1".to_vec(),
                            ..Default::default()
                        }),
                        data_class: pb::DataClass::BlobSequence.into(),
                        ..Default::default()
                    },
                );
                let expected_enriched = BlobSequenceValue(vec![b"some-graph-proto".to_vec()]);
                let actual_enriched = EventValue::Summary(v).into_blob_sequence(&initial_metadata);
                assert_eq!(actual_enriched, Ok(expected_enriched));
            }
        }

        #[test]
        fn test_enrich_graph_def() {
            let v = EventValue::GraphDef(GraphDefValue(vec![1, 2, 3, 4]));
            assert_eq!(
                v.into_blob_sequence(GraphDefValue::initial_metadata().as_ref()),
                Ok(BlobSequenceValue(vec![vec![1, 2, 3, 4]]))
            );
        }

        #[test]
        fn test_enrich_tagged_run_metadata() {
            let v = EventValue::TaggedRunMetadata(TaggedRunMetadataValue(vec![1, 2, 3, 4]));
            assert_eq!(
                v.into_blob_sequence(GraphDefValue::initial_metadata().as_ref()),
                Ok(BlobSequenceValue(vec![vec![1, 2, 3, 4]]))
            );
        }

        #[test]
        fn test_enrich_tf1x_image() {
            let v = SummaryValue(Box::new(Value::Image(pb::summary::Image {
                height: 480,
                width: 640,
                colorspace: 3,
                encoded_image_string: b"\x89PNGabc".to_vec(),
                ..Default::default()
            })));
            let md = v.initial_metadata(None);
            let expected = BlobSequenceValue(vec![
                b"640".to_vec(),
                b"480".to_vec(),
                b"\x89PNGabc".to_vec(),
            ]);
            assert_eq!(
                EventValue::Summary(v).into_blob_sequence(md.as_ref()),
                Ok(expected)
            );
        }

        #[test]
        fn test_enrich_valid_tensor() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[2])),
                string_val: vec![b"abc".to_vec(), b"defghi".to_vec()],
                ..Default::default()
            }))));
            let expected = BlobSequenceValue(vec![b"abc".to_vec(), b"defghi".to_vec()]);
            assert_eq!(
                v.into_blob_sequence(&blank("myblobs", pb::DataClass::BlobSequence)),
                Ok(expected)
            );
        }

        #[test]
        fn test_enrich_valid_empty_tensor() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[0])),
                string_val: vec![],
                ..Default::default()
            }))));
            let expected = BlobSequenceValue(vec![]);
            assert_eq!(
                v.into_blob_sequence(&blank("myblobs", pb::DataClass::BlobSequence)),
                Ok(expected)
            );
        }

        #[test]
        fn test_enrich_invalid_empty_tensor() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[0, 3])), // bad rank
                string_val: vec![],
                ..Default::default()
            }))));
            assert_eq!(
                v.into_blob_sequence(&blank("myblobs", pb::DataClass::BlobSequence)),
                Err(DataLoss)
            );
        }

        #[test]
        fn test_enrich_scalar_tensor() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[])),
                string_val: vec![b"no scalars for you".to_vec()],
                ..Default::default()
            }))));
            assert_eq!(
                v.into_blob_sequence(&blank("myblobs", pb::DataClass::BlobSequence)),
                Err(DataLoss)
            );
        }

        #[test]
        fn test_enrich_higher_rank_tensor() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[2, 2])),
                string_val: vec![
                    b"ab".to_vec(),
                    b"cd".to_vec(),
                    b"ef".to_vec(),
                    b"gh".to_vec(),
                ],
                ..Default::default()
            }))));
            assert_eq!(
                v.into_blob_sequence(&blank("myblobs", pb::DataClass::BlobSequence)),
                Err(DataLoss)
            );
        }

        #[test]
        fn test_enrich_non_string_tensor() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtFloat.into(),
                tensor_shape: Some(tensor_shape(&[2])),
                float_val: vec![1.0, 2.0],
                ..Default::default()
            }))));
            assert_eq!(
                v.into_blob_sequence(&blank("myblobs", pb::DataClass::BlobSequence)),
                Err(DataLoss)
            );
        }

        #[test]
        fn test_enrich_tf1x_audio() {
            let v = SummaryValue(Box::new(Value::Audio(pb::summary::Audio {
                sample_rate: 44100.0,
                encoded_audio_string: b"RIFFabcd".to_vec(),
                ..Default::default()
            })));
            let md = v.initial_metadata(None);
            let expected = BlobSequenceValue(vec![b"RIFFabcd".to_vec()]);
            assert_eq!(
                EventValue::Summary(v).into_blob_sequence(md.as_ref()),
                Ok(expected)
            );
        }

        #[test]
        fn test_enrich_audio_without_labels() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[3])),
                string_val: vec![
                    b"RIFFwav0".to_vec(),
                    b"RIFFwav1".to_vec(),
                    b"RIFFwav2".to_vec(),
                ],
                ..Default::default()
            }))));
            let expected = BlobSequenceValue(vec![
                b"RIFFwav0".to_vec(),
                b"RIFFwav1".to_vec(),
                b"RIFFwav2".to_vec(),
            ]);
            assert_eq!(
                v.into_blob_sequence(&blank(AUDIO_PLUGIN_NAME, pb::DataClass::BlobSequence)),
                Ok(expected)
            );
        }

        #[test]
        fn test_enrich_audio_with_labels() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[3, 2])),
                string_val: vec![
                    b"RIFFwav0".to_vec(),
                    b"label 0".to_vec(),
                    b"RIFFwav1".to_vec(),
                    b"label 1".to_vec(),
                    b"RIFFwav2".to_vec(),
                    b"label 2".to_vec(),
                ],
                ..Default::default()
            }))));
            let expected = BlobSequenceValue(vec![
                b"RIFFwav0".to_vec(),
                b"RIFFwav1".to_vec(),
                b"RIFFwav2".to_vec(),
            ]);
            assert_eq!(
                v.into_blob_sequence(&blank(AUDIO_PLUGIN_NAME, pb::DataClass::BlobSequence)),
                Ok(expected)
            );
        }
    }

    mod unknown {
        use super::*;

        #[test]
        fn test_custom_plugin_with_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: "myplugin".to_string(),
                    content: b"mycontent".to_vec(),
                    ..Default::default()
                }),
                data_class: pb::DataClass::Tensor.into(),
                ..Default::default()
            };
            // Even with a `SimpleValue`, dataclass-annotated metadata passes through.
            let v = SummaryValue(Box::new(Value::SimpleValue(0.125)));
            let result = v.initial_metadata(Some(md.clone()));
            assert_eq!(*result, md);
        }

        #[test]
        fn test_unknown_plugin_no_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: "myplugin".to_string(),
                    content: b"mycontent".to_vec(),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto::default())));
            let result = v.initial_metadata(Some(md.clone()));
            assert_eq!(*result, md);
        }

        #[test]
        fn test_empty() {
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto::default())));
            let result = v.initial_metadata(None);
            assert_eq!(*result, pb::SummaryMetadata::default());
        }
    }
}
