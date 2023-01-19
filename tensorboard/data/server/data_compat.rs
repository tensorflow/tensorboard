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

use bytes::Bytes;
use prost::Message;
use std::convert::TryInto;
use std::fmt::Debug;
use std::iter;

use crate::commit::{BlobSequenceValue, DataLoss, ScalarValue};
use crate::proto::tensorboard as pb;
use pb::summary_metadata::PluginData;

/// Plugin names with special compatibility considerations.
///
/// The constants in this module denote values of the `summary_metadata.plugin_data.plugin_name`
/// proto field, and must match exactly those values written to disk. The sources of truth are
/// generally the `tensorboard/plugins/*/metadata.py` files in the TensorBoard repository.
pub(crate) mod plugin_names {
    pub const SCALARS: &str = "scalars";
    pub const IMAGES: &str = "images";
    pub const AUDIO: &str = "audio";
    pub const GRAPHS: &str = "graphs";
    pub const GRAPH_TAGGED_RUN_METADATA: &str = "graph_tagged_run_metadata";
    pub const GRAPH_RUN_METADATA: &str = "graph_run_metadata";
    pub const GRAPH_RUN_METADATA_WITH_GRAPH: &str = "graph_run_metadata_graph";
    pub const GRAPH_KERAS_MODEL: &str = "graph_keras_model";
    pub const HISTOGRAMS: &str = "histograms";
    pub const TEXT: &str = "text";
    pub const PR_CURVES: &str = "pr_curves";
    pub const HPARAMS: &str = "hparams";
    pub const MESH: &str = "mesh";
    pub const CUSTOM_SCALARS: &str = "custom_scalars";
}

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

    /// Consumes this event value and enriches it into a tensor.
    ///
    /// This supports:
    ///
    ///   - summaries with `tensor` populated;
    ///   - summaries with TensorFlow 1.x `histogram`.
    pub fn into_tensor(self, _metadata: &pb::SummaryMetadata) -> Result<pb::TensorProto, DataLoss> {
        let value_box = match self {
            EventValue::GraphDef(_) => return Err(DataLoss),
            EventValue::TaggedRunMetadata(_) => return Err(DataLoss),
            EventValue::Summary(SummaryValue(v)) => v,
        };
        match *value_box {
            pb::summary::value::Value::Tensor(tp) => Ok(tp),
            pb::summary::value::Value::Histo(hp) => {
                // Migrate legacy TF 1.x HistogramProto to TensorProto. The "spec" in summary.proto
                // says `bucket` and `bucket_limit` are parallel arrays encoding bucket counts and
                // bucket right edges; the first bucket's left edge is assumed to be -DBL_MAX and
                // subsequent left edges are defined as the right edge of the preceeding bucket.
                //
                // Our conversion logic in data_compat.py however disobeys this and instead sets the
                // leftmost and rightmost edges to the `min` and `max` values, respectively. This
                // will result in the outermost buckets having left edge > right edge if they were
                // originally empty. Apparently the histogram visualization can't handle buckets
                // extending to -/+ DBL_MAX, but can handle buckets of negative width?
                //
                // For consistency with the status quo, we replicate this questionable logic here.
                if hp.bucket.len() != hp.bucket_limit.len() {
                    return Err(DataLoss);
                }
                let num_buckets = hp.bucket.len();
                // Skip the last `bucket_limit`; it gets replaced by `hp.max`. It's okay to ignore
                // the edge case at 0 since `.zip()` will stop immediately in that case anyway.
                let bucket_edges = &hp.bucket_limit[..usize::saturating_sub(num_buckets, 1)];
                let bucket_lefts = iter::once(hp.min).chain(bucket_edges.iter().copied());
                let bucket_rights = bucket_edges.iter().copied().chain(iter::once(hp.max));
                let bucket_counts = hp.bucket.iter().copied();
                let tensor_content = bucket_lefts
                    .zip(bucket_rights)
                    .zip(bucket_counts)
                    .flat_map(|((l, r), v)| vec![l, r, v])
                    .map(f64::to_le_bytes)
                    .collect::<Vec<_>>()
                    .concat()
                    .into();

                Ok(pb::TensorProto {
                    dtype: pb::DataType::DtDouble.into(),
                    tensor_shape: Some(pb::TensorShapeProto {
                        dim: vec![
                            pb::tensor_shape_proto::Dim {
                                size: num_buckets as i64,
                                ..Default::default()
                            },
                            pb::tensor_shape_proto::Dim {
                                size: 3,
                                ..Default::default()
                            },
                        ],
                        ..Default::default()
                    }),
                    tensor_content,
                    ..Default::default()
                })
            }
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
                    Ok(BlobSequenceValue(vec![w.into(), h.into(), buf]))
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
                        && is_plugin(metadata, plugin_names::AUDIO)
                    {
                        // Extract just the actual audio clips along the first axis.
                        let audio: Vec<Bytes> = tp
                            .string_val
                            .chunks_exact_mut(2)
                            .map(|chunk| std::mem::take(&mut chunk[0]))
                            .collect();
                        Ok(BlobSequenceValue(audio))
                    } else if shape.dim.is_empty()
                        && tp.string_val.len() == 1
                        && (is_plugin(metadata, plugin_names::GRAPH_RUN_METADATA)
                            || is_plugin(metadata, plugin_names::GRAPH_RUN_METADATA_WITH_GRAPH)
                            || is_plugin(metadata, plugin_names::GRAPH_KERAS_MODEL))
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
pub struct GraphDefValue(pub Bytes);

/// A value from an `Event` whose `tagged_run_metadata` field is set.
///
/// This contains only the `run_metadata` from the event (not the tag). This itself represents the
/// encoding of a `RunMetadata` proto, but that is deserialized at the plugin level.
pub struct TaggedRunMetadataValue(pub Bytes);

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
        blank(plugin_names::GRAPHS, pb::DataClass::BlobSequence)
    }
}

impl TaggedRunMetadataValue {
    /// Determines the metadata for a time series whose first event is a
    /// [`TaggedRunMetadata`][`EventValue::TaggedRunMetadata`].
    pub fn initial_metadata() -> Box<pb::SummaryMetadata> {
        blank(
            plugin_names::GRAPH_TAGGED_RUN_METADATA,
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
            (_, Value::SimpleValue(_)) => blank(plugin_names::SCALARS, pb::DataClass::Scalar),
            (_, Value::Image(_)) => tf1x_image_metadata(),
            (_, Value::Audio(_)) => tf1x_audio_metadata(),
            (_, Value::Histo(_)) => blank(plugin_names::HISTOGRAMS, pb::DataClass::Tensor),
            (Some(mut md), _) => {
                // Use given metadata, but first set data class based on plugin name, if known.
                match md.plugin_data.as_ref().map(|pd| pd.plugin_name.as_str()) {
                    Some(plugin_names::SCALARS) => {
                        md.data_class = pb::DataClass::Scalar.into();
                    }
                    Some(plugin_names::HISTOGRAMS)
                    | Some(plugin_names::TEXT)
                    | Some(plugin_names::HPARAMS)
                    | Some(plugin_names::PR_CURVES)
                    | Some(plugin_names::MESH)
                    | Some(plugin_names::CUSTOM_SCALARS) => {
                        md.data_class = pb::DataClass::Tensor.into();
                    }
                    Some(plugin_names::IMAGES)
                    | Some(plugin_names::AUDIO)
                    | Some(plugin_names::GRAPH_RUN_METADATA)
                    | Some(plugin_names::GRAPH_RUN_METADATA_WITH_GRAPH)
                    | Some(plugin_names::GRAPH_KERAS_MODEL) => {
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
    blank_with_plugin_content(plugin_name, data_class, Bytes::new())
}

/// Creates a summary metadata value with plugin name, data class, and plugin contents.
fn blank_with_plugin_content(
    plugin_name: &str,
    data_class: pb::DataClass,
    content: Bytes,
) -> Box<pb::SummaryMetadata> {
    Box::new(pb::SummaryMetadata {
        plugin_data: Some(PluginData {
            plugin_name: plugin_name.to_string(),
            content,
            ..Default::default()
        }),
        data_class: data_class.into(),
        ..Default::default()
    })
}

fn tf1x_image_metadata() -> Box<pb::SummaryMetadata> {
    let plugin_content = pb::ImagePluginData {
        converted_to_tensor: true,
        ..Default::default()
    };
    let mut encoded_content = Vec::new();
    plugin_content
        .encode(&mut encoded_content)
        // vectors are resizable, so should always be able to encode
        .expect("failed to encode image metadata");
    blank_with_plugin_content(
        plugin_names::IMAGES,
        pb::DataClass::BlobSequence,
        Bytes::from(encoded_content),
    )
}

fn tf1x_audio_metadata() -> Box<pb::SummaryMetadata> {
    let plugin_content = pb::AudioPluginData {
        converted_to_tensor: true,
        ..Default::default()
    };
    let mut encoded_content = Vec::new();
    plugin_content
        .encode(&mut encoded_content)
        // vectors are resizable, so should always be able to encode
        .expect("failed to encode audio metadata");
    blank_with_plugin_content(
        plugin_names::AUDIO,
        pb::DataClass::BlobSequence,
        Bytes::from(encoded_content),
    )
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

    /// Macro to construct `Bytes` from an array of numerics having a `to_le_bytes()` method.
    ///
    /// Use like: `let b = to_le_bytes![1.0, 2.0f32];`
    ///
    /// Note the suffixed literal, which is necessary so the compiler knows the intended type.
    macro_rules! to_le_bytes {
        ($($x:expr),+ $(,)?) => (
            [$($x),+].iter()
                .flat_map(|v| IntoIterator::into_iter(v.to_le_bytes()))
                .collect::<Bytes>()
        );
    }

    mod scalars {
        use super::*;

        #[test]
        fn test_metadata_tf1x_simple_value() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: "ignored_plugin".to_string(),
                    content: Bytes::from_static(b"ignored_content"),
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
                        plugin_name: plugin_names::SCALARS.to_string(),
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
                    plugin_name: plugin_names::SCALARS.to_string(),
                    content: Bytes::from_static(b"preserved!"),
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
                        plugin_name: plugin_names::SCALARS.to_string(),
                        content: Bytes::from_static(b"preserved!"),
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
        fn test_enrich_rank_0_tensors() {
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
                    tensor_content: to_le_bytes![0.125f32],
                    ..Default::default()
                },
                pb::TensorProto {
                    dtype: pb::DataType::DtFloat.into(),
                    tensor_shape: None, // no explicit tensor shape; treated as rank 0
                    tensor_content: to_le_bytes![0.125f32],
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
        fn test_enrich_rank_0_tensors_corrupted_with_short_data() {
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
                    tensor_content: to_le_bytes![0.125f32].slice(..2),
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
        fn test_enrich_rank_0_tensors_corrupted_with_long_data() {
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
                    tensor_content: to_le_bytes![0.125, 9.99f32],
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
        fn test_enrich_non_float_rank_0_tensors() {
            let tensors = vec![
                pb::TensorProto {
                    dtype: pb::DataType::DtString.into(),
                    string_val: vec![Bytes::from_static(b"abc")],
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
                    tensor_content: to_le_bytes![123.0f64],
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
            let v = EventValue::GraphDef(GraphDefValue(Bytes::from_static(&[1, 2, 3, 4])));
            assert_eq!(v.into_scalar(), Err(DataLoss));
        }

        #[test]
        fn test_enrich_non_scalar_summary_values() {
            let image_value = Value::Image(pb::summary::Image::default());
            let v = EventValue::Summary(SummaryValue(Box::new(image_value)));
            assert_eq!(v.into_scalar(), Err(DataLoss));
        }
    }

    mod tensors {
        use super::*;

        #[test]
        fn test_metadata_tensor_with_dataclass() {
            let md = blank_with_plugin_content(
                "rando",
                pb::DataClass::Tensor,
                Bytes::from_static(b"preserved!"),
            );
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                string_val: vec![Bytes::from_static(b"foo")],
                ..Default::default()
            })));
            let result = v.initial_metadata(Some(md.as_ref().clone()));
            assert_eq!(*result, *md);
        }

        #[test]
        fn test_metadata_tensor_without_dataclass() {
            for plugin_name in &[
                plugin_names::HISTOGRAMS,
                plugin_names::TEXT,
                plugin_names::PR_CURVES,
                plugin_names::HPARAMS,
                plugin_names::MESH,
                plugin_names::CUSTOM_SCALARS,
            ] {
                let md = blank_with_plugin_content(
                    plugin_name,
                    pb::DataClass::Unknown,
                    Bytes::from_static(b"preserved!"),
                );
                let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                    dtype: pb::DataType::DtString.into(),
                    string_val: vec![Bytes::from_static(b"foo")],
                    ..Default::default()
                })));
                let result = v.initial_metadata(Some(md.as_ref().clone()));
                let expected = pb::SummaryMetadata {
                    data_class: pb::DataClass::Tensor.into(),
                    ..*md
                };
                assert_eq!(*result, expected);
            }
        }

        #[test]
        fn test_enrich_tensor() {
            let tp = pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                string_val: vec![Bytes::from_static(b"foo")],
                ..Default::default()
            };
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(tp.clone()))));
            assert_eq!(
                v.into_tensor(&blank("mytensors", pb::DataClass::Tensor)),
                Ok(tp)
            );
        }

        #[test]
        fn test_enrich_tf1x_histogram() {
            let hp = pb::HistogramProto {
                min: -1.999,
                max: 1.999,
                num: 60.0,
                bucket_limit: vec![-2.0, -1.0, 0.0, 1.0, 2.0, f64::MAX],
                bucket: vec![0.0, 10.0, 20.0, 20.0, 10.0, 0.0],
                ..Default::default()
            };
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Histo(hp))));
            assert_eq!(
                v.into_tensor(&blank("histogram", pb::DataClass::Tensor)),
                Ok(pb::TensorProto {
                    dtype: pb::DataType::DtDouble.into(),
                    tensor_shape: Some(tensor_shape(&[6, 3])),
                    tensor_content: {
                        #[rustfmt::skip]
                        let b = to_le_bytes![
                            -1.999, -2.0, 0.0,
                            -2.0, -1.0, 10.0,
                            -1.0, 0.0, 20.0,
                            0.0, 1.0, 20.0,
                            1.0, 2.0, 10.0,
                            2.0, 1.999, 0.0f64
                        ];
                        b
                    },
                    ..Default::default()
                })
            );
        }

        #[test]
        fn test_enrich_tf1x_histogram_single_bucket() {
            let hp = pb::HistogramProto {
                min: -1.0,
                max: 1.0,
                num: 2.0,
                bucket_limit: vec![f64::MAX],
                bucket: vec![2.0],
                ..Default::default()
            };
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Histo(hp))));
            assert_eq!(
                v.into_tensor(&blank("histogram", pb::DataClass::Tensor)),
                Ok(pb::TensorProto {
                    dtype: pb::DataType::DtDouble.into(),
                    tensor_shape: Some(tensor_shape(&[1, 3])),
                    tensor_content: to_le_bytes![-1.0, 1.0, 2.0f64],
                    ..Default::default()
                })
            );
        }

        #[test]
        fn test_enrich_tf1x_histogram_empty() {
            let hp = pb::HistogramProto::default();
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Histo(hp))));
            assert_eq!(
                v.into_tensor(&blank("histogram", pb::DataClass::Tensor)),
                Ok(pb::TensorProto {
                    dtype: pb::DataType::DtDouble.into(),
                    tensor_shape: Some(tensor_shape(&[0, 3])),
                    ..Default::default()
                })
            );
        }

        #[test]
        fn test_enrich_tf1x_histogram_mismatched_field_lengths() {
            for (limit_len, bucket_len) in &[(0, 1), (1, 0), (1, 2), (2, 1)] {
                let hp = pb::HistogramProto {
                    bucket_limit: vec![0.0; *limit_len],
                    bucket: vec![0.0; *bucket_len],
                    ..Default::default()
                };
                let v = EventValue::Summary(SummaryValue(Box::new(Value::Histo(hp.clone()))));
                assert_eq!(
                    v.into_tensor(&blank("histogram", pb::DataClass::Tensor)),
                    Err(DataLoss),
                    "expected error converting proto {:?}",
                    hp
                );
            }
        }
    }

    mod blob_sequences {
        use super::*;

        #[test]
        fn test_metadata_graph() {
            let md = GraphDefValue::initial_metadata();
            assert_eq!(&md.plugin_data.unwrap().plugin_name, plugin_names::GRAPHS);
            assert_eq!(md.data_class, i32::from(pb::DataClass::BlobSequence));
        }

        #[test]
        fn test_metadata_tagged_run_metadata() {
            let md = TaggedRunMetadataValue::initial_metadata();
            assert_eq!(
                &md.plugin_data.unwrap().plugin_name,
                plugin_names::GRAPH_TAGGED_RUN_METADATA
            );
            assert_eq!(md.data_class, i32::from(pb::DataClass::BlobSequence));
        }

        #[test]
        fn test_metadata_tf1x_image() {
            let v = SummaryValue(Box::new(Value::Image(pb::summary::Image {
                height: 480,
                width: 640,
                colorspace: 3,
                encoded_image_string: Bytes::from_static(b"\x89PNGabc"),
                ..Default::default()
            })));
            let result = v.initial_metadata(None);

            assert_eq!(result.data_class, i32::from(pb::DataClass::BlobSequence));
            let plugin_data = result.plugin_data.unwrap();
            assert_eq!(plugin_data.plugin_name, plugin_names::IMAGES);
            let plugin_content = pb::ImagePluginData::decode(&plugin_data.content[..]).unwrap();
            assert!(plugin_content.converted_to_tensor);
        }

        #[test]
        fn test_metadata_tf2x_image_without_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: plugin_names::IMAGES.to_string(),
                    content: Bytes::from_static(b"preserved!"),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[2])),
                string_val: vec![
                    Bytes::from_static(b"\x89PNGabc"),
                    Bytes::from_static(b"\x89PNGdef"),
                ],
                ..Default::default()
            })));
            let result = v.initial_metadata(Some(md));

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: plugin_names::IMAGES.to_string(),
                        content: Bytes::from_static(b"preserved!"),
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
                encoded_audio_string: Bytes::from_static(b"RIFFabcd"),
                ..Default::default()
            })));
            let result = v.initial_metadata(None);

            assert_eq!(result.data_class, i32::from(pb::DataClass::BlobSequence));
            let plugin_data = result.plugin_data.unwrap();
            assert_eq!(plugin_data.plugin_name, plugin_names::AUDIO);
            let plugin_content = pb::AudioPluginData::decode(&plugin_data.content[..]).unwrap();
            assert!(plugin_content.converted_to_tensor);
        }

        #[test]
        fn test_metadata_tf2x_audio_without_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: plugin_names::AUDIO.to_string(),
                    content: Bytes::from_static(b"preserved!"),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[1, 2])),
                string_val: vec![
                    Bytes::from_static(b"\x89PNGabc"),
                    Bytes::from_static(b"label"),
                ],
                ..Default::default()
            })));
            let result = v.initial_metadata(Some(md));

            assert_eq!(
                *result,
                pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: plugin_names::AUDIO.to_string(),
                        content: Bytes::from_static(b"preserved!"),
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
                plugin_names::GRAPH_RUN_METADATA,
                plugin_names::GRAPH_RUN_METADATA_WITH_GRAPH,
                plugin_names::GRAPH_KERAS_MODEL,
            ] {
                let md = pb::SummaryMetadata {
                    plugin_data: Some(PluginData {
                        plugin_name: plugin_name.to_string(),
                        content: Bytes::from_static(b"1"),
                        ..Default::default()
                    }),
                    ..Default::default()
                };
                let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                    dtype: pb::DataType::DtString.into(),
                    tensor_shape: Some(tensor_shape(&[])),
                    string_val: vec![Bytes::from_static(b"some-graph-proto")],
                    ..Default::default()
                })));

                // Test both metadata and enrichment here, for convenience.
                let initial_metadata = v.initial_metadata(Some(md));
                assert_eq!(
                    *initial_metadata,
                    pb::SummaryMetadata {
                        plugin_data: Some(PluginData {
                            plugin_name: plugin_name.to_string(),
                            content: Bytes::from_static(b"1"),
                            ..Default::default()
                        }),
                        data_class: pb::DataClass::BlobSequence.into(),
                        ..Default::default()
                    },
                );
                let expected_enriched =
                    BlobSequenceValue(vec![Bytes::from_static(b"some-graph-proto")]);
                let actual_enriched = EventValue::Summary(v).into_blob_sequence(&initial_metadata);
                assert_eq!(actual_enriched, Ok(expected_enriched));
            }
        }

        #[test]
        fn test_enrich_graph_def() {
            let raw = Bytes::from_static(&[1, 2, 3, 4]);
            let v = EventValue::GraphDef(GraphDefValue(raw));
            assert_eq!(
                v.into_blob_sequence(GraphDefValue::initial_metadata().as_ref()),
                Ok(BlobSequenceValue(vec![Bytes::from_static(&[1, 2, 3, 4])]))
            );
        }

        #[test]
        fn test_enrich_tagged_run_metadata() {
            let raw = Bytes::from_static(&[1, 2, 3, 4]);
            let v = EventValue::TaggedRunMetadata(TaggedRunMetadataValue(raw));
            assert_eq!(
                v.into_blob_sequence(GraphDefValue::initial_metadata().as_ref()),
                Ok(BlobSequenceValue(vec![Bytes::from_static(&[1, 2, 3, 4])]))
            );
        }

        #[test]
        fn test_enrich_tf1x_image() {
            let v = SummaryValue(Box::new(Value::Image(pb::summary::Image {
                height: 480,
                width: 640,
                colorspace: 3,
                encoded_image_string: Bytes::from_static(b"\x89PNGabc"),
                ..Default::default()
            })));
            let md = v.initial_metadata(None);
            let expected = BlobSequenceValue(vec![
                Bytes::from_static(b"640"),
                Bytes::from_static(b"480"),
                Bytes::from_static(b"\x89PNGabc"),
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
                string_val: vec![Bytes::from_static(b"abc"), Bytes::from_static(b"defghi")],
                ..Default::default()
            }))));
            let expected = BlobSequenceValue(vec![
                Bytes::from_static(b"abc"),
                Bytes::from_static(b"defghi"),
            ]);
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
        fn test_enrich_rank_0_tensor() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[])),
                string_val: vec![Bytes::from_static(b"no scalars for you")],
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
                    Bytes::from_static(b"ab"),
                    Bytes::from_static(b"cd"),
                    Bytes::from_static(b"ef"),
                    Bytes::from_static(b"gh"),
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
                encoded_audio_string: Bytes::from_static(b"RIFFabcd"),
                ..Default::default()
            })));
            let md = v.initial_metadata(None);
            let expected = BlobSequenceValue(vec![Bytes::from_static(b"RIFFabcd")]);
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
                    Bytes::from_static(b"RIFFwav0"),
                    Bytes::from_static(b"RIFFwav1"),
                    Bytes::from_static(b"RIFFwav2"),
                ],
                ..Default::default()
            }))));
            let expected = BlobSequenceValue(vec![
                Bytes::from_static(b"RIFFwav0"),
                Bytes::from_static(b"RIFFwav1"),
                Bytes::from_static(b"RIFFwav2"),
            ]);
            assert_eq!(
                v.into_blob_sequence(&blank(plugin_names::AUDIO, pb::DataClass::BlobSequence)),
                Ok(expected)
            );
        }

        #[test]
        fn test_enrich_audio_with_labels() {
            let v = EventValue::Summary(SummaryValue(Box::new(Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: Some(tensor_shape(&[3, 2])),
                string_val: vec![
                    Bytes::from_static(b"RIFFwav0"),
                    Bytes::from_static(b"label 0"),
                    Bytes::from_static(b"RIFFwav1"),
                    Bytes::from_static(b"label 1"),
                    Bytes::from_static(b"RIFFwav2"),
                    Bytes::from_static(b"label 2"),
                ],
                ..Default::default()
            }))));
            let expected = BlobSequenceValue(vec![
                Bytes::from_static(b"RIFFwav0"),
                Bytes::from_static(b"RIFFwav1"),
                Bytes::from_static(b"RIFFwav2"),
            ]);
            assert_eq!(
                v.into_blob_sequence(&blank(plugin_names::AUDIO, pb::DataClass::BlobSequence)),
                Ok(expected)
            );
        }
    }

    mod unknown {
        use super::*;

        #[test]
        fn test_metadata_custom_plugin_with_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: "myplugin".to_string(),
                    content: Bytes::from_static(b"mycontent"),
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
        fn test_metadata_unknown_plugin_no_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: "myplugin".to_string(),
                    content: Bytes::from_static(b"mycontent"),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto::default())));
            let result = v.initial_metadata(Some(md.clone()));
            assert_eq!(*result, md);
        }

        #[test]
        fn test_metadata_empty() {
            let v = SummaryValue(Box::new(Value::Tensor(pb::TensorProto::default())));
            let result = v.initial_metadata(None);
            assert_eq!(*result, pb::SummaryMetadata::default());
        }
    }
}
