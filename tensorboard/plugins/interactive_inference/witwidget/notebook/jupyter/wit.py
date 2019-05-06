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

import ipywidgets as widgets
import tensorflow as tf
from IPython.core.display import display, HTML
from ipywidgets import Layout
from traitlets import Dict
from traitlets import Int
from traitlets import List
from traitlets import observe
from traitlets import Unicode
from traitlets import Set
from witwidget.notebook import base


@widgets.register
class WitWidget(widgets.DOMWidget, base.WitWidgetBase):
  """WIT widget for Jupyter."""
  _view_name = Unicode('WITView').tag(sync=True)
  _view_module = Unicode('wit-widget').tag(sync=True)
  _view_module_version = Unicode('^0.1.0').tag(sync=True)

  # Traitlets for communicating between python and javascript.
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
    """Constructor for Jupyter notebook WitWidget.

    Args:
      config_builder: WitConfigBuilder object containing settings for WIT.
      height: Optional height in pixels for WIT to occupy. Defaults to 1000.
    """
    widgets.DOMWidget.__init__(self, layout=Layout(height='%ipx' % height))
    base.WitWidgetBase.__init__(self, config_builder)

    # Ensure the visualization takes all available width.
    display(HTML("<style>.container { width:100% !important; }</style>"))

  def set_examples(self, examples):
    base.WitWidgetBase.set_examples(self, examples)
    self._generate_sprite()

  @observe('infer')
  def _infer(self, change):
    self.inferences = base.WitWidgetBase.infer_impl(self)

  # Observer callbacks for changes from javascript.
  @observe('get_eligible_features')
  def _get_eligible_features(self, change):
    features_list = base.WitWidgetBase.get_eligible_features_impl(self)
    self.eligible_features = features_list

  @observe('infer_mutants')
  def _infer_mutants(self, change):
    info = self.infer_mutants
    json_mapping = base.WitWidgetBase.infer_mutants_impl(self, info)
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
    index = self.delete_example['index']
    self.examples.pop(index)
    self.updated_example_indices = set([
        i if i < index else i - 1 for i in self.updated_example_indices])
    self._generate_sprite()

  def _generate_sprite(self):
    sprite = base.WitWidgetBase.create_sprite(self)
    if sprite is not None:
      self.sprite = sprite
