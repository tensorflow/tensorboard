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
"""Utilities for handling Keras model in graph plugin.

Two canonical types of Keras model are Functional and Sequential.
A model can be serialized as JSON and deserialized to reconstruct a model.
This utility helps with dealing with the serialized Keras model.

They have distinct structures to the configurations in shapes below:
Functional:
  config
    name: Name of the model. If not specified, it is 'model' with
          an optional suffix if there are more than one instance.
    input_layers: Keras.layers.Inputs in the model.
    output_layers: Layer names that are outputs of the model.
    layers: list of layer configurations.
      layer: [*]
        inbound_nodes: inputs to this layer.

Sequential:
  config
    name: Name of the model. If not specified, it is 'sequential' with
          an optional suffix if there are more than one instance.
    layers: list of layer configurations.
      layer: [*]

[*]: Note that a model can be a layer.
Please refer to https://github.com/tensorflow/tfjs-layers/blob/master/src/keras_format/model_serialization.ts
for more complete definition.
"""
import collections
import six

from tensorboard.compat.proto.graph_pb2 import GraphDef
from tensorboard.compat.tensorflow_stub import dtypes


# Please refer to below link for more information.
# https://github.com/tensorflow/tensorflow/blob/1020739e1724346ef0088186f0253defaad3edb6/tensorflow/python/keras/engine/network.py#L1079-L1090
InboundNodes = collections.namedtuple(
    'InboundNodes', ['inbound_layer', 'node_index', 'tensor_id', 'kwargs'])

# Please refer to below link for more information.
# https://github.com/tensorflow/tensorflow/blob/1020739e1724346ef0088186f0253defaad3edb6/tensorflow/python/keras/utils/tf_utils.py#L238
NodeData = collections.namedtuple(
    'NodeData', ['layer_name', 'node_id', 'tensor_id'])

ModelMetadata = collections.namedtuple(
    'ModelMeta',
    (
        'input_to_in_layer', # dict, a special mapping for a layer name to its
                             # input.
        'model_name_to_outputs', # dict, a map of model name to output layers
                                 # of the model.
    ))

def _walk_layers(keras_layer):
  """Walks the nested keras layer configuration in preorder.
  Args:
    keras_layer: Keras configuration from model.to_json.

  Yields:
    A tuple of (name_scope, layer_config).
    name_scope: a string representing a scope name, similar to that of
        tf.name_scope.
    layer_config: a dict representing a Keras layer configuration.
  """
  yield ('', keras_layer)
  if keras_layer.get('config').get('layers'):
    name_scope = keras_layer.get('config').get('name')
    for layer in keras_layer.get('config').get('layers'):
      for (sub_name_scope, sublayer) in _walk_layers(layer):
        sub_name_scope = '%s/%s' % (
            name_scope, sub_name_scope) if sub_name_scope else name_scope
        yield (sub_name_scope, sublayer)


def _scoped_name(name_scope, node_name):
  """Returns scoped name for a node as a string in the form '<scope>/<node name>'.

  Args:
    name_scope: a string representing a scope name, similar to that of tf.name_scope.
    node_name: a string representing the current node name.

  Returns
    A string representing a scoped name.
  """
  if name_scope:
    return '%s/%s' % (name_scope, node_name)
  return node_name


def _is_model(layer):
  """Returns True if layer is a model.

  Args:
    layer: a dict representing a Keras model configuration.

  Returns:
    bool: True if layer is a model.
  """
  return layer.get('config').get('layers') is not None


def _get_inbound_nodes(inbound_nodes):
  """Return normalized list of InboundNodes from `inbound_nodes` of Keras model.

  Keras model serialization records input to a layer in a property,
  `inbound_nodes`, and it can be of below forms:
  - [['name_1', 1, 0], ['name_2', 1, 1]]: two invocations witn single input.
  - [
      [['name_1', 0, 0], ['name_2', 1, 0]],
      [['name_3', 0, 0], ['name_4', 1, 0]]]: two invocations with multiple
    inputs. Multiple inputs are only applicable to limited keras layers like
    keras.layers.add, keras.layers.concat, and etc...

  Note that there cannot be fixture of types as a layer that takes multiple
  inputs have precondition on size of the input.

  Args:
    inbound_nodes: Value of `inbound_nodes` of a Keras model serialization.

  Raises:
    ValueError: when the `inbound_nodes` violate our assumption that a layer
        not being able to take multiple forms of input.

  Returns:
    List of invocations that has a list of inputs.
  """
  inbound_nodes = inbound_nodes if inbound_nodes else []

  is_single_input_mode = isinstance(
      inbound_nodes[0][0], six.string_types) if inbound_nodes else False
  invocations = []
  for inbound_node in inbound_nodes:
    if (is_single_input_mode and not
        isinstance(inbound_node[0], six.string_types)):
      raise ValueError('Expected all inbound nodes to have the same type')

    if is_single_input_mode:
      invocations.append([inbound_node])
    else:
      invocations.append(inbound_node)

  normalized_inbound_nodes = []
  for invocation in invocations:
    inbound_invocation = []
    for input_layer in invocation:
      inbound_invocation.append(
          InboundNodes(
              inbound_layer=input_layer[0],
              node_index=input_layer[1],
              tensor_id=input_layer[2],
              kwargs=input_layer[3]))
    normalized_inbound_nodes.append(inbound_invocation)
  return normalized_inbound_nodes


def _get_node_data(node_data):
  """Return normalized list of NodeData.

  A model configuration has fields 'input_layers' and 'output_layers' which can
  be of below forms:
  - ['in_layer_name', 0, 0]
  - [['in_layer_is_model', 1, 0], ['in_layer_is_model', 1, 1]]

  Args:
    node_data: Value from 'input_layers' or 'output_layers' from Keras model
        configuraiton.

  Returns:
    A list of NodeData.
  """
  normalized_list = ([node_data] if isinstance(node_data[0], six.string_types)
                     else node_data)

  node_data = []
  for node in normalized_list:
    node_data.append(NodeData(layer_name=node[0],
                              node_id=node[1],
                              tensor_id=node[2]))
  return node_data


def _normalize_sequential_models(keras_model):
  """Populate missing fields in Keras Sequential model.

  Keras Functional model explicitly encodes input and output layers of a model
  and it populates `inbound_nodes` to every layers in it. On contrary, a
  Sequential model has implicit input and output layers (the first and the last
  layer, respectively) and order of layers implicitly encodes `inbound_nodes`
  information.

  For ease of GraphDef construction, we normalize Sequential models to be
  complete by populating the implicit fields.

  WARNING: this method has side-effects and modifies the input, `keras_model`.

  Args:
    keras_model:  A dict from Keras model.to_json().
  """
  assert _is_model(keras_model), 'Expected a layer to be a model.'

  layer_config = keras_model.get('config')
  input_layers = layer_config.get('input_layers')
  output_layers = layer_config.get('output_layers')
  is_functional_model = bool(input_layers and output_layers)
  model_layers = layer_config.get('layers')

  if not is_functional_model:
    first_layer = model_layers[0]
    last_layer = model_layers[-1]
    layer_config['input_layers'] = [
        first_layer.get('config').get('name'), 0, 0]
    layer_config['output_layers'] = [
        last_layer.get('config').get('name'), 0, 0]

    prev_node_name = None
    for layer in model_layers:
      if prev_node_name:
        layer['inbound_nodes'] = [[prev_node_name, 0, 0, {}]]

      node_name = layer.get('config').get('name')
      prev_node_name = node_name

  for layer in model_layers:
    if _is_model(layer):
      _normalize_sequential_models(layer)


def _build_metadata(keras_model):
  """Build metadata about a Keras model useful for creating a GraphDef.

  Args:
    keras_layer: A dict from Keras model.to_json().

  Returns:
    A ModelMetadata
  """
  input_to_in_layer = {}
  model_name_to_outputs = {}

  for (name_scope, layer) in _walk_layers(keras_model):
    is_model = _is_model(layer)
    layer_config = layer.get('config')
    node_name = _scoped_name(name_scope, layer_config.get('name'))
    inbound_nodes = _get_inbound_nodes(layer.get('inbound_nodes'))

    if is_model:
      input_layers = layer_config.get('input_layers')
      output_layers = _get_node_data(layer_config.get('output_layers'))

      if input_layers and inbound_nodes:
        assert len(inbound_nodes) == 1, (
            'Keras converter does not support multi-inputs to a input layer')
        for (input_layer, inbound_node) in zip(input_layers, inbound_nodes[0]):
          input_layer_name = _scoped_name(node_name, input_layer)
          inbound_node_name = _scoped_name(
              name_scope, inbound_node.inbound_layer)
          input_to_in_layer[input_layer_name] = inbound_node_name

      layer_names = [_scoped_name(node_name, layer.layer_name) for layer
                     in output_layers]
      model_name_to_outputs[node_name] = layer_names

  return ModelMetadata(input_to_in_layer, model_name_to_outputs)


def keras_model_to_graph_def(keras_layer):
  """Returns a GraphDef representation of the Keras model in a dict form.

  Note that it only supports models that implemented to_json().

  Args:
    keras_layer: A dict from Keras model.to_json().

  Returns:
    A GraphDef representation of the layers in the model.
  """
  _normalize_sequential_models(keras_layer)
  metadata = _build_metadata(keras_layer)

  g = GraphDef()

  for (name_scope, layer) in _walk_layers(keras_layer):
    if _is_model(layer):
      continue

    layer_config = layer.get('config')
    node_name = _scoped_name(name_scope, layer_config.get('name'))

    node_def = g.node.add()
    node_def.name = node_name

    if layer.get('class_name') is not None:
      keras_cls_name = layer.get('class_name').encode('ascii')
      node_def.attr['keras_class'].s = keras_cls_name

    if layer_config.get('dtype') is not None:
      tf_dtype = dtypes.as_dtype(layer_config.get('dtype'))
      node_def.attr['dtype'].type = tf_dtype.as_datatype_enum

    for inbound_inputs in _get_inbound_nodes(layer.get('inbound_nodes')):
      for inbound_node in inbound_inputs:
        inbound_name = _scoped_name(name_scope, inbound_node.inbound_layer)
        # An input to a layer can be output from a model. In that case, the name
        # of inbound_nodes to a layer is a name of a model. Remap the name of
        # the model to output layer of the model. Also, since there can be
        # multiple outputs in a model, make sure we pick the right output_layer
        # from the model.
        inbound_node_names = metadata.model_name_to_outputs.get(
            inbound_name, [inbound_name])
        node_def.input.append(inbound_node_names[inbound_node.tensor_id])

    if node_name in metadata.input_to_in_layer:
      node_def.input.append(metadata.input_to_in_layer.get(node_name))

  return g
