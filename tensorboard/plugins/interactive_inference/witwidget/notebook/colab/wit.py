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

import json
import tensorflow as tf
from IPython import display
from google.colab import output
from witwidget.notebook import base


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


def sort_eligible_features(wit_id, details):
  WitWidget.widgets[wit_id].sort_eligible_features(details)
output.register_callback('notebook.SortEligibleFeatures', sort_eligible_features)


def infer_mutants(wit_id, details):
  WitWidget.widgets[wit_id].infer_mutants(details)
output.register_callback('notebook.InferMutants', infer_mutants)


def compute_custom_distance(wit_id, index, callback_name, params):
  WitWidget.widgets[wit_id].compute_custom_distance(index, callback_name,
                                                    params)
output.register_callback('notebook.ComputeCustomDistance',
                         compute_custom_distance)


# HTML/javascript for the WIT frontend.
WIT_HTML = """
  <tf-interactive-inference-dashboard id="wit" local>
  </tf-interactive-inference-dashboard>
  <script>
    (function() {{
      const id = {id};
      const wit = document.querySelector("#wit");
      wit.parentElement.style.height = '{height}px';
      let mutantFeature = null;

      // Listeners from WIT element events which pass requests to python.
      wit.addEventListener("infer-examples", e => {{
        google.colab.kernel.invokeFunction(
          'notebook.InferExamples', [id], {{}});
      }});
      wit.addEventListener("compute-custom-distance", e => {{
        google.colab.kernel.invokeFunction(
          'notebook.ComputeCustomDistance',
          [id, e.detail.index, e.detail.callback, e.detail.params],
          {{}});
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
          'notebook.UpdateExample',
          [id, e.detail.index, e.detail.example],
          {{}});
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
      wit.addEventListener('sort-eligible-features', e => {{
        google.colab.kernel.invokeFunction(
          'notebook.SortEligibleFeatures', [id, e.detail], {{}});
      }});

      // Javascript callbacks called by python code to communicate with WIT
      // Polymer element.
      window.backendError = error => {{
        wit.handleError(error.msg);
      }};
      window.inferenceCallback = inferences => {{
        wit.labelVocab = inferences.label_vocab;
        wit.inferences = inferences.inferences;
        wit.extraOutputs = {{indices: wit.inferences.indices,
                             extra: inferences.extra_outputs}};
      }};

      window.distanceCallback = callbackDict => {{
        wit.invokeCustomDistanceCallback(callbackDict);
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
        wit.partialDepPlotEligibleFeatures = features;
      }};
      window.sortEligibleFeaturesCallback = features => {{
        wit.partialDepPlotEligibleFeatures = features;
      }};
      window.inferMutantsCallback = chartInfo => {{
        wit.makeChartForFeature(chartInfo.chartType, mutantFeature,
          chartInfo.data);
      }};
      window.configCallback = config => {{
        if (!wit.updateNumberOfModels) {{
          requestAnimationFrame(() => window.configCallback(config));
          return;
        }}
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
        if ('target_feature' in config) {{
          wit.selectedLabelFeature = config['target_feature'];
        }}
        if ('uses_custom_distance_fn' in config) {{
          wit.customDistanceFunctionSet = true;
        }} else {{
          wit.customDistanceFunctionSet = false;
        }}
      }};
      window.updateExamplesCallback = examples => {{
        if (!wit.updateExampleContents) {{
          requestAnimationFrame(() => window.updateExamplesCallback(examples));
          return;
        }}
        wit.updateExampleContents(examples, false);
        if (wit.localAtlasUrl) {{
          window.spriteCallback(wit.localAtlasUrl);
        }}
      }};
      // BroadcastChannel allows examples to be updated by a call from an
      // output cell that isn't the cell hosting the WIT widget.
      const channelName = 'updateExamples' + id;
      const updateExampleListener = new BroadcastChannel(channelName);
      updateExampleListener.onmessage = msg => {{
        window.updateExamplesCallback(msg.data);
      }};
    }})();
  </script>
  """


class WitWidget(base.WitWidgetBase):
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
    self._ctor_complete = False
    self.id = WitWidget.index
    base.WitWidgetBase.__init__(self, config_builder)
    # Add this instance to the static instance list.
    WitWidget.widgets.append(self)

    # Display WIT Polymer element.
    display.display(display.HTML(self._get_element_html()))
    display.display(display.HTML(
        WIT_HTML.format(height=height, id=self.id)))

    # Increment the static instance WitWidget index counter
    WitWidget.index += 1

    # Send the provided config and examples to JS
    output.eval_js("""configCallback({config})""".format(
        config=json.dumps(self.config)))
    output.eval_js("""updateExamplesCallback({examples})""".format(
        examples=json.dumps(self.examples)))
    self._generate_sprite()
    self._ctor_complete = True

  def _get_element_html(self):
    return """
      <link rel="import" href="/nbextensions/wit-widget/wit_jupyter.html">"""

  def set_examples(self, examples):
    base.WitWidgetBase.set_examples(self, examples)
    # If this is called outside of the ctor, use a BroadcastChannel to send
    # the updated examples to the visualization. Inside of the ctor, no action
    # is necessary as the ctor handles all communication.
    if self._ctor_complete:
      # Use BroadcastChannel to allow this call to be made in a separate colab
      # cell from the cell that displays WIT.
      channel_name = 'updateExamples{}'.format(self.id)
      output.eval_js("""(new BroadcastChannel('{channel_name}')).postMessage(
          {examples})""".format(
              examples=json.dumps(self.examples), channel_name=channel_name))
      self._generate_sprite()

  def infer(self):
    try:
      inferences = base.WitWidgetBase.infer_impl(self)
      output.eval_js("""inferenceCallback({inferences})""".format(
          inferences=json.dumps(inferences)))
    except Exception as e:
      output.eval_js("""backendError({error})""".format(
          error=json.dumps({'msg': str(e)})))

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

  def compute_custom_distance(self, index, callback_fn, params):
    try:
      distances = base.WitWidgetBase.compute_custom_distance_impl(
          self, index, params['distanceParams'])
      callback_dict = {
          'distances': distances,
          'exInd': index,
          'funId': callback_fn,
          'params': params['callbackParams']
      }
      output.eval_js("""distanceCallback({callback_dict})""".format(
          callback_dict=json.dumps(callback_dict)))
    except Exception as e:
      output.eval_js(
          """backendError({error})""".format(error=json.dumps({'msg': str(e)})))

  def get_eligible_features(self):
    features_list = base.WitWidgetBase.get_eligible_features_impl(self)
    output.eval_js("""eligibleFeaturesCallback({features_list})""".format(
        features_list=json.dumps(features_list)))

  def infer_mutants(self, info):
    try:
      json_mapping = base.WitWidgetBase.infer_mutants_impl(self, info)
      output.eval_js("""inferMutantsCallback({json_mapping})""".format(
          json_mapping=json.dumps(json_mapping)))
    except Exception as e:
      output.eval_js("""backendError({error})""".format(
          error=json.dumps({'msg': str(e)})))

  def sort_eligible_features(self, info):
    try:
      features_list = base.WitWidgetBase.sort_eligible_features_impl(self, info)
      output.eval_js("""sortEligibleFeaturesCallback({features_list})""".format(
          features_list=json.dumps(features_list)))
    except Exception as e:
      output.eval_js("""backendError({error})""".format(
          error=json.dumps({'msg': str(e)})))

  def _generate_sprite(self):
    sprite = base.WitWidgetBase.create_sprite(self)
    if sprite is not None:
      output.eval_js("""spriteCallback('{sprite}')""".format(sprite=sprite))
