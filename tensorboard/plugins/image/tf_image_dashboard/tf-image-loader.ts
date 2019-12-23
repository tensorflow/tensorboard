import {PolymerElement, html} from '@polymer/polymer';
import {LegacyElementMixin} from '@polymer/polymer/lib/legacy/legacy-element-mixin';
import {customElement, property, computed, observe} from '@polymer/decorators';
import '@polymer/paper-icon-button';
import '@polymer/paper-slider';
import '@polymer/paper-spinner';
import * as _ from 'lodash';

import * as tf_backend from '../../../components/tf_backend';
import {TagInfo} from '../../../components/tf_utils/utils';
import * as tf_card_heading from '../../../components/tf_card_heading/util';
import * as tf_color_scale from '../../../components/tf_color_scale/colorScale';
import '../../../components/tf_dashboard_common/tf-dashboard-common';

type StepDatum = {
    width: number,
    height: number,
    wall_time: Date,
    step: number,
    url: string,
}

type ImageMetadataResponse = {
  width: number,
  height: number,
  wall_time: number,
  step: number,
  query: string,
}

@customElement('tf-image-loader')
export class TfImageLoader extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <tf-card-heading
      tag="[[tag]]"
      run="[[run]]"
      display-name="[[tagMetadata.displayNameTagInfo
      description="[[tagMetadata.descriptionTagInfo
      color="[[_runColor]]"
    >
      <template is="dom-if" if="[[_hasMultipleSamples]]">
        <div>sample: [[_sampleText]] of [[ofSamples]]</div>
      </template>
      <template is="dom-if" if="[[_hasAtLeastOneStep]]">
        <div class="heading-row">
          <div class="heading-label">
            step
            <span style="font-weight: bold"
              >[[_toLocaleString(_stepValue)]]</span
            >
          </div>
          <div class="heading-label heading-right datetime">
            <template is="dom-if" if="[[_currentWallTime]]">
              [[_currentWallTime]]
            </template>
          </div>
          <div class="label right">
            <paper-spinner-lite active="" hidden$="[[!_isImageLoading]]">
            </paper-spinner-lite>
          </div>
        </div>
      </template>
      <template is="dom-if" if="[[_hasMultipleSteps]]">
        <div>
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

    <!-- Semantically a button but <img> inside a <button> disallows user to do
    an interesting operation like "Copy Image" in non-Chromium browsers. -->
    <a
      id="main-image-container"
      role="button"
      aria-label="Toggle actual size"
      aria-expanded$="[[_getAriaExpanded(actualSize)]]"
      on-tap="_handleTap"
    ></a>

    <style include="tf-card-heading-style">
      /** Make button a div. */
      button {
        width: 100%;
        display: block;
        background: none;
        border: 0;
        padding: 0;
      }

      /** Firefox: Get rid of dotted line inside button. */
      button::-moz-focus-inner {
        border: 0;
        padding: 0;
      }

      /** Firefox: Simulate Chrome's outer glow on button when focused. */
      button:-moz-focusring {
        outline: none;
        box-shadow: 0px 0px 1px 2px Highlight;
      }

      :host {
        display: block;
        width: 350px;
        height: auto;
        position: relative;
        margin: 0 15px 40px 0;
        overflow-x: auto;
      }

      /** When actual size shown is on, use the actual image width. */
      :host([actual-size]) {
        max-width: 100%;
        width: auto;
      }

      :host([actual-size]) #main-image-container {
        max-height: none;
        width: auto;
      }

      :host([actual-size]) #main-image-container img {
        width: auto;
      }

      paper-spinner-lite {
        width: 14px;
        height: 14px;
        vertical-align: text-bottom;
        --paper-spinner-color: var(--tb-orange-strong);
      }

      #steps {
        height: 15px;
        margin: 0 0 0 -15px;
        /*
         * 31 comes from adding a padding of 15px from both sides of the
         * paper-slider, subtracting 1px so that the slider width aligns
         * with the image (the last slider marker takes up 1px), and
         * adding 2px to account for a border of 1px on both sides of
         * the image. 30 - 1 + 2.
         */
        width: calc(100% + 31px);
        --paper-slider-active-color: var(--tb-orange-strong);
        --paper-slider-knob-color: var(--tb-orange-strong);
        --paper-slider-knob-start-border-color: var(--tb-orange-strong);
        --paper-slider-knob-start-color: var(--tb-orange-strong);
        --paper-slider-markers-color: var(--tb-orange-strong);
        --paper-slider-pin-color: var(--tb-orange-strong);
        --paper-slider-pin-start-color: var(--tb-orange-strong);
      }

      #main-image-container {
        max-height: 1024px;
        overflow: auto;
      }

      #main-image-container img {
        cursor: pointer;
        display: block;
        image-rendering: -moz-crisp-edges;
        image-rendering: pixelated;
        width: 100%;
        height: auto;
      }

      paper-icon-button {
        color: #2196f3;
        border-radius: 100%;
        width: 32px;
        height: 32px;
        padding: 4px;
      }
      paper-icon-button[selected] {
        background: var(--tb-ui-light-accent);
      }
      [hidden] {
        display: none;
      }
    </style>
  `;
  @property({type: String})
  run!: string;
  @property({type: String})
  tag!: string;
  @property({type: Number})
  sample!: number;
  @property({type: Number})
  ofSamples!: number;
  @property({type: Object})
  tagMetadata!: TagInfo;
  @property({
    type: Boolean,
    reflectToAttribute: true,
  })
  actualSize: boolean = false;
  @property({
    type: Number,
  })
  brightnessAdjustment: number = 0.5;
  @property({
    type: Number,
  })
  contrastPercentage: number = 0;
  @property({type: Object})
  requestManager!: tf_backend.RequestManager;
  @property({
    type: Object,
  })
  _metadataCanceller = new tf_backend.Canceller();
  @property({
    type: Object,
  })
  _imageCanceller = new tf_backend.Canceller();
  @property({
    type: Array,
    notify: true,
  })
  _steps: StepDatum[] = [];
  @property({
    type: Number,
    notify: true,
  })
  _stepIndex: number = -1;
  @property({
    type: Boolean,
  })
  _isImageLoading: boolean = false;
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
  @computed('_steps', '_stepIndex')
  get _currentStep(): StepDatum|null {
    var steps = this._steps;
    var stepIndex = this._stepIndex;
    return steps[stepIndex] || null;
  }
  @computed('_currentStep')
  get _stepValue(): number {
    var currentStep = this._currentStep;
    if (!currentStep) return 0;
    return currentStep.step;
  }
  @computed('_currentStep')
  get _currentWallTime(): string {
    var currentStep = this._currentStep;
    if (!currentStep) return '';
    return tf_card_heading.formatDate(currentStep.wall_time);
  }
  @computed('_steps')
  get _maxStepIndex(): number {
    var steps = this._steps;
    return steps.length - 1;
  }
  @computed('sample')
  get _sampleText(): string {
    var sample = this.sample;
    return `${sample + 1}`;
  }
  @computed('ofSamples')
  get _hasMultipleSamples(): boolean {
    var ofSamples = this.ofSamples;
    return ofSamples > 1;
  }
  _getAriaExpanded() {
    return this.actualSize ? 'true' : 'false';
  }
  _attached: boolean = false;
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
    const url = tf_backend.addParams(router.pluginRoute('images', '/images'), {
      tag: this.tag,
      run: this.run,
      sample: String(this.sample),
    });
    const updateSteps = this._metadataCanceller.cancellable((result) => {
      if (result.cancelled) {
        return;
      }
      const data = result.value as ImageMetadataResponse[];
      const steps = data.map(this._createStepDatum.bind(this));
      this.set('_steps', steps);
      this.set('_stepIndex', steps.length - 1);
    });
    this.requestManager.request(url).then(updateSteps);
  }
  _createStepDatum(imageMetadata: ImageMetadataResponse): StepDatum {
    let url = tf_backend.getRouter().pluginRoute('images', '/individualImage');
    // Include wall_time just to disambiguate the URL and force
    // the browser to reload the image when the URL changes. The
    // backend doesn't care about the value.
    url = tf_backend.addParams(url, {ts: String(imageMetadata.wall_time)});
    url += '&' + imageMetadata.query;
    return {
      width: imageMetadata.width,
      height: imageMetadata.height,
      // The wall time within the metadata is in seconds. The Date
      // constructor accepts a time in milliseconds, so we multiply by 1000.
      wall_time: new Date(imageMetadata.wall_time * 1000),
      step: imageMetadata.step,
      url,
    };
  }
  @observe('_currentStep', 'brightnessAdjustment', 'contrastPercentage')
  _updateImageUrl() {
    var currentStep = this._currentStep;
    var brightnessAdjustment = this.brightnessAdjustment;
    var contrastPercentage = this.contrastPercentage;
    // We manually change the image URL (instead of binding to the
    // image's src attribute) because we would like to manage what
    // happens when the image starts and stops loading.
    if (!currentStep) return;
    const img = new Image();
    this._imageCanceller.cancelAll();
    img.onload = img.onerror = this._imageCanceller
      .cancellable((result) => {
        if (result.cancelled) {
          return;
        }
        const mainImageContainer = this.$$('#main-image-container') as Element;
        mainImageContainer.innerHTML = '';
        mainImageContainer.appendChild(img);
        this.set('_isImageLoading', false);
      })
      .bind(this);
    img.style.filter = `contrast(${contrastPercentage}%) `;
    img.style.filter += `brightness(${brightnessAdjustment})`;
    // Load the new image.
    this.set('_isImageLoading', true);
    img.src = currentStep.url;
  }
  _handleTap() {
    this.set('actualSize', !this.actualSize);
  }
  _toLocaleString(number: number) {
    // Shows commas (or locale-appropriate punctuation) for large numbers.
    return number.toLocaleString();
  }
}
