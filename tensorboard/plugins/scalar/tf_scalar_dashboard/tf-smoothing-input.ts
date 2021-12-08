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
import * as _ from 'lodash';
import '../../../components/polymer/irons_and_papers';

/**
 * tf-smoothing-input creates an input component for exponential smoothing.
 */
@customElement('tf-smoothing-input')
// tslint:disable-next-line:no-unused-variable
class TfSmoothingInput extends PolymerElement {
  static readonly template = html`
    <h3 class="title">Smoothing</h3>
    <div class="smoothing-block">
      <paper-slider
        id="slider"
        immediate-value="{{_immediateWeightNumberForPaperSlider}}"
        max="[[max]]"
        min="[[min]]"
        pin
        step="[[step]]"
        type="number"
        value="{{weight}}"
      ></paper-slider>
      <paper-input
        id="input"
        label="weight"
        no-label-float
        value="{{_inputWeightStringForPaperInput}}"
        type="number"
        step="[[step]]"
        min="[[min]]"
        max="[[max]]"
      ></paper-input>
    </div>
    <style>
      .title {
        color: var(--tb-secondary-text-color);
        margin: 0;
        font-weight: normal;
        font-size: 14px;
        margin-bottom: 5px;
      }

      .smoothing-block {
        display: flex;
      }

      paper-slider {
        --paper-slider-active-color: var(--tb-orange-strong);
        --paper-slider-knob-color: var(--tb-orange-strong);
        --paper-slider-knob-start-border-color: var(--tb-orange-strong);
        --paper-slider-knob-start-color: var(--tb-orange-strong);
        --paper-slider-markers-color: var(--tb-orange-strong);
        --paper-slider-pin-color: var(--tb-orange-strong);
        --paper-slider-pin-start-color: var(--tb-orange-strong);
        flex-grow: 2;
      }

      paper-input {
        --paper-input-container-focus-color: var(--tb-orange-strong);
        --paper-input-container-input: {
          font-size: 14px;
        }
        --paper-input-container-label: {
          font-size: 14px;
        }
        width: 60px;
      }
    </style>
  `;

  @property({type: Number})
  step: number;

  @property({type: Number})
  max: number;

  @property({type: Number})
  min: number;

  @property({
    type: Number,
    notify: true,
  })
  weight: number = 0.6;

  @property({
    type: Number,
    notify: true,
    observer: '_immediateWeightNumberForPaperSliderChanged',
  })
  _immediateWeightNumberForPaperSlider: number;

  // Paper input treats values as strings even if you specify them as numbers.
  @property({
    type: String,
    notify: true,
    observer: '_inputWeightStringForPaperInputChanged',
  })
  _inputWeightStringForPaperInput: string;

  _updateWeight = _.debounce(function (val) {
    this.weight = val;
  }, 250);

  _immediateWeightNumberForPaperSliderChanged() {
    this._inputWeightStringForPaperInput =
      this._immediateWeightNumberForPaperSlider.toString();
    this._updateWeight.call(this, this._immediateWeightNumberForPaperSlider);
  }

  _inputWeightStringForPaperInputChanged() {
    if (+this._inputWeightStringForPaperInput < 0) {
      this._inputWeightStringForPaperInput = '0';
    } else if (+this._inputWeightStringForPaperInput > 1) {
      this._inputWeightStringForPaperInput = '1';
    }
    var d = +this._inputWeightStringForPaperInput;
    if (!isNaN(d)) {
      this._updateWeight.call(this, d);
    }
  }
}
