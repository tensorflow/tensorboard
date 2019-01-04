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

"""Visualization API."""
import sys
import tensorflow as tf


def _is_colab():
  return "google.colab" in sys.modules


if _is_colab():
  from witwidget.notebook.colab.wit import *  # pylint: disable=wildcard-import,g-import-not-at-top
else:
  from witwidget.notebook.jupyter.wit import *  # pylint: disable=wildcard-import,g-import-not-at-top


class WitConfigBuilder(object):
  """Configuration builder for WitWidget settings."""

  def __init__(self, examples):
    self.config = {}
    self.set_examples(examples)
    self.set_model_type('classification')
    self.set_label_vocab([])
  
  def build(self):
    return self.config
  
  def store(self, key, value):
    self.config[key] = value
  
  def set_examples(self, examples):
    self.store('examples', examples)
    if len(examples) > 0:
      self.store('are_sequence_examples',
                 isinstance(examples[0], tf.train.SequenceExample))
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

  def set_label_vocab(self, vocab):
    self.store('label_vocab', vocab)
    return self

  def set_estimator_and_feature_spec(self, estimator, feature_spec):
    self.store('estimator_and_spec', {
      'estimator': estimator, 'feature_spec': feature_spec})
    self.set_inference_address('estimator')
    self.set_model_name('estimator')
    return self
  
  def set_compare_estimator_and_feature_spec(self, estimator, feature_spec):
    self.store('compare_estimator_and_spec', {
      'estimator': estimator, 'feature_spec': feature_spec})
    self.set_compare_inference_address('estimator')
    self.set_compare_model_name('estimator')
    return self
