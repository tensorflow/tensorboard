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
from tensorboard.plugins.interactive_inference.utils import inference_utils

        
@widgets.register
class WitWidget(widgets.DOMWidget):
    """WIT widget for Jupyter."""
    _view_name = Unicode('WITView').tag(sync=True)
    _view_module = Unicode('wit-widget').tag(sync=True)
    _view_module_version = Unicode('^0.1.4').tag(sync=True)
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
        self.estimator_and_spec = dict(config.get('estimator_and_spec')) if 'estimator_and_spec' in config else {}
        self.compare_estimator_and_spec = dict(config.get('compare_estimator_and_spec')) if 'compare_estimator_and_spec' in config else {}
        self._set_examples(config['examples'])
        del copied_config['examples']
        if 'estimator_and_spec' in copied_config:
            del copied_config['estimator_and_spec']
            copied_config['inference_address'] = 'estimator'
            copied_config['model_name'] = 'estimator'
        if 'compare_estimator_and_spec' in copied_config:
            del copied_config['compare_estimator_and_spec']
            copied_config['inference_address_2'] = 'estimator'
            copied_config['model_name_2'] = 'estimator'
        self.config = copied_config
    
    def _set_examples(self, examples):
        self.examples = [json_format.MessageToJson(ex) for ex in examples]
        self.updated_example_indices = set(range(len(examples)))
        self._generate_sprite()
    
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
            self.config.get('predict_output_tensor'),
            self.estimator_and_spec.get('estimator'),
            self.estimator_and_spec.get('feature_spec'))
        infer_objs.append(inference_utils.run_inference_for_inference_results(
            examples_to_infer, serving_bundle))
        if 'inference_address_2' in self.config or self.compare_estimator_and_spec.get('estimator'):
            serving_bundle = inference_utils.ServingBundle(
                self.config.get('inference_address_2'),
                self.config.get('model_name_2'),
                self.config.get('model_type'),
                self.config.get('model_version_2'),
                self.config.get('model_signature_2'),
                self.config.get('uses_predict_api'),
                self.config.get('predict_input_tensor'),
                self.config.get('predict_output_tensor'),
                self.compare_estimator_and_spec.get('estimator'),
                self.compare_estimator_and_spec.get('feature_spec'))
            infer_objs.append(inference_utils.run_inference_for_inference_results(
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
            self.config.get('predict_output_tensor'),
            self.estimator_and_spec.get('estimator'),
            self.estimator_and_spec.get('feature_spec'))
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
        self._generate_sprite()
        
    @observe('duplicate_example')
    def _duplicate_example(self, change):
        self.examples.append(self.examples[self.duplicate_example['index']])
        self.updated_example_indices.add(len(self.examples) - 1)
        self._generate_sprite()
        
    @observe('delete_example')
    def _delete_example(self, change):
        self.examples.pop(self.delete_example['index'])
        self._generate_sprite()

    def _generate_sprite(self):
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