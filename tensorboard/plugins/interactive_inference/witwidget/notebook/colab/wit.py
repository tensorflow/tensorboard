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
def infer_examples(wit_id):
  WitWidget.widgets[wit_id].infer()
output.register_callback('notebook.InferExamples', infer_examples)


def delete_example(wit_id, index):
  WitWidget.widgets[wit_id].delete_example(index)
output.register_callback('notebook.DeleteExample', delete_example)


def duplicate_example(wit_id, index):
  WitWidget.widgets[wit_id].duplicate_example(index)
output.register_callback('notebook.DuplicateExample', duplicate_example)


def update_example(wit_id, index, example):
  WitWidget.widgets[wit_id].update_example(index, example)
output.register_callback('notebook.UpdateExample', update_example)


def get_eligible_features(wit_id):
  WitWidget.widgets[wit_id].get_eligible_features()
output.register_callback('notebook.GetEligibleFeatures', get_eligible_features)


def infer_mutants(wit_id, details):
  WitWidget.widgets[wit_id].infer_mutants(details)
output.register_callback('notebook.InferMutants', infer_mutants)


# HTML/javascript for the WIT frontend.
WIT_HTML = """
  <tf-interactive-inference-dashboard id="wit" local hide-images>
  </tf-interactive-inference-dashboard>
  <script>
    const examples = {examples};
    const id = {id};
    const wit = document.querySelector("#wit");
    wit.parentElement.style.height = '{height}px';
    let mutantFeature = null;

    // Listeners from WIT element events which pass requests to python.
    wit.addEventListener("infer-examples", e => {{
      google.colab.kernel.invokeFunction(
        'notebook.InferExamples', [id], {{}});
    }});
    wit.addEventListener("delete-example", e => {{
      google.colab.kernel.invokeFunction(
        'notebook.DeleteExample', [id, e.detail.index], {{}});
    }});
    wit.addEventListener("duplicate-example", e => {{
      google.colab.kernel.invokeFunction(
        'notebook.DuplicateExample', [id, e.detail.index], {{}});
    }});
    wit.addEventListener("update-example", e => {{
      google.colab.kernel.invokeFunction(
        'notebook.UpdateExample', [id, e.detail.index, e.detail.example], {{}});
    }});
    wit.addEventListener('get-eligible-features', e => {{
      google.colab.kernel.invokeFunction(
        'notebook.GetEligibleFeatures', [id], {{}});
    }});
    wit.addEventListener('infer-mutants', e => {{
      mutantFeature = e.detail.feature_name;
      google.colab.kernel.invokeFunction(
        'notebook.InferMutants', [id, e.detail], {{}});
    }});

    // Javascript callbacks called by python code to communicate with WIT
    // Polymer element.
    window.inferenceCallback = inferences => {{
      const parsedInferences = JSON.parse(inferences);
      wit.labelVocab = parsedInferences.label_vocab;
      wit.inferences = parsedInferences.inferences;
    }};
    window.spriteCallback = spriteUrl => {{
      if (!wit.updateSprite) {{
        requestAnimationFrame(() => window.spriteCallback(spriteUrl));
        return;
      }}
      wit.hasSprite = true;
      wit.localAtlasUrl = spriteUrl;
      wit.updateSprite();
    }};
    window.eligibleFeaturesCallback = features => {{
      const parsedFeatures = JSON.parse(features);
      wit.partialDepPlotEligibleFeatures = parsedFeatures;
    }};
    window.inferMutantsCallback = jsonMapping => {{
      const chartInfo = JSON.parse(jsonMapping);
      wit.makeChartForFeature(chartInfo.chartType, mutantFeature,
        chartInfo.data);
    }};
    window.configCallback = jsonConfig => {{
      if (!wit.updateNumberOfModels) {{
        requestAnimationFrame(() => window.configCallback(jsonConfig));
        return;
      }}
      const config = JSON.parse(jsonConfig);
      if ('inference_address' in config) {{
        let addresses = config['inference_address'];
        if ('inference_address_2' in config) {{
          addresses += ',' + config['inference_address_2'];
        }}
        wit.inferenceAddress = addresses;
      }}
      if ('model_name' in config) {{
        let names = config['model_name'];
        if ('model_name_2' in config) {{
          names += ',' + config['model_name_2'];
        }}
        wit.modelName = names;
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
      wit.updateNumberOfModels();
    }};
    window.updateExamplesCallback = () => {{
      if (!wit.updateExampleContents) {{
        requestAnimationFrame(() => window.updateExamplesCallback(examples));
        return;
      }}
      wit.updateExampleContents(examples, false);
      if (wit.localAtlasUrl) {{
        window.spriteCallback(wit.localAtlasUrl);
      }}
    }};
  </script>
  """


class WitWidget(object):
  """WIT widget for colab."""

  # Static instance list of constructed WitWidgets so python global functions
  # can call into instances of this object
  widgets = []

  # Static instance index to keep track of ID number of each constructed
  # WitWidget.
  index = 0

  def __init__(self, config_builder, height=1000):
    """Constructor for colab notebook WitWidget.

    Args:
      config_builder: WitConfigBuilder object containing settings for WIT.
      height: Optional height in pixels for WIT to occupy. Defaults to 1000.
    """
    tf.logging.set_verbosity(tf.logging.WARN)
    config = config_builder.build()
    copied_config = dict(config)
    self.estimator_and_spec = (
      dict(config.get('estimator_and_spec'))
      if 'estimator_and_spec' in config else {})
    self.compare_estimator_and_spec = (
      dict(config.get('compare_estimator_and_spec'))
      if 'compare_estimator_and_spec' in config else {})
    if 'estimator_and_spec' in copied_config:
      del copied_config['estimator_and_spec']
    if 'compare_estimator_and_spec' in copied_config:
      del copied_config['compare_estimator_and_spec']

    self.custom_predict_fn = (
      config.get('custom_predict_fn')
      if 'custom_predict_fn' in config else None)
    self.compare_custom_predict_fn = (
      config.get('compare_custom_predict_fn')
      if 'compare_custom_predict_fn' in config else None)
    if 'custom_predict_fn' in copied_config:
      del copied_config['custom_predict_fn']
    if 'compare_custom_predict_fn' in copied_config:
      del copied_config['compare_custom_predict_fn']


    self._set_examples(config['examples'])
    del copied_config['examples']

    self.config = copied_config

    # Add this instance to the static instance list.
    WitWidget.widgets.append(self)

    # Display WIT Polymer element.
    display.display(display.HTML(self._get_element_html()))
    display.display(display.HTML(
      WIT_HTML.format(
        examples=json.dumps(self.examples), height=height, id=WitWidget.index)))

    # Increment the static instance WitWidget index counter
    WitWidget.index += 1

    # Send the provided config and examples to JS
    output.eval_js("""configCallback('{config}')""".format(
      config=json.dumps(self.config)))
    output.eval_js('updateExamplesCallback()')
    self._generate_sprite()

  def _get_element_html(self):
    return """
      <link rel="import" href="/nbextensions/wit-widget/wit_jupyter.html">"""

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
      self.estimator_and_spec.get('feature_spec'),
      self.custom_predict_fn)
    infer_objs.append(inference_utils.run_inference_for_inference_results(
        examples_to_infer, serving_bundle))
    if ('inference_address_2' in self.config or
        self.compare_estimator_and_spec.get('estimator') or
        self.compare_custom_predict_fn):
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
        self.compare_estimator_and_spec.get('feature_spec'),
        self.compare_custom_predict_fn)
      infer_objs.append(inference_utils.run_inference_for_inference_results(
          examples_to_infer, serving_bundle))
    self.updated_example_indices = set()
    inferences = {
      'inferences': {'indices': indices_to_infer, 'results': infer_objs},
      'label_vocab': self.config.get('label_vocab')}
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
    serving_bundles = []
    serving_bundles.append(inference_utils.ServingBundle(
      self.config.get('inference_address'),
      self.config.get('model_name'),
      self.config.get('model_type'),
      self.config.get('model_version'),
      self.config.get('model_signature'),
      self.config.get('uses_predict_api'),
      self.config.get('predict_input_tensor'),
      self.config.get('predict_output_tensor'),
      self.estimator_and_spec.get('estimator'),
      self.estimator_and_spec.get('feature_spec'),
      self.custom_predict_fn))
    if ('inference_address_2' in self.config or
        self.compare_estimator_and_spec.get('estimator') or
        self.compare_custom_predict_fn):
      serving_bundles.append(inference_utils.ServingBundle(
        self.config.get('inference_address_2'),
        self.config.get('model_name_2'),
        self.config.get('model_type'),
        self.config.get('model_version_2'),
        self.config.get('model_signature_2'),
        self.config.get('uses_predict_api'),
        self.config.get('predict_input_tensor'),
        self.config.get('predict_output_tensor'),
        self.compare_estimator_and_spec.get('estimator'),
        self.compare_estimator_and_spec.get('feature_spec'),
        self.compare_custom_predict_fn))
    viz_params = inference_utils.VizParams(
      info['x_min'], info['x_max'],
      scan_examples, 10,
      info['feature_index_pattern'])
    json_mapping = inference_utils.mutant_charts_for_feature(
      examples, feature_name, serving_bundles, viz_params)
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
