# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

import base64
import json
import ipywidgets as widgets
import tensorflow as tf
from ipywidgets import Layout
from google.protobuf import json_format
from traitlets import Dict
from traitlets import Int
from traitlets import List
from traitlets import observe
from traitlets import Unicode
from traitlets import Set
from . import inference_utils

class WitConfigBuilder(object):
    
    def __init__(self, examples):
        self.config = {}
        self.set_examples(examples)
        self.set_model_type('classification')
    
    def build(self):
        return self.config
    
    def store(self, key, value):
        self.config[key] = value
    
    def set_examples(self, examples):
        self.store('examples', examples)
        return self
        
    def set_model_type(self, model):
        self.store('model_type', model)
        return self
    
    def set_inference_address(self, address):
        self.store('inference_address', address)
        return self
        
    def set_model_name(self, name):
        self.store('model_name', name)
        return self
    
    def set_model_version(self, version):
        self.store('model_version', version)
        return self
        
    def set_model_signature(self, signature):
        self.store('model_signature', signature)
        return self
        
    def set_compare_inference_address(self, address):
        self.store('inference_address_2', address)
        return self
        
    def set_compare_model_name(self, name):
        self.store('model_name_2', name)
        return self
    
    def set_compare_model_version(self, version):
        self.store('model_version_2', version)
        return self
        
    def set_compare_model_signature(self, signature):
        self.store('model_signature_2', signature)
        return self
        
    def set_uses_predict_api(self, predict):
        self.store('uses_predict_api', predict)
        return self
        
    def set_are_sequence_examples(self, seq):
        self.store('are_sequence_examples', seq)
        return self
    
    def set_max_classes_to_display(self, max_classes):
        self.store('max_classes', max_classes)
        return self
    
    def set_multi_class(self, multiclass):
        self.store('multiclass', multiclass)
        return self
        
    def set_predict_input_tensor(self, tensor):
        self.store('predict_input_tensor', tensor)
        return self

    def set_predict_output_tensor(self, tensor):
        self.store('predict_output_tensor', tensor)
        return self

    def set_label_vocab_path(self, path):
        self.store('label_vocab_path', path)
        return self

        
@widgets.register
class WitWidget(widgets.DOMWidget):
    """An example widget."""
    _view_name = Unicode('WITView').tag(sync=True)
    _view_module = Unicode('wit-widget').tag(sync=True)
    _view_module_version = Unicode('^0.1.0').tag(sync=True)
    config = Dict(dict()).tag(sync=True)
    examples = List([]).tag(sync=True)
    inferences = Dict(dict()).tag(sync=True)
    infer = Int(0).tag(sync=True)
    update_example = Dict(dict()).tag(sync=True)
    delete_example = Dict(dict()).tag(sync=True)
    duplicate_example = Dict(dict()).tag(sync=True)
    updated_example_indices = Set(set())
    get_eligible_features = Int(0).tag(sync=True)
    eligible_features = List([]).tag(sync=True)
    infer_mutants = Dict(dict()).tag(sync=True)
    mutant_charts = Dict([]).tag(sync=True)
    mutant_charts_counter = Int(0)
    sprite = Unicode('').tag(sync=True)
    
    def __init__(self, config_builder, height=1000):
        super(WitWidget, self).__init__(layout=Layout(height='%ipx' % height))
        config = config_builder.build()
        copied_config = dict(config)
        self.setExamples(config['examples'])
        del copied_config['examples']
        self.config = copied_config
    
    def setExamples(self, examples):
        self.examples = [json_format.MessageToJson(ex) for ex in examples]
        self.updated_example_indices = set(range(len(examples)))
        self.generate_sprite()
    
    def json_to_proto(self, json):
        ex = (tf.train.SequenceExample()
            if self.config.get('are_sequence_examples')
            else tf.train.Example())
        json_format.Parse(json, ex)
        return ex

    @observe('infer')
    def _infer(self, change):
        indices_to_infer = sorted(self.updated_example_indices)
        examples_to_infer = [
            self.json_to_proto(self.examples[index]) for index in indices_to_infer]
        infer_objs = []
        serving_bundle = inference_utils.ServingBundle(
            self.config.get('inference_address'),
            self.config.get('model_name'),
            self.config.get('model_type'),
            self.config.get('model_version'),
            self.config.get('model_signature'),
            self.config.get('uses_predict_api'),
            self.config.get('predict_input_tensor'),
            self.config.get('predict_output_tensor'))
        infer_objs.append(inference_utils.call_servo_for_inference_results(
            examples_to_infer, serving_bundle))
        if 'inference_address_2' in self.config:
            serving_bundle = inference_utils.ServingBundle(
                self.config.get('inference_address_2'),
                self.config.get('model_name_2'),
                self.config.get('model_type'),
                self.config.get('model_version_2'),
                self.config.get('model_signature_2'),
                self.config.get('uses_predict_api'),
                self.config.get('predict_input_tensor'),
                self.config.get('predict_output_tensor'))
            infer_objs.append(inference_utils.call_servo_for_inference_results(
                examples_to_infer, serving_bundle))
        self.updated_example_indices = set()
        self.inferences = {
            'inferences': {'indices': indices_to_infer, 'results': infer_objs},
            'label_vocab': inference_utils.get_label_vocab(
                self.config.get('label_vocab_path'))}
    
    @observe('get_eligible_features')
    def _get_eligible_features(self, change):
        examples = [self.json_to_proto(ex) for ex in self.examples[0:50]]
        features_list = inference_utils.get_eligible_features(
          examples, 10)
        self.eligible_features = features_list
    
    @observe('infer_mutants')
    def _infer_mutants(self, change):
        info = self.infer_mutants
        example_index = int(info['example_index'])
        feature_name = info['feature_name']
        examples = (self.examples if example_index == -1
                    else [self.examples[example_index]])
        examples = [self.json_to_proto(ex) for ex in examples]
        scan_examples = [self.json_to_proto(ex) for ex in self.examples[0:50]]
        serving_bundle = inference_utils.ServingBundle(
            self.config.get('inference_address'),
            self.config.get('model_name'),
            self.config.get('model_type'),
            self.config.get('model_version'),
            self.config.get('model_signature'),
            self.config.get('uses_predict_api'),
            self.config.get('predict_input_tensor'),
            self.config.get('predict_output_tensor'))
        viz_params = inference_utils.VizParams(
          info['x_min'], info['x_max'],
          scan_examples, 10,
          info['feature_index_pattern'])
        json_mapping = inference_utils.mutant_charts_for_feature(
          examples, feature_name, serving_bundle, viz_params)
        json_mapping['counter'] = self.mutant_charts_counter
        self.mutant_charts_counter += 1
        self.mutant_charts = json_mapping
        
    @observe('update_example')
    def _update_example(self, change):
        index = self.update_example['index']
        self.updated_example_indices.add(index)
        self.examples[index] = self.update_example['example']
        self.generate_sprite()
        
    @observe('duplicate_example')
    def _duplicate_example(self, change):
        self.examples.append(self.examples[self.duplicate_example['index']])
        self.updated_example_indices.add(len(self.examples) - 1)
        self.generate_sprite()
        
    @observe('delete_example')
    def _delete_example(self, change):
        self.examples.pop(self.delete_example['index'])
        self.generate_sprite()

    def generate_sprite(self):
        # Generate a sprite image for the examples if the examples contain the
        # standard encoded image feature.
        if not self.examples:
            return
        example_to_check = self.json_to_proto(self.examples[0])
        feature_list = (example_to_check.context.feature
          if self.config.get('are_sequence_examples')
          else example_to_check.features.feature)
        if 'image/encoded' in feature_list:
            example_strings = [
                self.json_to_proto(ex).SerializeToString()
                for ex in self.examples]
            encoded = base64.b64encode(
                inference_utils.create_sprite_image(example_strings))
            self.sprite = 'data:image/png;base64,{}'.format(encoded)