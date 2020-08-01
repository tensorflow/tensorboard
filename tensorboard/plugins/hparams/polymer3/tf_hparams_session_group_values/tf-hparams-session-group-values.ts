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
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-utils/tf-hparams-utils.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-table-view/tf-hparams-table-view.html";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-utils/tf-hparams-utils.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-table-view/tf-hparams-table-view.html";
'use strict';
@customElement("tf-hparams-session-group-values")
class TfHparamsSessionGroupValues extends PolymerElement {
    static readonly template = html `<!-- If sessionGroup or visibleSchema are not populated, do not display
         anything.
      -->
    <template is="dom-if" if="[[_propertiesArePopulated(visibleSchema, sessionGroup)]]">
      <!-- Display one row without a "show-metrics" column -->
      <tf-hparams-table-view visible-schema="[[visibleSchema]]" session-groups="[[_singletonSessionGroups(sessionGroup)]]">
      </tf-hparams-table-view>
    </template>
    <template is="dom-if" if="[[!_propertiesArePopulated(visibleSchema, sessionGroup)]]">
      <div>
        Click or hover over a session group to display its values here.
      </div>
    </template>

    <style>
      :host {
        display: block;
      }
    </style>`;
    @property({
        type: Object
    })
    sessionGroup: object = null;
    @property({
        type: Object
    })
    visibleSchema: object = null;
    _propertiesArePopulated(visibleSchema, sessionGroup) {
        return (visibleSchema !== undefined &&
            visibleSchema !== null &&
            sessionGroup !== undefined &&
            sessionGroup !== null);
    }
    _singletonSessionGroups(sessionGroup) {
        if (sessionGroup === null || sessionGroup === undefined) {
            return [];
        }
        return [sessionGroup];
    }
}
