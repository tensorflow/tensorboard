/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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

import {computed, customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as d3 from 'd3';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {Canceller} from '../../../components/tf_backend/canceller';
import {RequestManager} from '../../../components/tf_backend/requestManager';
import {getRouter} from '../../../components/tf_backend/router';
import {addParams} from '../../../components/tf_backend/urlPathHelpers';
import '../../../components/tf_card_heading/tf-card-heading';
import {runsColorScale} from '../../../components/tf_color_scale/colorScale';
import '../../../components/tf_dashboard_common/scrollbar-style';
import '../../../components/tf_markdown_view/tf-markdown-view';

// tf-text-loader displays markdown text data from the Text plugin.
@customElement('tf-text-loader')
class TfTextLoader extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <tf-card-heading run="[[run]]" tag="[[tag]]" color="[[_runColor]]">
    </tf-card-heading>
    <paper-material
      elevation="1"
      id="steps-container"
      class="container scrollbar"
    >
      <template is="dom-repeat" items="[[_texts]]">
        <paper-material elevation="1" class="step-container">
          step <span class="step-value">[[_formatStep(item.step)]]</span>
        </paper-material>
        <paper-material elevation="1" class="text">
          <tf-markdown-view html="[[item.text]]"></tf-markdown-view>
        </paper-material>
      </template>
    </paper-material>
    <style include="scrollbar-style"></style>
    <style>
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: auto;
        margin-right: 10px;
        margin-bottom: 15px;
      }
      .scrollbar {
        will-change: transform;
      }
      #steps-container {
        border-radius: 3px;
        border: 2px solid /* color computed and set as inline style */;
        display: block;
        max-height: 500px;
        overflow: auto;
        padding: 10px;
        border-color: var(--tb-text-loader-outline);
      }
      .text {
        background-color: inherit;
        border-radius: 0 3px 3px 3px;
        padding: 5px;
        word-break: break-word;
      }
      .step-container {
        background-color: var(--tb-ui-light-accent);
        border-bottom: none;
        border-radius: 3px 3px 0 0;
        border: 1px solid var(--tb-ui-border);
        display: inline-block;
        font-size: 12px;
        font-style: italic;
        margin-left: -1px; /* to correct for border */
        padding: 3px;
      }
      .step-container:not(:first-child) {
        margin-top: 15px;
      }

      tf-card-heading {
        margin-bottom: 10px;
      }
    </style>
  `;

  @property({type: String})
  run: string;

  @property({type: String})
  tag: string;

  @property({type: Boolean})
  markdownEnabled: boolean;

  // Ordered from newest to oldest.
  @property({type: Array})
  _texts: Array<{wall_time: Date; step: number; text: string}> = [];

  @property({type: Object})
  requestManager: RequestManager;

  @property({type: Object})
  _canceller: Canceller = new Canceller();

  @computed('run')
  get _runColor(): string {
    var run = this.run;
    return runsColorScale(run);
  }

  @observe('_runColor')
  _changeRunColor() {
    var runColor = this._runColor;
    this.updateStyles({
      '--tb-text-loader-outline': runColor,
    });
  }

  override attached() {
    this.reload();
  }

  reload() {
    if (!this.isAttached) {
      return;
    }
    this._canceller.cancelAll();
    const router = getRouter();
    const url = addParams(router.pluginRoute('text', '/text'), {
      tag: this.tag,
      run: this.run,
      markdown: this.markdownEnabled ? 'true' : 'false',
    });
    const updateTexts = this._canceller.cancellable((result) => {
      if (result.cancelled) {
        return;
      }
      const data = (result.value as any).map((datum) => ({
        wall_time: new Date(datum.wall_time * 1000),
        step: datum.step,
        text: datum.text,
      }));
      this.set('_texts', data.slice().reverse());
    });
    this.requestManager.request(url).then(updateTexts);
  }

  _formatStep(n) {
    return d3.format(',')(n);
  }
}
