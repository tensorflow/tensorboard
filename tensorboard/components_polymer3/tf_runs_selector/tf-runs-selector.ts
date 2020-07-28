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

import { PolymerElement, html } from "@polymer/polymer";
import { customElement, property } from "@polymer/decorators";
import "@polymer/paper-button";
import "@polymer/paper-dialog";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-color-scale/tf-color-scale.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/scrollbar-style.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-multi-checkbox.html";
import { DO_NOT_SUBMIT } from "../tf-wbr-string/tf-wbr-string.html";
import "@polymer/paper-button";
import "@polymer/paper-dialog";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-color-scale/tf-color-scale.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/scrollbar-style.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/tf-multi-checkbox.html";
import { DO_NOT_SUBMIT } from "../tf-wbr-string/tf-wbr-string.html";
@customElement("tf-runs-selector")
class TfRunsSelector extends PolymerElement {
    static readonly template = html `<paper-dialog with-backdrop="" id="data-location-dialog">
      <h2>Data Location</h2>
      <tf-wbr-string value="[[dataLocation]]" delimiter-pattern="[[_dataLocationDelimiterPattern]]">
    </tf-wbr-string></paper-dialog>
    <div id="top-text">
      <h3 id="tooltip-help" class="tooltip-container">Runs</h3>
    </div>
    <tf-multi-checkbox id="multiCheckbox" names="[[runs]]" selection-state="{{runSelectionState}}" out-selected="{{selectedRuns}}" regex="{{regexInput}}" coloring="[[coloring]]"></tf-multi-checkbox>
    <paper-button class="x-button" id="toggle-all" on-tap="_toggleAll">
      Toggle All Runs
    </paper-button>
    <template is="dom-if" if="[[dataLocation]]">
      <div id="data-location">
        <tf-wbr-string value="[[_clippedDataLocation]]" delimiter-pattern="[[_dataLocationDelimiterPattern]]"></tf-wbr-string><!--
          We use HTML comments to remove spaces before the ellipsis.
        --><template is="dom-if" if="[[_shouldShowExpandDataLocationButton(dataLocation, _dataLocationClipLength)]]"><!--
          --><a href="" on-click="_openDataLocationDialog">\u2026</a>
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
    </style>`;
    @property({
        type: Object,
        observer: '_storeRunSelectionState'
    })
    runSelectionState: object = tf_storage.getObjectInitializer('runSelectionState', {
        defaultValue: {},
    });
    @property({
        type: String,
        observer: '_regexObserver'
    })
    regexInput: string = tf_storage.getStringInitializer('regexInput', {
        defaultValue: '',
    });
    @property({
        type: Array,
        notify: true
    })
    selectedRuns: unknown[];
    @property({ type: Array })
    runs: unknown[];
    @property({
        type: String,
        notify: true
    })
    dataLocation: string;
    @property({
        type: Number,
        readOnly: true
    })
    _dataLocationClipLength: number = 250;
    @property({
        type: String,
        readOnly: true
    })
    _dataLocationDelimiterPattern: string = '[/=_,-]';
    @property({
        type: Object
    })
    coloring: object = {
        getColor: tf_color_scale.runsColorScale,
    };
    attached() {
        this._runStoreListener = tf_backend.runsStore.addListener(() => {
            this.set('runs', tf_backend.runsStore.getRuns());
        });
        this.set('runs', tf_backend.runsStore.getRuns());
        this._envStoreListener = tf_backend.environmentStore.addListener(() => {
            this.set('dataLocation', tf_backend.environmentStore.getDataLocation());
        });
        this.set('dataLocation', tf_backend.environmentStore.getDataLocation());
    }
    detached() {
        tf_backend.runsStore.removeListenerByKey(this._runStoreListener);
        tf_backend.environmentStore.removeListenerByKey(this._envStoreListener);
    }
    _toggleAll() {
        this.$.multiCheckbox.toggleAll();
    }
    @computed("dataLocation", "_dataLocationClipLength")
    get _clippedDataLocation(): string {
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
        }
        else {
            return dataLocation;
        }
    }
    _openDataLocationDialog(event) {
        event.preventDefault();
        this.$$('#data-location-dialog').open();
    }
    _shouldShowExpandDataLocationButton(dataLocation, _dataLocationClipLength) {
        return dataLocation && dataLocation.length > _dataLocationClipLength;
    }
    _storeRunSelectionState = tf_storage.getObjectObserver('runSelectionState', { defaultValue: {} });
    _regexObserver = tf_storage.getStringObserver('regexInput', {
        defaultValue: '',
    });
}
