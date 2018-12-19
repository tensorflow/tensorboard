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

widget = None

def infer_examples():
    widget.infer()
output.register_callback('notebook.InferExamples', infer_examples)

class WitWidget(object):
    """WIT widget for colab."""

    def __init__(self, config_builder, height=1000):
        global widget
        self.height = height
        config = config_builder.build()
        copied_config = dict(config)
        self.estimator_and_spec = (
            dict(config.get('estimator_and_spec'))
            if 'estimator_and_spec' in config else {})
        self.compare_estimator_and_spec = (
            dict(config.get('compare_estimator_and_spec'))
            if 'compare_estimator_and_spec' in config else {})
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
        widget = self
        display.display(
        display.HTML("""
          <link rel="import"
          href="/nbextensions/wit-widget/wit_jupyter.html">
          """))
        display.display(
            display.HTML("""
                <tf-interactive-inference-dashboard id="wit"
                    local model-name="test" inference-address="test">
                </tf-interactive-inference-dashboard>
                <script>
                    const examples = {examples};
                    const wit = document.querySelector("#wit");
                    wit.addEventListener("infer-examples", e => {{
                      google.colab.kernel.invokeFunction(
                          'notebook.InferExamples', [], {{}});
                    }});
                    window.inferenceCallback = inferences => {{
                      const parsedInferences = JSON.parse(inferences);
                      wit.inferences = parsedInferences.inferences;
                      wit.labelVocab = parsedInferences.label_vocab;
                    }}
                    setTimeout(() => wit.updateExampleContents_(
                        examples, false), 5000);
                </script>
                """.format(examples=json.dumps(self.examples))))
            
    def _set_examples(self, examples):
        self.examples = [json_format.MessageToJson(ex) for ex in examples]
        self.updated_example_indices = set(range(len(examples)))
    
    def json_to_proto(self, json):
        ex = (tf.train.SequenceExample()
            if self.config.get('are_sequence_examples')
            else tf.train.Example())
        json_format.Parse(json, ex)
        return ex

    def infer(self, change):
        indices_to_infer = sorted(self.updated_example_indices)
        examples_to_infer = [
            self.json_to_proto(
                self.examples[index]) for index in indices_to_infer]
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
            infer_objs.append(
                inference_utils.run_inference_for_inference_results(
                    examples_to_infer, serving_bundle))
        self.updated_example_indices = set()
        inferences = {
            'inferences': {'indices': indices_to_infer, 'results': infer_objs},
            'label_vocab': inference_utils.get_label_vocab(
                self.config.get('label_vocab_path'))}
        output.eval_js("""inferenceCallback('{inferences}')""".format(
            inferences=json.dumps(inferences)))
