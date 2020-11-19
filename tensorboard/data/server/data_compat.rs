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

use crate::proto::tensorboard as pb;
use pb::{summary::value::Value, summary_metadata::PluginData};

pub(crate) const SCALARS_PLUGIN_NAME: &str = "scalars";

/// Determines the metadata for a time series given its first event.
///
/// This fills in the plugin name and/or data class for legacy summaries for which those values are
/// implied but not explicitly set. You should only need to call this function on the first event
/// from each time series; doing so for subsequent events would be wasteful.
///
/// Rules, in order of decreasing precedence:
///
///   - If the initial metadata has a data class, it is taken as authoritative and returned
///     verbatim.
///   - If the summary value is of primitive type, an appropriate plugin metadata value is
///     synthesized: e.g. a `simple_value` becomes metadata for the scalars plugin. Any existing
///     metadata is ignored.
///   - If the metadata has a known plugin name, the appropriate data class is added: e.g., a
///     `"scalars"` metadata gets `DataClass::Scalar`.
///   - Otherwise, the metadata is returned as is (or an empty metadata value synthesized if the
///     given option was empty).
pub fn initial_metadata(
    md: Option<pb::SummaryMetadata>,
    value: &Value,
) -> Box<pb::SummaryMetadata> {
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

    match (md, value) {
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

#[cfg(test)]
mod tests {
    use super::*;

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
        fn test_tf1x_simple_value() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: "ignored_plugin".to_string(),
                    content: b"ignored_content".to_vec(),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = Value::SimpleValue(0.125);
            let result = initial_metadata(Some(md), &v);

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
        fn test_tf2x_scalar_tensor_without_dataclass() {
            let md = pb::SummaryMetadata {
                plugin_data: Some(PluginData {
                    plugin_name: SCALARS_PLUGIN_NAME.to_string(),
                    content: b"preserved!".to_vec(),
                    ..Default::default()
                }),
                ..Default::default()
            };
            let v = Value::Tensor(pb::TensorProto {
                dtype: pb::DataType::DtFloat.into(),
                tensor_shape: Some(tensor_shape(&[])),
                float_val: vec![0.125],
                ..Default::default()
            });
            let result = initial_metadata(Some(md), &v);

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
            let v = Value::SimpleValue(0.125);
            let expected = md.clone();
            let result = initial_metadata(Some(md), &v);

            assert_eq!(*result, expected);
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
            let v = Value::Tensor(pb::TensorProto::default());
            let expected = md.clone();
            let result = initial_metadata(Some(md), &v);

            assert_eq!(*result, expected);
        }

        #[test]
        fn test_empty() {
            let v = Value::Tensor(pb::TensorProto::default());
            let result = initial_metadata(None, &v);
            assert_eq!(*result, pb::SummaryMetadata::default());
        }
    }
}
