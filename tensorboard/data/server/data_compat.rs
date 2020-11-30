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

use crate::commit::{DataLoss, ScalarValue};
use crate::proto::tensorboard as pb;
use pb::summary_metadata::PluginData;

pub(crate) const SCALARS_PLUGIN_NAME: &str = "scalars";
pub(crate) const GRAPHS_PLUGIN_NAME: &str = "graphs";

/// The inner contents of a single value from an event.
///
/// This does not include associated step, wall time, tag, or summary metadata information. Step
/// and wall time are available on every event and just not tracked here. Tag and summary metadata
/// information are materialized on `Event`s whose `oneof what` is `summary`, but implicit for
/// graph defs. See [`GraphDefValue::initial_metadata`] and [`SummaryValue::initial_metadata`] for
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
    Summary(SummaryValue),
}

impl EventValue {
    /// Consumes this event value and enriches it into a scalar.
    ///
    /// This supports `simple_value` (TF 1.x) summaries as well as rank-0 tensors of type
    /// `DT_FLOAT`. Returns `DataLoss` if the value is a `GraphDef`, is an unsupported summary, or
    /// is a tensor of the wrong rank.
    pub fn into_scalar(self) -> Result<ScalarValue, DataLoss> {
        let value_box = match self {
            EventValue::GraphDef(_) => return Err(DataLoss),
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

/// A value from an `Event` whose `graph_def` field is set.
///
/// This contains the raw bytes of a serialized `GraphDef` proto. It implies a fixed tag name and
/// plugin metadata, but these are not materialized.
pub struct GraphDefValue(pub Vec<u8>);

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
    /// Determines the metadata for a time series whose first event is a
    /// [`GraphDef`][`EventValue::GraphDef`].
    pub fn initial_metadata() -> Box<pb::SummaryMetadata> {
        blank(GRAPHS_PLUGIN_NAME, pb::DataClass::BlobSequence)
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
            (Some(mut md), _) => {
                // Use given metadata, but first set data class based on plugin name, if known.
                #[allow(clippy::single_match)] // will have more patterns later
                match md.plugin_data.as_ref().map(|pd| pd.plugin_name.as_str()) {
                    Some(SCALARS_PLUGIN_NAME) => {
                        md.data_class = pb::DataClass::Scalar.into();
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

    mod graphs {
        use super::*;

        #[test]
        fn test() {
            let md = GraphDefValue::initial_metadata();
            assert_eq!(&md.plugin_data.unwrap().plugin_name, GRAPHS_PLUGIN_NAME);
            assert_eq!(md.data_class, pb::DataClass::BlobSequence.into());
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
