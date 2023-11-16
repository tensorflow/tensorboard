# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Tests for Keras Utility."""


import json

import tensorflow as tf

from tensorboard.plugins.graph import keras_util

# Stay on Keras 2 for now: https://github.com/keras-team/keras/issues/18467.
version_fn = getattr(tf.keras, "version", None)
if version_fn and version_fn().startswith("3."):
    import tf_keras as keras  # Keras 2
else:
    keras = tf.keras  # Keras 2


class KerasUtilTest(tf.test.TestCase):
    def assertGraphDefToModel(self, expected_proto, model):
        model_config = json.loads(model.to_json())

        self.assertProtoEquals(
            expected_proto, keras_util.keras_model_to_graph_def(model_config)
        )

    def DISABLED_test_keras_model_to_graph_def_sequential_model(self):
        expected_proto = """
            node {
              name: "sequential/dense_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "sequential/dense"
              input: "sequential/dense_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "sequential/my_relu"
              input: "sequential/dense"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Activation"
                }
              }
            }
            node {
              name: "sequential/dense_1"
              input: "sequential/my_relu"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "sequential/activation"
              input: "sequential/dense_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Activation"
                }
              }
            }
        """
        model = keras.models.Sequential(
            [
                keras.layers.Dense(32, input_shape=(784,)),
                keras.layers.Activation("relu", name="my_relu"),
                keras.layers.Dense(10),
                keras.layers.Activation("softmax"),
            ]
        )
        self.assertGraphDefToModel(expected_proto, model)

    def test_keras_model_to_graph_def_functional_model(self):
        expected_proto = """
            node {
              name: "model/functional_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model/dense"
              input: "model/functional_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model/dense_1"
              input: "model/dense"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model/dense_2"
              input: "model/dense_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
        """
        inputs = keras.layers.Input(shape=(784,), name="functional_input")
        d0 = keras.layers.Dense(64, activation="relu")
        d1 = keras.layers.Dense(64, activation="relu")
        d2 = keras.layers.Dense(64, activation="relu")

        model = keras.models.Model(
            inputs=inputs, outputs=d2(d1(d0(inputs))), name="model"
        )
        self.assertGraphDefToModel(expected_proto, model)

    def test_keras_model_to_graph_def_functional_model_with_cycle(self):
        expected_proto = """
            node {
              name: "model/cycle_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model/dense"
              input: "model/cycle_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model/dense_1"
              input: "model/dense"
              input: "model/dense_2"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model/dense_2"
              input: "model/dense_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
        """
        inputs = keras.layers.Input(shape=(784,), name="cycle_input")
        d0 = keras.layers.Dense(64, activation="relu")
        d1 = keras.layers.Dense(64, activation="relu")
        d2 = keras.layers.Dense(64, activation="relu")

        model = keras.models.Model(
            inputs=inputs, outputs=d1(d2(d1(d0(inputs)))), name="model"
        )
        self.assertGraphDefToModel(expected_proto, model)

    def test_keras_model_to_graph_def_lstm_model(self):
        expected_proto = """
            node {
              name: "model/lstm_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model/simple_rnn"
              input: "model/lstm_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "SimpleRNN"
                }
              }
            }
        """
        inputs = keras.layers.Input(shape=(None, 5), name="lstm_input")
        encoder = keras.layers.SimpleRNN(256)

        model = keras.models.Model(
            inputs=inputs, outputs=encoder(inputs), name="model"
        )
        self.assertGraphDefToModel(expected_proto, model)

    def DISABLED_test_keras_model_to_graph_def_nested_sequential_model(self):
        expected_proto = """
            node {
              name: "sequential_2/sequential_1_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "sequential_2/sequential_1/sequential_input"
              input: "sequential_2/sequential_1_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "sequential_2/sequential_1/sequential/dense_input"
              input: "sequential_2/sequential_1/sequential_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "sequential_2/sequential_1/sequential/dense"
              input: "sequential_2/sequential_1/sequential/dense_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "sequential_2/sequential_1/sequential/activation"
              input: "sequential_2/sequential_1/sequential/dense"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Activation"
                }
              }
            }
            node {
              name: "sequential_2/sequential_1/my_relu"
              input: "sequential_2/sequential_1/sequential/activation"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Activation"
                }
              }
            }
            node {
              name: "sequential_2/dense_1"
              input: "sequential_2/sequential_1/my_relu"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "sequential_2/activation_1"
              input: "sequential_2/dense_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Activation"
                }
              }
            }
        """
        sub_sub_model = keras.models.Sequential(
            [
                keras.layers.Dense(32, input_shape=(784,)),
                keras.layers.Activation("relu"),
            ]
        )

        sub_model = keras.models.Sequential(
            [
                sub_sub_model,
                keras.layers.Activation("relu", name="my_relu"),
            ]
        )

        model = keras.models.Sequential(
            [
                sub_model,
                keras.layers.Dense(10),
                keras.layers.Activation("softmax"),
            ]
        )

        self.assertGraphDefToModel(expected_proto, model)

    def test_keras_model_to_graph_def_functional_multi_inputs(self):
        expected_proto = """
            node {
              name: "model/main_input"
              attr {
                key: "dtype"
                value {
                  type: DT_INT32
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model/embedding"
              input: "model/main_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Embedding"
                }
              }
            }
            node {
              name: "model/simple_rnn"
              input: "model/embedding"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "SimpleRNN"
                }
              }
            }
            node {
              name: "model/aux_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model/concatenate"
              input: "model/simple_rnn"
              input: "model/aux_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Concatenate"
                }
              }
            }
            node {
              name: "model/dense"
              input: "model/concatenate"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model/main_output"
              input: "model/dense"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model/aux_output"
              input: "model/simple_rnn"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
        """
        main_input = keras.layers.Input(
            shape=(100,), dtype="int32", name="main_input"
        )
        x = keras.layers.Embedding(
            output_dim=512, input_dim=10000, input_length=100
        )(main_input)
        rnn_out = keras.layers.SimpleRNN(32)(x)

        auxiliary_output = keras.layers.Dense(
            1, activation="sigmoid", name="aux_output"
        )(rnn_out)
        auxiliary_input = keras.layers.Input(shape=(5,), name="aux_input")

        x = keras.layers.concatenate([rnn_out, auxiliary_input])
        x = keras.layers.Dense(64, activation="relu")(x)

        main_output = keras.layers.Dense(
            1, activation="sigmoid", name="main_output"
        )(x)

        model = keras.models.Model(
            inputs=[main_input, auxiliary_input],
            outputs=[main_output, auxiliary_output],
            name="model",
        )

        self.assertGraphDefToModel(expected_proto, model)

    def test_keras_model_to_graph_def_functional_model_as_layer(self):
        expected_proto = """
            node {
              name: "model_1/sub_func_input_2"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model_1/sub_func_input_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
            name: "model_1/model/sub_func_input_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model_1/model/sub_func_input_2"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model_1/model/dense"
              input: "model_1/model/sub_func_input_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model_1/model/dense_1"
              input: "model_1/model/sub_func_input_2"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model_1/concatenate"
              input: "model_1/model/dense"
              input: "model_1/model/dense_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Concatenate"
                }
              }
            }
            node {
              name: "model_1/dense_2"
              input: "model_1/concatenate"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
        """
        inputs1 = keras.layers.Input(shape=(784,), name="sub_func_input_1")
        inputs2 = keras.layers.Input(shape=(784,), name="sub_func_input_2")
        d0 = keras.layers.Dense(64, activation="relu")
        d1 = keras.layers.Dense(64, activation="relu")
        d2 = keras.layers.Dense(64, activation="relu")

        sub_model = keras.models.Model(
            inputs=[inputs2, inputs1],
            outputs=[d0(inputs1), d1(inputs2)],
            name="model",
        )

        main_outputs = d2(
            keras.layers.concatenate(sub_model([inputs2, inputs1]))
        )
        model = keras.models.Model(
            inputs=[inputs2, inputs1],
            outputs=main_outputs,
            name="model_1",
        )

        self.assertGraphDefToModel(expected_proto, model)

    def DISABLED_test_keras_model_to_graph_def_functional_sequential_model(
        self,
    ):
        expected_proto = """
            node {
              name: "model/func_seq_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model/sequential/dense_input"
              input: "model/func_seq_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "model/sequential/dense"
              input: "model/sequential/dense_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "model/sequential/my_relu"
              input: "model/sequential/dense"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Activation"
                }
              }
            }
            node {
              name: "model/dense_1"
              input: "model/sequential/my_relu"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
        """
        inputs = keras.layers.Input(shape=(784,), name="func_seq_input")
        sub_model = keras.models.Sequential(
            [
                keras.layers.Dense(32, input_shape=(784,)),
                keras.layers.Activation("relu", name="my_relu"),
            ]
        )
        dense = keras.layers.Dense(64, activation="relu")

        model = keras.models.Model(
            inputs=inputs, outputs=dense(sub_model(inputs))
        )

        self.assertGraphDefToModel(expected_proto, model)

    def DISABLED_test_keras_model_to_graph_def_sequential_functional_model(
        self,
    ):
        expected_proto = """
            node {
              name: "sequential/model_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "sequential/model/func_seq_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
            }
            node {
              name: "sequential/model/dense"
              input: "sequential/model/func_seq_input"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "sequential/dense_1"
              input: "sequential/model/dense"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Dense"
                }
              }
            }
            node {
              name: "sequential/my_relu"
              input: "sequential/dense_1"
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
              attr {
                key: "keras_class"
                value {
                  s: "Activation"
                }
              }
            }
        """
        inputs = keras.layers.Input(shape=(784,), name="func_seq_input")
        dense = keras.layers.Dense(64, activation="relu")

        sub_model = keras.models.Model(inputs=inputs, outputs=dense(inputs))
        model = keras.models.Sequential(
            [
                sub_model,
                keras.layers.Dense(32, input_shape=(784,)),
                keras.layers.Activation("relu", name="my_relu"),
            ]
        )

        self.assertGraphDefToModel(expected_proto, model)

    def test_keras_model_to_graph_def_functional_multiple_inbound_nodes_from_same_node(
        self,
    ):
        expected_proto = """
            node {
              name: "model/input_1"
              attr {
                key: "keras_class"
                value {
                  s: "InputLayer"
                }
              }
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
            }
            node {
              name: "model/private__doubling_layer"
              input: "model/input_1"
              attr {
                key: "keras_class"
                value {
                  s: "_DoublingLayer"
                }
              }
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
            }
            node {
              name: "model/add"
              input: "model/private__doubling_layer"
              input: "model/private__doubling_layer"
              attr {
                key: "keras_class"
                value {
                  s: "Add"
                }
              }
              attr {
                key: "dtype"
                value {
                  type: DT_FLOAT
                }
              }
            }
        """
        inputs = keras.Input(shape=(2,))
        doubling_layer = _DoublingLayer()
        reducing_layer = keras.layers.Add()
        outputs = reducing_layer(doubling_layer(inputs))
        model = keras.Model(inputs=[inputs], outputs=outputs)

        self.assertGraphDefToModel(expected_proto, model)


class _DoublingLayer(keras.layers.Layer):
    def call(self, inputs):
        return inputs, inputs


if __name__ == "__main__":
    tf.test.main()
