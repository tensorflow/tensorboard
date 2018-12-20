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
import tensorflow as tf
from IPython import display
from google.colab import output
from google.protobuf import json_format
from tensorboard.plugins.interactive_inference.utils import inference_utils

# Python functions for requests from javascript.
def infer_examples():
  WitWidget.widget.infer()
output.register_callback('notebook.InferExamples', infer_examples)

def delete_example(index):
  WitWidget.widget.delete_example(index)
output.register_callback('notebook.DeleteExample', delete_example)

def duplicate_example(index):
  WitWidget.widget.duplicate_example(index)
output.register_callback('notebook.DuplicateExample', duplicate_example)

def update_example(index, example):
  WitWidget.widget.update_example(index, example)
output.register_callback('notebook.UpdateExample', update_example)

def get_eligible_features():
  WitWidget.widget.get_eligible_features()
output.register_callback('notebook.GetEligibleFeatures', get_eligible_features)

def infer_mutants(details):
  WitWidget.widget.infer_mutants(details)
output.register_callback('notebook.InferMutants', infer_mutants)

class WitWidget(object):
  """WIT widget for colab."""

  # Static instance object so python global functions can call into this object.
  widget = None

  def __init__(self, config_builder, height=1000):
    tf.logging.set_verbosity(tf.logging.WARN)
    config = config_builder.build()
    copied_config = dict(config)
    self.estimator_and_spec = (
      dict(config.get('estimator_and_spec'))
      if 'estimator_and_spec' in config else {})
    self.compare_estimator_and_spec = (
      dict(config.get('compare_estimator_and_spec'))
      if 'compare_estimator_and_spec' in config else {})
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
    self._set_examples(config['examples'])
    WitWidget.widget = self

    # Display WIT Polymer element.
    display.display(display.HTML("""
      <link rel="import"
      href="/nbextensions/wit-widget/wit_jupyter.html">
      """))
    display.display(display.HTML("""
      <tf-interactive-inference-dashboard id="wit" local>
      </tf-interactive-inference-dashboard>
      <script>
        const examples = {examples};
        const wit = document.querySelector("#wit");
        wit.parentElement.style.height = '{height}px';
        let mutantFeature = null;

        // Listeners from WIT element events which pass requests to python.
        wit.addEventListener("infer-examples", e => {{
          google.colab.kernel.invokeFunction(
            'notebook.InferExamples', [], {{}});
        }});
        wit.addEventListener("delete-example", e => {{
          google.colab.kernel.invokeFunction(
            'notebook.DeleteExample', [e.detail.index], {{}});
        }});
        wit.addEventListener("duplicate-example", e => {{
          google.colab.kernel.invokeFunction(
            'notebook.DuplicateExample', [e.detail.index], {{}});
        }});
        wit.addEventListener("update-example", e => {{
          google.colab.kernel.invokeFunction(
            'notebook.UpdateExample', [e.detail.index, e.detail.example], {{}});
        }});
        wit.addEventListener('get-eligible-features', e => {{
          google.colab.kernel.invokeFunction(
            'notebook.GetEligibleFeatures', [], {{}});
        }});
        wit.addEventListener('infer-mutants', e => {{
          mutantFeature = e.detail.feature_name;
          google.colab.kernel.invokeFunction(
            'notebook.InferMutants', [e.detail], {{}});
        }});

        // Javascript callbacks called by python code to communicate with WIT
        // Polymer element.
        window.inferenceCallback = inferences => {{
          const parsedInferences = JSON.parse(inferences);
          wit.inferences = parsedInferences.inferences;
          wit.labelVocab = parsedInferences.label_vocab;
        }}
        window.spriteCallback = spriteUrl => {{
          if (!wit.updateSprite_) {{
            setTimeout(() => window.spriteCallback(spriteUrl), 100);
            return;
          }}
          wit.hasSprite = true;
          wit.localAtlasUrl = spriteUrl;
          wit.updateSprite_();
        }}
        window.eligibleFeaturesCallback = features => {{
          const parsedFeatures = JSON.parse(features);
          wit.partialDepPlotEligibleFeatures = parsedFeatures;
        }}
        window.inferMutantsCallback = jsonMapping => {{
          const chartInfo = JSON.parse(jsonMapping);
          wit.makeChartForFeature_(chartInfo.chartType, mutantFeature,
            chartInfo.data);
        }}
        window.configCallback = jsonConfig => {{
          const config = JSON.parse(jsonConfig);
          if ('inference_address' in config) {{
            wit.inferenceAddress = config['inference_address'];
          }}
          if ('model_name' in config) {{
            wit.modelName = config['model_name'];
          }}
          if ('model_type' in config) {{
            wit.modelType = config['model_type'];
          }}
          if ('are_sequence_examples' in config) {{
            wit.sequenceExamples = config['are_sequence_examples'];
          }}
          if ('max_classes' in config) {{
            wit.maxInferenceEntriesPerRun = config['max_classes'];
          }}
          if ('multiclass' in config) {{
            wit.multiClass = config['multiclass'];
          }}
        }}
        setTimeout(() => {{
          wit.updateExampleContents_(examples, false);
          if (wit.localAtlasUrl) {{
            window.spriteCallback(wit.localAtlasUrl);
          }}
        }}, 5000);
      </script>
      """.format(examples=json.dumps(self.examples), height=height)))
    self._generate_sprite()
    output.eval_js("""configCallback('{config}')""".format(
      config=json.dumps(self.config)))

  def _set_examples(self, examples):
    self.examples = [json_format.MessageToJson(ex) for ex in examples]
    self.updated_example_indices = set(range(len(examples)))

  def json_to_proto(self, json):
    ex = (tf.train.SequenceExample()
          if self.config.get('are_sequence_examples')
          else tf.train.Example())
    json_format.Parse(json, ex)
    return ex

  def infer(self):
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
    if ('inference_address_2' in self.config or
        self.compare_estimator_and_spec.get('estimator')):
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
    inferences = {
      'inferences': {'indices': indices_to_infer, 'results': infer_objs},
      'label_vocab': inference_utils.get_label_vocab(
          self.config.get('label_vocab_path'))}
    output.eval_js("""inferenceCallback('{inferences}')""".format(
      inferences=json.dumps(inferences)))

  def delete_example(self, index):
    self.examples.pop(index)
    self.updated_example_indices = set([
      i if i < index else i - 1 for i in self.updated_example_indices])
    self._generate_sprite()

  def update_example(self, index, example):
    self.updated_example_indices.add(index)
    self.examples[index] = example
    self._generate_sprite()

  def duplicate_example(self, index):
    self.examples.append(self.examples[index])
    self.updated_example_indices.add(len(self.examples) - 1)
    self._generate_sprite()

  def get_eligible_features(self):
    examples = [self.json_to_proto(ex) for ex in self.examples[0:50]]
    features_list = inference_utils.get_eligible_features(
      examples, 10)
    output.eval_js("""eligibleFeaturesCallback('{features_list}')""".format(
      features_list=json.dumps(features_list)))

  def infer_mutants(self, info):
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
    output.eval_js("""inferMutantsCallback('{json_mapping}')""".format(
      json_mapping=json.dumps(json_mapping)))

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
      sprite = 'data:image/png;base64,{}'.format(encoded)
      output.eval_js("""spriteCallback('{sprite}')""".format(sprite=sprite))
