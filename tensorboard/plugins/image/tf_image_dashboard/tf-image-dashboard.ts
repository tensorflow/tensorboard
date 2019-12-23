import {PolymerElement, html} from '@polymer/polymer';
import {LegacyElementMixin} from '@polymer/polymer/lib/legacy/legacy-element-mixin';
import {customElement, property, computed} from '@polymer/decorators';
import '@polymer/paper-button';
import '@polymer/paper-dialog';
import '@polymer/paper-input';
import '@polymer/paper-slider';
import * as _ from 'lodash';

import * as tf_backend from '../../../components/tf_backend';
import {
  RunTagCategory,
  RunTagInfo,
  categorizeRunTagCombinations,
} from '../../../components/tf_categorization_utils/categorizationUtils';
import {TfImageLoader} from './tf-image-loader';
import {TagInfo} from '../../../components/tf_utils/utils';
import '../../../components/tf_categorization_utils/tf-tag-filterer';
import '../../../components/tf-dashboard-common/tf-dashboard-layout';
import '../../../components/tf-paginated-view/tf-category-paginated-view';
import '../../../components/tf_runs_selector/tf-runs-selector';

@customElement('tf-image-dashboard')
class TfImageDashboard extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <tf-dashboard-layout>
      <div class="sidebar" slot="sidebar">
        <div class="sidebar-section">
          <div class="line-item">
            <paper-checkbox checked="{{_actualSize}}"
              >Show actual image size</paper-checkbox
            >
          </div>
        </div>
        <div class="sidebar-section">
          <h3 class="tooltip-container">Brightness adjustment</h3>
          <div class="resettable-slider-container">
            <paper-slider
              min="0"
              max="2"
              snaps=""
              pin=""
              step="0.01"
              value="{{_brightnessAdjustment}}"
              immediate-value="{{_brightnessAdjustment}}"
            ></paper-slider>
            <paper-button
              class="x-button"
              on-tap="_resetBrightness"
              disabled="[[_brightnessIsDefault]]"
              >Reset</paper-button
            >
          </div>
        </div>
        <div class="sidebar-section">
          <h3 class="tooltip-container">Contrast adjustment</h3>
          <div class="resettable-slider-container">
            <paper-slider
              min="0"
              max="500"
              snaps=""
              pin=""
              step="1"
              value="{{_contrastPercentage}}"
              immediate-value="{{_contrastPercentage}}"
            ></paper-slider>
            <paper-button
              class="x-button"
              on-tap="_resetContrast"
              disabled="[[_contrastIsDefault]]"
              >Reset</paper-button
            >
          </div>
        </div>
        <div class="sidebar-section">
          <tf-runs-selector
            id="runs-selector"
            selected-runs="{{_selectedRuns}}"
          ></tf-runs-selector>
        </div>
      </div>
      <div class="center" slot="center">
        <template is="dom-if" if="[[_dataNotFound]]">
          <div class="no-data-warning">
            <h3>No image data was found.</h3>
            <p>Probable causes:</p>
            <ul>
              <li>You haven’t written any image data to your event files.</li>
              <li>TensorBoard can’t find your event files.</li>
            </ul>

            <p>
              If you’re new to using TensorBoard, and want to find out how to
              add data and set up your event files, check out the
              <a
                href="https://github.com/tensorflow/tensorboard/blob/master/README.md"
                >README</a
              >
              and perhaps the
              <a
                href="https://www.tensorflow.org/get_started/summaries_and_tensorboard"
                >TensorBoard tutorial</a
              >.
            </p>

            <p>
              If you think TensorBoard is configured properly, please see
              <a
                href="https://github.com/tensorflow/tensorboard/blob/master/README.md#my-tensorboard-isnt-showing-any-data-whats-wrong"
                >the section of the README devoted to missing data problems</a
              >
              and consider filing an issue on GitHub.
            </p>
          </div>
        </template>
        <template is="dom-if" if="[[!_dataNotFound]]">
          <tf-tag-filterer tag-filter="{{_tagFilter}}"></tf-tag-filterer>
          <template is="dom-repeat" items="[[_categories]]" as="category">
            <tf-category-paginated-view
              category="[[category]]"
              initial-opened="[[_shouldOpen(index)]]"
            >
              <template>
                <tf-image-loader
                  active="[[active]]"
                  run="[[item.run]]"
                  tag="[[item.tag]]"
                  sample="[[item.sample]]"
                  of-samples="[[item.ofSamples]]"
                  tag-metadata="[[_tagMetadata(_runToTagInfo, item.run, item.tag)]]"
                  request-manager="[[_requestManager]]"
                  actual-size="[[_actualSize]]"
                  brightness-adjustment="[[_brightnessAdjustment]]"
                  contrast-percentage="[[_contrastPercentage]]"
                ></tf-image-loader>
              </template>
            </tf-category-paginated-view>
          </template>
        </template>
      </div>
    </tf-dashboard-layout>
    <style include="dashboard-style"></style>
    <style>
      .resettable-slider-container {
        display: flex;
      }
      .resettable-slider-container paper-slider {
        flex-grow: 1;
      }
      .resettable-slider-container paper-button {
        flex-grow: 0;
      }
      .resettable-slider-container paper-button[disabled] {
        background-color: unset;
      }
      .x-button {
        font-size: 13px;
        background-color: var(--tb-ui-light-accent);
        color: var(--tb-ui-dark-accent);
      }
      h3 {
        color: var(--paper-grey-800);
        margin: 0;
        font-weight: normal;
        font-size: 14px;
        margin-bottom: 5px;
        display: block;
        pointer-events: none;
      }
      .no-data-warning {
        max-width: 540px;
        margin: 80px auto 0 auto;
      }
      paper-slider {
        --paper-slider-active-color: var(--tb-orange-strong);
        --paper-slider-knob-color: var(--tb-orange-strong);
        --paper-slider-knob-start-border-color: var(--tb-orange-strong);
        --paper-slider-knob-start-color: var(--tb-orange-strong);
        --paper-slider-markers-color: var(--tb-orange-strong);
        --paper-slider-pin-color: var(--tb-orange-strong);
        --paper-slider-pin-start-color: var(--tb-orange-strong);
      }
    </style>
  `;
  @property({type: Array})
  _selectedRuns: string[] = [];
  @property({type: Object})
  _runToTagInfo: RunTagInfo | null = null;
  @property({type: Boolean})
  _dataNotFound: boolean = true;
  @property({type: Boolean})
  _actualSize!: boolean;
  @property({
    type: Number,
    readOnly: true,
  })
  _defaultBrightnessAdjustment: number = 1;
  @property({
    type: Number,
    readOnly: true,
  })
  _defaultContrastPercentage: number = 100;
  @property({
    type: Number,
  })
  _brightnessAdjustment: number = 1;
  @property({
    type: Number,
  })
  _contrastPercentage: number = 100;
  @property({type: String})
  _tagFilter: string = '';

  // Categories must only be computed after _dataNotFound is found to be
  // true and then polymer DOM templating responds to that finding. We
  // thus use this property to guard when categories are computed.
  @property({type: Boolean})
  _categoriesDomReady: boolean = false;
  @property({
    type: Object,
  })
  _requestManager = new tf_backend.RequestManager();
  ready() {
    this.reload();
  }
  reload() {
    this._fetchTags().then(() => {
      this._reloadImages();
    });
  }
  _fetchTags() {
    const url = tf_backend.getRouter().pluginRoute('images', '/tags');
    return this._requestManager.request(url).then((runToTagInfo) => {
      if (_.isEqual(runToTagInfo, this._runToTagInfo)) {
        // No need to update anything if there are no changes.
        return;
      }
      const runToTag = _.mapValues(runToTagInfo, (x) => Object.keys(x));
      const tags = tf_backend.getTags(runToTag);
      this.set('_dataNotFound', tags.length === 0);
      this.set('_runToTagInfo', runToTagInfo);
      this.async(() => {
        // See the comment above `_categoriesDomReady`.
        this.set('_categoriesDomReady', true);
      });
    });
  }
  _reloadImages() {
    this.root!.querySelectorAll('tf-image-loader').forEach(
      (image: TfImageLoader) => {
        image.reload();
      }
    );
  }
  _shouldOpen(index: number) {
    return index <= 2;
  }
  _resetBrightness() {
    this._brightnessAdjustment = this._defaultBrightnessAdjustment;
  }
  _resetContrast() {
    this._contrastPercentage = this._defaultContrastPercentage;
  }
  @computed('_brightnessAdjustment')
  get _brightnessIsDefault() {
    return this._brightnessAdjustment === this._defaultBrightnessAdjustment;
  }
  @computed('_contrastPercentage')
  get _contrastIsDefault() {
    return this._contrastPercentage === this._defaultContrastPercentage;
  }
  @computed(
    '_runToTagInfo',
    '_selectedRuns',
    '_tagFilter',
    '_categoriesDomReady'
  )
  get _categories() {
    if (!this._runToTagInfo) return [];

    const runToTag = _.mapValues(this._runToTagInfo, (x) => Object.keys(x));
    const baseCategories = categorizeRunTagCombinations(
      runToTag,
      this._selectedRuns,
      this._tagFilter
    );
    function explodeItem(item: {tag: string; run: string}) {
      const samples = this._runToTagInfo[item.run][item.tag].samples;
      return _.range(samples).map((i) =>
        Object.assign({}, item, {
          sample: i,
          ofSamples: samples,
        })
      );
    }
    const withSamples = baseCategories
      .filter((category: RunTagCategory) => category.items.length)
      .map((category: RunTagCategory) =>
        Object.assign({}, category, {
          items: [].concat.apply([], category.items.map(explodeItem)),
        })
      );
    return withSamples;
  }
  _tagMetadata(
    runToTagInfo: RunTagInfo | null,
    run: string,
    tag: string
  ): TagInfo | null {
    if (!runToTagInfo) return null;
    return runToTagInfo[run][tag];
  }
}
