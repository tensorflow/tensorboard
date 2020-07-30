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

import {PolymerElement, html} from '@polymer/polymer';
import {customElement, property} from '@polymer/decorators';
import '@polymer/paper-slider';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading-style.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/util.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tensorboard-color.html';
import {DO_NOT_SUBMIT} from '../tf-imports/d3.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-markdown-view/tf-markdown-view.html';
import '@polymer/paper-slider';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/tf-card-heading-style.html';
import {DO_NOT_SUBMIT} from '../tf-card-heading/util.html';
import {DO_NOT_SUBMIT} from '../tf-color-scale/tf-color-scale.html';
import {DO_NOT_SUBMIT} from '../tf-dashboard-common/tensorboard-color.html';
import {DO_NOT_SUBMIT} from '../tf-imports/d3.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from '../tf-markdown-view/tf-markdown-view.html';
'use strict';
@customElement('tf-audio-loader')
class TfAudioLoader extends PolymerElement {
  static readonly template = html`
    <tf-card-heading
      tag="[[tag]]"
      run="[[run]]"
      display-name="[[tagMetadata.displayName]]"
      description="[[tagMetadata.description]]"
      color="[[_runColor]]"
    >
      <template is="dom-if" if="[[_hasMultipleSamples]]">
        <div class="heading-row">
          <div class="heading-label">
            sample: [[_sampleText]] of [[totalSamples]]
          </div>
        </div>
      </template>
      <template is="dom-if" if="[[_hasAtLeastOneStep]]">
        <div class="heading-row">
          <div class="heading-label">
            step <strong>[[_currentDatum.step]]</strong>
          </div>
          <template is="dom-if" if="[[_currentDatum.wall_time]]">
            <div class="heading-label heading-right">
              [[_currentDatum.wall_time]]
            </div>
          </template>
        </div>
      </template>
      <template is="dom-if" if="[[_hasMultipleSteps]]">
        <div class="heading-row">
          <paper-slider
            id="steps"
            immediate-value="{{_stepIndex}}"
            max="[[_maxStepIndex]]"
            max-markers="[[_maxStepIndex]]"
            snaps=""
            step="1"
            value="{{_stepIndex}}"
          ></paper-slider>
        </div>
      </template>
    </tf-card-heading>
    <template is="dom-if" if="[[_hasAtLeastOneStep]]">
      <audio
        controls=""
        src$="[[_currentDatum.url]]"
        type$="[[_currentDatum.contentType]]"
      ></audio>
      <tf-markdown-view html="[[_currentDatum.label]]"></tf-markdown-view>
    </template>
    <div id="main-audio-container"></div>

    <style include="tf-card-heading-style">
      :host {
        display: block;
        width: 350px;
        height: auto;
        position: relative;
        --step-slider-knob-color: #424242;
        margin-right: 15px;
        margin-bottom: 15px;
      }

      #steps {
        height: 15px;
        margin: 0 0 0 -15px;
        width: 100%;
        box-sizing: border-box;
        padding: 0 5px; /* so the slider knob doesn't butt out */
        margin-top: 5px;
        --paper-slider-active-color: var(--step-slider-knob-color);
        --paper-slider-knob-color: var(--step-slider-knob-color);
        --paper-slider-pin-color: var(--step-slider-knob-color);
        --paper-slider-knob-start-color: var(--step-slider-knob-color);
        --paper-slider-knob-start-border-color: var(--step-slider-knob-color);
        --paper-slider-pin-start-color: var(--step-slider-knob-color);
      }
    </style>
  `;
  @property({type: String})
  run: string;
  @property({type: String})
  tag: string;
  @property({type: Number})
  sample: number;
  @property({type: Number})
  totalSamples: number;
  @property({type: Object})
  tagMetadata: object;
  @property({type: Object})
  requestManager: object;
  @property({
    type: Object,
  })
  _metadataCanceller: object = () => new tf_backend.Canceller();
  @property({
    type: Array,
  })
  _steps: unknown[] = () => [];
  @property({type: Number})
  _stepIndex: number;
  @computed('run')
  get _runColor(): string {
    var run = this.run;
    return tf_color_scale.runsColorScale(run);
  }
  @computed('_steps')
  get _hasAtLeastOneStep(): boolean {
    var steps = this._steps;
    return !!steps && steps.length > 0;
  }
  @computed('_steps')
  get _hasMultipleSteps(): boolean {
    var steps = this._steps;
    return !!steps && steps.length > 1;
  }
  @computed('_steps')
  get _maxStepIndex(): number {
    var steps = this._steps;
    return steps.length - 1;
  }
  @computed('_steps', '_stepIndex')
  get _currentDatum(): object {
    var steps = this._steps;
    var stepIndex = this._stepIndex;
    return steps[stepIndex];
  }
  @computed('sample')
  get _sampleText(): string {
    var sample = this.sample;
    return `${sample + 1}`;
  }
  @computed('totalSamples')
  get _hasMultipleSamples(): boolean {
    var totalSamples = this.totalSamples;
    return totalSamples > 1;
  }
  attached() {
    this._attached = true;
    this.reload();
  }
  @observe('run', 'tag')
  reload() {
    if (!this._attached) {
      return;
    }
    this._metadataCanceller.cancelAll();
    const router = tf_backend.getRouter();
    const url = router.pluginRoute(
      'audio',
      '/audio',
      new URLSearchParams({
        tag: this.tag,
        run: this.run,
        sample: this.sample,
      })
    );
    const updateSteps = this._metadataCanceller.cancellable((result) => {
      if (result.cancelled) {
        return;
      }
      const data = result.value;
      const steps = data.map(this._createStepDatum.bind(this));
      this.set('_steps', steps);
      this.set('_stepIndex', steps.length - 1);
    });
    this.requestManager.request(url).then(updateSteps);
  }
  _createStepDatum(audioMetadata) {
    const searchParam = new URLSearchParams(audioMetadata.query);
    // Include wall_time just to disambiguate the URL and force
    // the browser to reload the audio when the URL changes. The
    // backend doesn't care about the value.
    searchParam.append('ts', audioMetadata.wall_time);
    const url = tf_backend
      .getRouter()
      .pluginRoute('audio', '/individualAudio', searchParam);
    return {
      wall_time: tf_card_heading.formatDate(
        new Date(audioMetadata.wall_time * 1000)
      ),
      step: audioMetadata.step,
      label: audioMetadata.label,
      contentType: audioMetadata.contentType,
      url,
    };
  }
}
