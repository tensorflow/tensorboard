/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import '../polymer/irons_and_papers';
import {getStringInitializer, getStringObserver} from '../tf_storage/storage';

@customElement('tf-tag-filterer')
class TfTagFilterer extends PolymerElement {
  static readonly template = html`
    <paper-input
      no-label-float=""
      label="Filter tags (regular expressions supported)"
      value="{{_tagFilter}}"
      class="search-input"
    >
      <iron-icon prefix="" icon="search" slot="prefix"></iron-icon>
    </paper-input>
    <style>
      :host {
        display: block;
        margin: 10px 5px 10px 10px;
      }
    </style>
  `;

  @property({
    type: String,
    notify: true,
    computed: '_computeTagFilter(_tagFilter)',
  })
  tagFilter: string;

  @property({
    type: String,
    observer: '_tagFilterObserver',
  })
  _tagFilter: string = getStringInitializer('tagFilter', {
    defaultValue: '',
    useLocalStorage: false,
    polymerProperty: '_tagFilter',
  }).call(this);

  _tagFilterObserver = getStringObserver('tagFilter', {
    defaultValue: '',
    useLocalStorage: false,
    polymerProperty: '_tagFilter',
  });

  _computeTagFilter() {
    return this._tagFilter;
  }
}
