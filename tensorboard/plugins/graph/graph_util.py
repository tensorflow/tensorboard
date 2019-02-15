# -*- coding: utf-8 -*-
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
"""Utilities for graph plugin."""
from tensorboard.compat.proto.graph_pb2 import GraphDef
from tensorboard.compat.tensorflow_stub import dtypes


def keras_model_to_graph_def(keras_layer):
  """Returns GraphDef representation of the model.

  Note that it only supports models that implemented get_config().

  Args:
    keras_layer: A dict from Keras model.to_json()

  Returns:
    A GraphDef representation of layers.
  """

  def get_layers(keras_layer):
    yield ('', keras_layer)
    if keras_layer.get('config').get('layers'):
      name_scope = keras_layer.get('config').get('name')
      for layer in keras_layer.get('config').get('layers'):
        for (sub_name_scope, sublayer) in get_layers(layer):
          sub_name_scope = '%s/%s' % (
              name_scope, sub_name_scope) if sub_name_scope else name_scope
          yield (sub_name_scope, sublayer)

  def scoped_name(name_scope, node_name):
    if name_scope:
      return '%s/%s' % (name_scope, node_name)
    return node_name

  model_inputs_to_layer = {}
  model_name_to_output_layer = {}
  g = GraphDef()

  # Sequential model layers do not have "inbound_nodes".
  # Must assume all nodes are connected linearly.
  prev_node_name = None
  for (name_scope, layer) in get_layers(keras_layer):
    layer_config = layer.get('config')
    node_name = scoped_name(name_scope, layer_config.get('name'))

    if layer_config.get('layers'):
      # Do not add models to GraphDef. Store information for models.
      input_layers = layer_config.get('input_layers')
      inbound_nodes = layer.get('inbound_nodes')
      if input_layers and inbound_nodes:
        # Parent is Functional and current model is Functional.
        for (input_layer, inbound_node) in zip(input_layers, inbound_nodes):
          input_layer_name = scoped_name(node_name, input_layer)
          inbound_node_name = scoped_name(name_scope, inbound_node[0])
          model_inputs_to_layer[input_layer_name] = inbound_node_name
      elif inbound_nodes:
        # Parent is Functional but current model is Sequential.
        # Sequential model can take only one input. Make sure inbound to the
        # model is linked to the first layer in the Sequential model.
        prev_node_name = scoped_name(name_scope, inbound_nodes[0][0])
      elif input_layers and prev_node_name:
        # Parent is Sequential but current model is Functional.
        for input_layer in input_layers:
          input_layer_name = scoped_name(node_name, input_layer)
          model_inputs_to_layer[input_layer_name] = prev_node_name

      # Unlike the name, there is only one item in the output_layers.
      if layer_config.get('output_layers'):
        maybe_layers = layer_config.get('output_layers')
        # Normalizae output_layers.
        # - single output: an array of values
        # - multi outputs: an array of arrays of values
        layers = maybe_layers if isinstance(
            maybe_layers[0], (list,)) else [maybe_layers]
        layer_names = [scoped_name(node_name, layer[0]) for layer in layers]
        model_name_to_output_layer[node_name] = layer_names
      else:
        last_layer = layer_config.get('layers')[-1]
        last_layer_name = last_layer.get('config').get('name')
        output_node = scoped_name(node_name, last_layer_name)
        model_name_to_output_layer[node_name] = [output_node]

      continue

    node_def = g.node.add()
    node_def.name = node_name

    if layer.get('class_name') is not None:
      keras_cls_name = layer.get('class_name').encode('ascii')
      node_def.attr['keras_class'].s = keras_cls_name

    if layer_config.get('dtype') is not None:
      tf_dtype = dtypes.as_dtype(layer_config.get('dtype'))
      node_def.attr['dtype'].type = tf_dtype.as_datatype_enum

    # functional configs have inbound_nodes
    if layer.get('inbound_nodes') is not None:
      for maybe_inbound_node in layer.get('inbound_nodes'):
        # Normalizae inbound_nodes. It can be an array of values or an array of
        # arrays of values. e.g., it can be:
        # - [['in_layer_name', 0, 0, {}]]
        # - [[['in_layer_is_model', 1, 0, {}], ['in_layer_is_model', 1, 1, {}]]]
        inbound_nodes = maybe_inbound_node if isinstance(
            maybe_inbound_node[0], (list,)) else [maybe_inbound_node]

        for [name, size, ind, _] in inbound_nodes:
          inbound_name = scoped_name(name_scope, name)
          # An input to a layer can be output from a model. In that case, the name
          # of inbound_nodes to a layer is a name of a model. Remap the name of the
          # model to output layer of the model. Also, since there can be multiple
          # outputs in a model, make sure we pick the right output_layer from the model.
          inbound_node_names = model_name_to_output_layer.get(
              inbound_name, [inbound_name])
          node_def.input.append(inbound_node_names[ind])
    elif prev_node_name is not None:
      node_def.input.append(prev_node_name)

    if node_name in model_inputs_to_layer:
      node_def.input.append(model_inputs_to_layer.get(node_name))

    prev_node_name = node_def.name

  return g
