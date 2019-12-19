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
import {PolymerElement, html} from '@polymer/polymer';
import {LegacyElementMixin} from '@polymer/polymer/lib/legacy/legacy-element-mixin';
import {customElement, property, computed} from '@polymer/decorators';
import '@polymer/paper-button';
import {PaperDialogElement} from '@polymer/paper-dialog';
import '@polymer/paper-styles';
import './tf-wbr-string';
import {
  getObjectInitializer,
  getStringInitializer,
  getObjectObserver,
  getStringObserver,
} from '../tf_storage/storage';
import {runsColorScale} from '../tf_color_scale/colorScale';
import {TfMultiCheckbox} from '../tf_dashboard_common/tf-multi-checkbox';
import {ListenKey, runsStore, environmentStore} from '../tf_backend';

@customElement('tf-runs-selector')
class TfRunsSelector extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <paper-dialog with-backdrop="" id="data-location-dialog">
      <h2>Data Location</h2>
      <tf-wbr-string value="[[dataLocation]]"> </tf-wbr-string
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
        <tf-wbr-string value="[[_clippedDataLocation]]"
          ><!--
          We use HTML comments to remove spaces before the ellipsis.
        --><template
            is="dom-if"
            if="[[_shouldShowExpandDataLocationButton(dataLocation, _dataLocationClipLength)]]"
            ><!--
          --><a href="" on-click="_openDataLocationDialog">…</a>
          </template>
        </tf-wbr-string>
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
        width: 100%;
        flex-grow: 0;
        flex-shrink: 0;
        padding-right: 16px;
        box-sizing: border-box;
        color: var(--paper-grey-800);
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
        color: var(--paper-grey-800);
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

  private _storeRunSelectionState = getObjectObserver('runSelectionState', {
    defaultValue: {},
  });

  private _regexObserver = getStringObserver('regexInput', {
    defaultValue: '',
  });

  @property({
    type: Object,
    observer: '_storeRunSelectionState',
  })
  runSelectionState = getObjectInitializer('runSelectionState', {
    defaultValue: {},
  })();

  @property({
    type: String,
    observer: '_regexObserver',
  })
  regexInput: string = getStringInitializer('regexInput', {
    defaultValue: '',
  })();

  @property({
    type: Array,
    notify: true,
  })
  selectedRuns: unknown;

  @property({type: Array})
  runs: unknown;

  @property({
    type: String,
    notify: true,
  })
  dataLocation: string = '';

  @property({
    type: Number,
    readOnly: true,
  })
  _dataLocationClipLength: number = 250;

  @property({
    type: Object,
  })
  coloring = {
    getColor: runsColorScale,
  };

  private _runStoreListener: ListenKey | null = null;
  private _envStoreListener: ListenKey | null = null;

  attached() {
    this._runStoreListener = runsStore.addListener(() => {
      this.set('runs', runsStore.getRuns());
    });
    this.set('runs', runsStore.getRuns());

    this._envStoreListener = environmentStore.addListener(() => {
      this.set('dataLocation', environmentStore.getDataLocation());
    });
    this.set('dataLocation', environmentStore.getDataLocation());
  }

  detached() {
    if (this._runStoreListener) {
      runsStore.removeListenerByKey(this._runStoreListener);
    }

    if (this._envStoreListener) {
      environmentStore.removeListenerByKey(this._envStoreListener);
    }
  }

  _toggleAll() {
    ((this.$.multiCheckbox as unknown) as TfMultiCheckbox).toggleAll();
  }

  @computed('dataLocation', '_dataLocationClipLength')
  get _clippedDataLocation() {
    const {
      dataLocation,
      _dataLocationClipLength: dataLocationClipLength,
    } = this;
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
  _openDataLocationDialog(event: MouseEvent) {
    event.preventDefault();
    const dialog = this.$$('#data-location-dialog') as PaperDialogElement;
    (dialog as any).open();
  }

  _shouldShowExpandDataLocationButton(
    dataLocation: string,
    _dataLocationClipLength: number
  ) {
    return dataLocation && dataLocation.length > _dataLocationClipLength;
  }
}
