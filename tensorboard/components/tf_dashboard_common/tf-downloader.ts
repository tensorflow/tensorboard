/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
import {addParams} from '../tf_backend/urlPathHelpers';

@customElement('tf-downloader')
export class TfDownloader extends PolymerElement {
  static readonly template = html`
    <paper-dropdown-menu
      no-label-float="true"
      label="run to download"
      selected-item-label="{{_run}}"
    >
      <paper-listbox slot="dropdown-content">
        <template is="dom-repeat" items="[[runs]]">
          <paper-item no-label-float="true">[[item]]</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
    <template is="dom-if" if="[[_run]]">
      <a download="[[_csvName(tag, _run)]]" href="[[_csvUrl(tag, _run, urlFn)]]"
        >CSV</a
      ><!--
      --><a
        download="[[_jsonName(tag, _run)]]"
        href="[[_jsonUrl(tag, _run, urlFn)]]"
        >JSON</a
      >
    </template>
    <style>
      :host {
        display: flex;
        align-items: center;
        height: 32px;
      }
      paper-dropdown-menu {
        width: 100px;
        --paper-input-container-label: {
          font-size: 10px;
        }
        --paper-input-container-input: {
          font-size: 10px;
        }
      }
      a {
        font-size: 10px;
        margin: 0 0.2em;
      }
      paper-input {
        font-size: 22px;
      }
    </style>
  `;

  @property({type: String})
  _run: string = '';

  @property({type: Array})
  runs: string[];

  @property({type: String})
  tag: string;

  // Clients pass `urlFn: (tag: string, run: string) => string`,
  // which should generate a URL to download data for a given
  // run/tag combination. The data at the URL should be in JSON
  // form, and the URL should be such that adding a query
  // parameter `format=csv` instead yields CSV data.
  @property({type: Object})
  urlFn: object;

  _csvUrl(tag, run, urlFn) {
    if (!run) return '';
    return addParams(urlFn(tag, run), {format: 'csv'});
  }

  _jsonUrl(tag, run, urlFn) {
    if (!run) return '';
    return urlFn(tag, run);
  }

  _csvName(tag, run) {
    if (!run) return '';
    return `run-${run}-tag-${tag}.csv`;
  }

  _jsonName(tag, run) {
    if (!run) return '';
    return `run-${run}-tag-${tag}.json`;
  }
}
