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

import {customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as PolymerDom from '../../../components/polymer/dom';
import '../../../components/polymer/irons_and_papers';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';

@customElement('tf-hparams-scale-and-color-controls')
class TfHparamsScaleAndColorControls extends PolymerElement {
  static readonly template = html`
    <div class="control-panel">
      <!-- 'Color by' drop down menu -->
      <paper-dropdown-menu
        label="Color by"
        id="colorByDropDownMenu"
        horizontal-align="left"
      >
        <paper-listbox
          class="dropdown-content"
          slot="dropdown-content"
          selected="{{options.colorByColumnIndex}}"
          id="colorByListBox"
        >
          <template
            is="dom-repeat"
            items="[[options.columns]]"
            as="column"
            id="colorByColumnTemplate"
          >
            <paper-item disabled="[[!_isNumericColumn(column.index)]]">
              [[column.name]]
            </paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>

      <!-- Columns scales -->
      <div class="columns-container">
        <!-- Scale options for each numeric feature -->
        <template is="dom-repeat" items="{{options.columns}}" as="column">
          <template is="dom-if" if="[[_isNumericColumn(column.index)]]">
            <div class="column">
              <div class="column-title">[[column.name]]</div>
              <div>
                <paper-radio-group
                  class="scale-radio-group"
                  selected="{{column.scale}}"
                >
                  <paper-radio-button name="LINEAR">
                    Linear
                  </paper-radio-button>
                  <!-- The id here is used to access this button in unit
                       tests.-->
                  <paper-radio-button
                    id="logScaleButton_[[column.name]]"
                    name="LOG"
                    disabled="[[!_allowLogScale(column, sessionGroups.*)]]"
                  >
                    Logarithmic
                  </paper-radio-button>
                  <paper-radio-button name="QUANTILE">
                    Quantile
                  </paper-radio-button>
                </paper-radio-group>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    <style>
      :host {
        display: block;
      }
      .control-panel {
        overflow: auto;
      }
      .column {
        flex-grow: 1;
        flex-shrink: 1;
        margin-right: 5px;
        border: solid 1px darkgray;
        padding: 3px;
      }
      .column-title {
        /* Fit every title in one line so the radio boxes align vertically. */
        white-space: nowrap;
        text-decoration: underline;
      }
      .columns-container {
        display: flex;
        flex-direction: row;
      }
      .scale-radio-group paper-radio-button {
        padding: 2px;
        display: block;
      }
      paper-listbox {
        max-height: 15em;
      }
    </style>
  `;
  @property({type: Object})
  configuration: any;
  @property({type: Array})
  sessionGroups: unknown[];
  @property({
    type: Object,
    notify: true,
  })
  options: any = null;
  @observe('configuration.*')
  /* Private methods */
  _configurationChanged() {
    // Populate options.columns with a linear scale for each column (
    // hparam or metric).
    const visibleSchema = this.configuration.visibleSchema;
    const schema = this.configuration.schema;
    const newHParamColumn = (info, index) => {
      return {
        name: tf_hparams_utils.hparamName(info),
        index: index,
        absoluteIndex: tf_hparams_utils.getAbsoluteColumnIndex(
          schema,
          visibleSchema,
          index
        ),
        scale: this._isNumericColumn(index) ? 'LINEAR' : 'NON_NUMERIC',
      };
    };
    const newMetricColumn = (info, index) => {
      const colIndex = index + visibleSchema.hparamInfos.length;
      return {
        scale: 'LINEAR',
        name: tf_hparams_utils.metricName(info),
        index: colIndex,
        absoluteIndex: tf_hparams_utils.getAbsoluteColumnIndex(
          schema,
          visibleSchema,
          colIndex
        ),
      };
    };
    const options = {
      columns: visibleSchema.hparamInfos
        .map(newHParamColumn)
        .concat(visibleSchema.metricInfos.map(newMetricColumn)),
      minColor: '#0000FF',
      maxColor: '#FF0000',
      configuration: this.configuration,
    };
    // Set the colorByColumnIndex property.
    // If we set options.colorByColumnIndex at the same time as we
    // set the other options, Polymer first updates the drop-down menu
    // selected label and only then updates the list box with the new items.
    // As a result the selected label gets an erroneous value (based on
    // the old elements in the list).
    // To overcome this, we first set the selected item to "undefined",
    // call flush to synchronously update the drop-down menu list with
    // the new items, and then reset the selected item index so that
    // Polymer will update the label based on the new list.
    // See also: https://github.com/PolymerElements/paper-dropdown-menu/issues/197#issuecomment-249927371, and http://jsbin.com/fuqoye/edit?html,output.
    this.set('options', options); // set the bound selected item to
    // undefined.
    PolymerDom.flush();
    this.set('options.colorByColumnIndex', this._defaultColorByColumnIndex());
  }
  @observe('sessionGroups.*')
  _unselectDisabledLogScales() {
    if (this.options === null) {
      // We may be called before the options are constructed by
      // _configurationChanged(). In this case we need not worry
      // about selected disabled log scales.
      return;
    }
    this.options.columns.forEach((col) => {
      const colPath = 'options.columns.' + col.index;
      if (!this._allowLogScale(col) && col.scale === 'LOG') {
        // We need to use Polymer paths to make the change observable.
        this.set(colPath + '.scale', 'LINEAR');
      }
    });
  }
  _allowLogScale(column) {
    if (!this._isNumericColumn(column.index) || !this.sessionGroups) {
      return false;
    }
    const [min, max] = tf_hparams_utils.visibleNumericColumnExtent(
      this.configuration.visibleSchema,
      this.sessionGroups,
      column.index
    ) as [unknown, unknown] as [number, number];
    // Log scale is only defined when the domain does not include 0.
    return min > 0 || max < 0;
  }
  // Returns true if the scale is numeric.
  // Used to prevent non-numeric columns from having a scale-selection
  // radio group.
  _isNumericColumn(colIndex) {
    return (
      colIndex >= this.configuration.visibleSchema.hparamInfos.length ||
      this.configuration.visibleSchema.hparamInfos[colIndex].type ===
        'DATA_TYPE_FLOAT64'
    );
  }
  // Use the first metric if there are metrics, or otherwise the first
  // numeric hparam if there are hparams. If there are no numeric columns
  // return undefined.
  _defaultColorByColumnIndex() {
    if (this.configuration.visibleSchema.metricInfos.length > 0) {
      return this.configuration.visibleSchema.hparamInfos.length;
    }
    const i = this.configuration.visibleSchema.hparamInfos.findIndex(
      (info) => info.type === 'DATA_TYPE_FLOAT64'
    );
    if (i !== -1) {
      return i;
    }
    return undefined;
  }
}
