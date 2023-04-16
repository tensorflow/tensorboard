/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import './styles';

export interface InputChangedListener {
  (value: string, inRegexMode: boolean): void;
}

@customElement('vz-projector-input')
class ProjectorInput extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style include="vz-projector-styles"></style>
    <style>
      .info {
        color: rgba(0, 0, 0, 0.5);
        display: block;
        font-size: 11px;
      }

      .toggle {
        font-size: 12px;
        height: 21px;
        margin: 0px;
        min-width: 0px;
        min-height: 0px;
        padding: 0;
        width: 17px;
      }

      .toggle[active] {
        background-color: #880e4f;
        color: white;
      }

      .suffix {
        display: flex;
        flex-direction: row;
      }
    </style>

    <paper-input label="[[label]]">
      <div class="slash" prefix slot="prefix">/</div>
      <div class="suffix" suffix slot="suffix">
        <div class="slash">/</div>
        <paper-button id="regex" toggles class="toggle">.*</paper-button>
      </div>
    </paper-input>
    <paper-tooltip
      for="regex"
      position="bottom"
      animation-delay="0"
      fit-to-visible-bounds
    >
      Enable/disable regex mode.
    </paper-tooltip>
    <span class="info">[[message]]</span>
  `;
  @property({type: String})
  label: string;

  /** Message that will be displayed at the bottom of the input control. */
  @property({type: String})
  message: string;

  private textChangedListeners: InputChangedListener[];
  private paperInput: HTMLInputElement;
  private inRegexModeButton: HTMLButtonElement;
  private inRegexMode: boolean;

  /** Subscribe to be called everytime the input changes. */
  registerInputChangedListener(listener: InputChangedListener) {
    this.textChangedListeners.push(listener);
  }
  ready() {
    super.ready();
    this.inRegexMode = false;
    this.textChangedListeners = [];
    this.paperInput = this.$$('paper-input') as HTMLInputElement;
    this.inRegexModeButton = this.$$('paper-button') as HTMLButtonElement;
    this.paperInput.setAttribute('error-message', 'Invalid regex');
    this.paperInput.addEventListener('input', () => {
      this.onTextChanged();
    });
    this.paperInput.addEventListener('keydown', (event) => {
      event.stopPropagation();
    });
    this.inRegexModeButton.addEventListener('click', () =>
      this.onClickRegexModeButton()
    );
    this.updateRegexModeDisplaySlashes();
    this.onTextChanged();
  }
  private onClickRegexModeButton() {
    this.inRegexMode = (this.inRegexModeButton as any).active;
    this.updateRegexModeDisplaySlashes();
    this.onTextChanged();
  }
  private notifyInputChanged(value: string, inRegexMode: boolean) {
    this.textChangedListeners.forEach((l) => l(value, inRegexMode));
  }
  private onTextChanged() {
    try {
      if (this.inRegexMode) {
        new RegExp(this.paperInput.value);
      }
    } catch (invalidRegexException) {
      this.paperInput.setAttribute('invalid', 'true');
      this.message = '';
      this.notifyInputChanged(null!, true);
      return;
    }
    this.paperInput.removeAttribute('invalid');
    this.notifyInputChanged(this.paperInput.value, this.inRegexMode);
  }
  private updateRegexModeDisplaySlashes() {
    const slashes = this.paperInput.querySelectorAll('.slash');
    const display = this.inRegexMode ? '' : 'none';
    for (let i = 0; i < slashes.length; i++) {
      (slashes[i] as HTMLDivElement).style.display = display;
    }
  }
  getValue(): string {
    return this.paperInput.value;
  }
  getInRegexMode(): boolean {
    return this.inRegexMode;
  }
  setValue(value: string, inRegexMode: boolean) {
    (this.inRegexModeButton as any).active = inRegexMode;
    this.paperInput.value = value;
    this.onClickRegexModeButton();
  }
}
