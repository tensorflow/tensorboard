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

import {computed, customElement, observe, property} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import * as _ from 'lodash';
import '../polymer/irons_and_papers';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import './run-color-style';
import './scrollbar-style';

/*
tf-multi-checkbox creates a list of checkboxes that can be used to toggle on or off
a large number of values. Each checkbox displays a name, and may also have an
associated tooltip value. Checkboxes can be highlighted, hidden, and re-ordered.

tf-multi-checkbox assumes that the names may be very long compared to the width
of the checkbox, and the number of names may also be very large, and works to
handle these situations gracefully.
*/
@customElement('tf-multi-checkbox')
class TfMultiCheckbox extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style include="scrollbar-style"></style>
    <style include="run-color-style"></style>

    <paper-input
      id="names-regex"
      no-label-float=""
      label="Write a regex to filter runs"
      value="[[regex]]"
      on-bind-value-changed="_debouncedRegexChange"
    ></paper-input>
    <div id="outer-container" class="scrollbar">
      <template
        is="dom-repeat"
        items="[[namesMatchingRegex]]"
        on-dom-change="synchronizeColors"
      >
        <div class="name-row">
          <div
            class="icon-container checkbox-container vertical-align-container"
          >
            <paper-checkbox
              class="checkbox vertical-align-center"
              id$="checkbox-[[item]]"
              name="[[item]]"
              checked$="[[_isChecked(item, selectionState.*)]]"
              on-change="_checkboxChange"
            ></paper-checkbox>
          </div>
          <div
            class="icon-container isolator-container vertical-align-container"
          >
            <paper-icon-button
              icon="radio-button-unchecked"
              class="isolator vertical-align-center"
              on-tap="_isolateName"
              name="[[item]]"
            ></paper-icon-button>
          </div>
          <div class="item-label-container">
            <span>[[item]]</span>
          </div>
        </div>
      </template>
    </div>
    <style>
      paper-input {
        --paper-input-container-focus-color: var(--tb-orange-strong);
        --paper-input-container-input: {
          font-size: 14px;
        }
        --paper-input-container-label: {
          font-size: 14px;
        }
      }
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      #outer-container {
        contain: content;
        flex-grow: 1;
        flex-shrink: 1;
        overflow-x: hidden;
        overflow-y: auto;
        width: 100%;
        will-change: transform;
        word-wrap: break-word;
      }
      .name-row {
        contain: content;
        padding-top: 5px;
        padding-bottom: 5px;
        display: flex;
        flex-direction: row;
        font-size: 13px;
        word-break: break-all; /* makes wrapping of hyperparam strings better */
      }
      .icon-container {
        flex-grow: 0;
        flex-shrink: 0;
        padding-left: 2px;
      }
      .checkbox {
        padding-left: 2px;
        width: 18px;
        height: 18px;
      }
      .isolator {
        width: 18px;
        height: 18px;
        padding: 0px;
      }
      .isolator-container {
        padding-left: 6px;
        padding-right: 3px;
      }
      .checkbox-container {
        padding-left: 2px;
      }
      .item-label-container {
        padding-left: 5px;
        flex-grow: 1;
        flex-shrink: 1;
        width: 0px; /* hack to get the flex-grow to work properly */
      }
      .tooltip-value-container {
        display: flex;
        justify-content: center;
        flex-grow: 0;
        flex-shrink: 0;
        text-align: right;
        padding-left: 2px;
      }
      .vertical-align-container {
        display: flex;
        justify-content: center;
      }
      .vertical-align-container .vertical-align-center {
        align-self: center;
      }
      .vertical-align-container .vertical-align-top {
        align-self: start;
      }
    </style>
  `;

  @property({
    type: Array,
  })
  // All the values of the checkbox.
  names: string[] = [];

  @property({
    type: Object,
  })
  coloring: {getColor: (name: string) => string} = {
    getColor: () => '',
  };

  @property({
    type: String,
    notify: true,
  })
  // Regex for filtering the names.
  regex: string = '';

  @property({
    type: Array,
    computed: 'computeNamesMatchingRegex(names.*, _regex)',
  })
  // Runs that match the regex.
  namesMatchingRegex: string[];

  @property({
    // If a name is explicitly enabled by user gesture, True, if explicitly
    // disabled, False. If undefined, default value (enable for first k
    // names, disable after).
    type: Object,
    notify: true,
  })
  selectionState: Record<string, boolean> = {};

  @property({
    type: Array,
    notify: true,
    computed: 'computeOutSelected(namesMatchingRegex.*, selectionState.*)',
  })
  // Allows state to persist across regex filtering.
  outSelected: string[];

  @property({
    // When TB first loads, if it has k or fewer names, they are all enabled
    // by default. If there are more, then they are all disabled.
    type: Number,
  })
  maxNamesToEnableByDefault: number = 40;

  _debouncedRegexChangeImpl() {
    var debounced = _.debounce(
      (r) => {
        this.regex = r;
      },
      150,
      {leading: false}
    );
    return function () {
      var r = this.$$('#names-regex').value;
      if (r == '') {
        // If the user cleared the field, they may be done typing, so
        // update more quickly.
        this.async(() => {
          this.regex = r;
        }, 30);
      } else {
        debounced(r);
      }
    };
  }

  // Updating the regex can be slow, because it involves updating styles
  // on a large number of Polymer paper-checkboxes. We don't want to do
  // this while the user is typing, as it may make a bad, laggy UI.
  // So we debounce the updates that come from user typing.
  @property({type: Object})
  _debouncedRegexChange = this._debouncedRegexChangeImpl();

  @computed('regex')
  get _regex(): RegExp | null {
    var regexString = this.regex;
    try {
      return new RegExp(regexString);
    } catch (e) {
      return null;
    }
  }

  @observe('selectionState', 'names')
  _setIsolatorIcon() {
    var selectionMap = this.selectionState;
    var numChecked = _.filter(_.values(selectionMap)).length;
    var buttons = Array.prototype.slice.call(
      this.root?.querySelectorAll('.isolator')
    );
    buttons.forEach(function (b) {
      if (numChecked === 1 && selectionMap[b.name]) {
        b.icon = 'radio-button-checked';
      } else {
        b.icon = 'radio-button-unchecked';
      }
    });
  }

  computeNamesMatchingRegex(__, ___) {
    const regex = this._regex;
    return regex ? this.names.filter((n) => regex.test(n)) : this.names;
  }

  computeOutSelected(__, ___) {
    var selectionState = this.selectionState;
    var num = this.maxNamesToEnableByDefault;
    var allEnabled = this.namesMatchingRegex.length <= num;
    return this.namesMatchingRegex.filter((n) => {
      return selectionState[n] == null ? allEnabled : selectionState[n];
    });
  }

  synchronizeColors(e) {
    this._setIsolatorIcon();
    const checkboxes = this.root?.querySelectorAll('paper-checkbox') ?? [];
    checkboxes.forEach((p: any) => {
      const color = this.coloring.getColor(p.name);
      p.updateStyles({
        '--paper-checkbox-checked-color': color,
        '--paper-checkbox-checked-ink-color': color,
        '--paper-checkbox-unchecked-color': color,
        '--paper-checkbox-unchecked-ink-color': color,
      });
    });
    const buttons = this.root?.querySelectorAll('.isolator') ?? [];
    buttons.forEach((p: any) => {
      const color = this.coloring.getColor(p.name);
      p.style['color'] = color;
    });
    // The updateStyles call fails silently if the browser doesn't have focus,
    // e.g. if TensorBoard was opened into a new tab that isn't visible.
    // So we wait for requestAnimationFrame.
    window.requestAnimationFrame(() => {
      this.updateStyles();
    });
  }

  _isolateName(e) {
    // If user clicks on the label for one name, enable it and disable all other
    // names.
    var name = (e.target as any).name;
    var selectionState = {};
    this.names.forEach(function (n) {
      selectionState[n] = n == name;
    });
    this.selectionState = selectionState;
  }

  _checkboxChange(e) {
    var target = e.target as any;
    const newSelectionState = _.clone(this.selectionState);
    newSelectionState[(target as any).name] = (target as any).checked;
    // n.b. notifyPath won't work because names may have periods.
    this.selectionState = newSelectionState;
  }

  _isChecked(item: string, outSelectedChange): boolean {
    return this.outSelected.indexOf(item) != -1;
  }

  toggleAll() {
    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.
    const anyToggledOn = this.namesMatchingRegex.some((name) =>
      this.outSelected.includes(name)
    );
    const newSelectionState = {};
    this.names.forEach((n) => {
      newSelectionState[n] = !anyToggledOn;
    });
    this.selectionState = newSelectionState;
  }
}
