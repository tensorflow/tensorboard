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

import {computed, customElement, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import '../polymer/irons_and_papers';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import * as baseStore from '../tf_backend/baseStore';
import {environmentStore} from '../tf_backend/environmentStore';
import {runsStore} from '../tf_backend/runsStore';
import {runsColorScale} from '../tf_color_scale/colorScale';
import '../tf_dashboard_common/tf-multi-checkbox';
import * as storage from '../tf_storage/storage';
import '../tf_wbr_string/tf-wbr-string';

@customElement('tf-runs-selector')
class TfRunsSelector extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <paper-dialog with-backdrop="" id="data-location-dialog">
      <h2>Data Location</h2>
      <tf-wbr-string
        value="[[dataLocation]]"
        delimiter-pattern="[[_dataLocationDelimiterPattern]]"
      >
      </tf-wbr-string
    ></paper-dialog>
    <div id="top-text">
      <h3 id="tooltip-help" class="tooltip-container">Runs</h3>
    </div>
    <tf-multi-checkbox
      id="multiCheckbox"
      names="[[runs]]"
      selection-state="{{runSelectionState}}"
      out-selected="{{selectedRuns}}"
      regex="{{regexInput}}"
      coloring="[[coloring]]"
    ></tf-multi-checkbox>
    <paper-button class="x-button" id="toggle-all" on-tap="_toggleAll">
      Toggle All Runs
    </paper-button>
    <template is="dom-if" if="[[dataLocation]]">
      <div id="data-location">
        <tf-wbr-string
          value="[[_clippedDataLocation]]"
          delimiter-pattern="[[_dataLocationDelimiterPattern]]"
        ></tf-wbr-string
        ><!--
          We use HTML comments to remove spaces before the ellipsis.
        --><template
          is="dom-if"
          if="[[_shouldShowExpandDataLocationButton(dataLocation, _dataLocationClipLength)]]"
          ><!--
          --><a href="" on-click="_openDataLocationDialog">…</a>
        </template>
      </div>
    </template>
    <style>
      :host {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        padding-bottom: 10px;
      }
      #top-text {
        color: var(--tb-secondary-text-color);
        width: 100%;
        flex-grow: 0;
        flex-shrink: 0;
        padding-right: 16px;
        box-sizing: border-box;
      }
      tf-wbr-string {
        overflow-wrap: break-word;
      }
      tf-multi-checkbox {
        display: flex;
        flex-grow: 1;
        flex-shrink: 1;
        overflow: hidden;
      }
      .x-button {
        font-size: 13px;
        background-color: var(--tb-ui-light-accent);
        color: var(--tb-ui-dark-accent);
      }
      #tooltip-help {
        color: var(--tb-secondary-text-color);
        margin: 0;
        font-weight: normal;
        font-size: 14px;
        margin-bottom: 5px;
      }
      paper-button {
        margin-left: 0;
      }
      #data-location {
        color: var(--tb-ui-dark-accent);
        font-size: 13px;
        margin: 5px 0 0 0;
        max-width: 288px;
      }
    </style>
  `;

  @property({
    type: Object,
    observer: '_storeRunSelectionState',
  })
  runSelectionState: object = storage
    .getObjectInitializer('runSelectionState', {
      defaultValue: {},
    })
    .call(this);

  @property({
    type: String,
    observer: '_regexObserver',
  })
  regexInput: string = storage
    .getStringInitializer('regexInput', {
      defaultValue: '',
    })
    .call(this);

  @property({
    type: Array,
    notify: true,
  })
  selectedRuns: unknown[];

  @property({type: Array})
  runs: unknown[];

  @property({
    type: String,
    notify: true,
  })
  dataLocation: string;

  @property({
    type: Number,
  })
  _dataLocationClipLength: number = 250;

  @property({
    type: String,
  })
  readonly _dataLocationDelimiterPattern: string = '[/=_,-]';

  @property({
    type: Object,
  })
  coloring: object = {
    getColor: runsColorScale,
  };

  _runStoreListener: baseStore.ListenKey;

  _envStoreListener: baseStore.ListenKey;

  override attached() {
    this._runStoreListener = runsStore.addListener(() => {
      this.set('runs', runsStore.getRuns());
    });
    this.set('runs', runsStore.getRuns());
    this._envStoreListener = environmentStore.addListener(() => {
      this.set('dataLocation', environmentStore.getDataLocation());
    });
    this.set('dataLocation', environmentStore.getDataLocation());
  }

  override detached() {
    runsStore.removeListenerByKey(this._runStoreListener);
    environmentStore.removeListenerByKey(this._envStoreListener);
  }

  _toggleAll() {
    (this.$.multiCheckbox as any).toggleAll();
  }

  @computed('dataLocation', '_dataLocationClipLength')
  get _clippedDataLocation(): string | undefined {
    var dataLocation = this.dataLocation;
    var dataLocationClipLength = this._dataLocationClipLength;
    if (dataLocation === undefined) {
      // The dataLocation has not been set yet.
      return undefined;
    }
    if (dataLocation.length > dataLocationClipLength) {
      // Clip the dataLocation to avoid blocking the runs selector. Let the
      // user view a more full version of the dataLocation.
      return dataLocation.substring(0, dataLocationClipLength);
    } else {
      return dataLocation;
    }
  }

  _openDataLocationDialog(event) {
    event.preventDefault();
    (this.$$('#data-location-dialog') as any).open();
  }

  _shouldShowExpandDataLocationButton(dataLocation, _dataLocationClipLength) {
    return dataLocation && dataLocation.length > _dataLocationClipLength;
  }

  _storeRunSelectionState = storage.getObjectObserver('runSelectionState', {
    defaultValue: {},
  });

  _regexObserver = storage.getStringObserver('regexInput', {
    defaultValue: '',
  });
}
