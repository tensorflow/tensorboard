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
import {customElement, property, observe} from '@polymer/decorators';
import '@polymer/iron-icons';
import {PaperCheckboxElement} from '@polymer/paper-checkbox';
import {PaperIconButtonElement} from '@polymer/paper-icon-button';
import '@polymer/paper-input';
import './run-color-style';
import './scrollbar-style';

type SelectionMap = {
  [id: string]: boolean;
};

@customElement('tf-multi-checkbox')
export class TfMultiCheckbox extends LegacyElementMixin(PolymerElement) {
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
              data-name$="[[item]]"
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
              data-name$="[[item]]"
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
        overflow-y: auto;
        overflow-x: hidden;
        width: 100%;
        flex-grow: 1;
        flex-shrink: 1;
        word-wrap: break-word;
      }
      .name-row {
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

  @property({type: Array})
  names: string[] = [];

  @property({type: Object})
  coloring = {
    getColor: (name: string) => '',
  };

  @property({type: String, notify: true})
  regex = '';

  @property({type: Object, computed: '_makeRegex(regex)'})
  _regex!: RegExp;

  @property({
    type: Array,
    computed: 'computeNamesMatchingRegex(names.*, _regex)',
  })
  namesMatchingRegex: string[] = [];

  // If a name is explicitly enabled by user gesture, True, if explicitly
  // disabled, False. If undefined, default value (enable for first k
  // names, disable after).
  @property({type: Object, notify: true})
  selectionState: SelectionMap = {};

  // (Allows state to persist across regex filtering)

  @property({
    type: Array,
    notify: true,
    computed: 'computeOutSelected(namesMatchingRegex.*, selectionState.*)',
  })
  outSelected: string[] = [];

  // When TB first loads, if it has k or fewer names, they are all enabled
  // by default. If there are more, then they are all disabled.
  @property({type: Number})
  maxNamesToEnableByDefault = 40;

  // Updating the regex can be slow, because it involves updating styles
  // on a large number of Polymer paper-checkboxes. We don't want to do
  // this while the user is typing, as it may make a bad, laggy UI.
  // So we debounce the updates that come from user typing.
  @property({type: Object})
  _debouncedRegexChange = function() {
    var r = this.$$('#names-regex').value;
    if (r == '') {
      // If the user cleared the field, they may be done typing, so
      // update more quickly.
      this.async(() => {
        this.regex = r;
      }, 30);
    } else {
      this.debounce(() => {
        this.regex = r;
      }, 150);
    }
  };

  _makeRegex(regexString: string) {
    try {
      return new RegExp(regexString);
    } catch (e) {
      return null;
    }
  }

  @observe('selectionState', 'names')
  _setIsolatorIcon() {
    var selectionMap = this.selectionState;
    var numChecked = Object.values(selectionMap).filter(Boolean).length;
    var buttons = Array.from(
      this.root!.querySelectorAll('.isolator')
    ) as PaperIconButtonElement[];
    buttons.forEach((b) => {
      if (numChecked === 1 && selectionMap[b.dataset.name!]) {
        b.icon = 'radio-button-checked';
      } else {
        b.icon = 'radio-button-unchecked';
      }
    });
  }
  computeNamesMatchingRegex() {
    const regex = this._regex;
    return regex ? this.names.filter((n) => regex.test(n)) : this.names;
  }
  computeOutSelected() {
    var selectionState = this.selectionState;
    var num = this.maxNamesToEnableByDefault;
    var allEnabled = this.namesMatchingRegex.length <= num;
    return this.namesMatchingRegex.filter((n) => {
      return selectionState[n] == null ? allEnabled : selectionState[n];
    });
  }
  synchronizeColors() {
    this._setIsolatorIcon();

    const checkboxes = this.root!.querySelectorAll('paper-checkbox');
    checkboxes.forEach((p: PaperCheckboxElement) => {
      const color = this.coloring.getColor(p.dataset.name!);
      (p as any).updateStyles({
        '--paper-checkbox-checked-color': color,
        '--paper-checkbox-checked-ink-color': color,
        '--paper-checkbox-unchecked-color': color,
        '--paper-checkbox-unchecked-ink-color': color,
      });
    });
    const buttons = this.root!.querySelectorAll('.isolator');
    buttons.forEach((p: PaperIconButtonElement) => {
      const color = this.coloring.getColor(p.dataset.name!);
      p.style['color'] = color;
    });
    // The updateStyles call fails silently if the browser doesn't have focus,
    // e.g. if TensorBoard was opened into a new tab that isn't visible.
    // So we wait for requestAnimationFrame.
    window.requestAnimationFrame(() => {
      this.updateStyles();
    });
  }
  _isolateName(e: CustomEvent) {
    // If user clicks on the label for one name, enable it and disable all other
    // names.
    const name = (e.target as PaperIconButtonElement).dataset.name;
    const selectionState: SelectionMap = {};
    this.names.forEach(function(n) {
      selectionState[n] = n == name;
    });
    this.selectionState = selectionState;
  }
  _checkboxChange(e: CustomEvent) {
    const target = e.target as PaperCheckboxElement;
    const newSelectionState = {...this.selectionState};
    newSelectionState[target.dataset.name!] = Boolean((target as any).checked);
    // n.b. notifyPath won't work because names may have periods.
    this.selectionState = newSelectionState;
  }
  _isChecked(item: string) {
    return this.outSelected.indexOf(item) != -1;
  }
  toggleAll() {
    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.
    const anyToggledOn = this.namesMatchingRegex.some((name) =>
      this.outSelected.includes(name)
    );
    const newSelectionState: SelectionMap = {};
    this.names.forEach((n) => {
      newSelectionState[n] = !anyToggledOn;
    });
    this.selectionState = newSelectionState;
  }
}
