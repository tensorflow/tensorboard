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
import '../polymer/irons_and_papers';
import {LegacyElementMixin} from '../polymer/legacy_element_mixin';
import {PaperInkyFocusBehavior} from '../polymer/paper_inky_focus_behavior';

/**
 * tf-dropdown-trigger is a paper-menu-button trigger that has similar asthetics
 * as paper-input: it has (optional) floating label and name on the button.
 *
 * Example usage:
 *
 *     <paper-menu-button>
 *       <tf-dropdown-trigger
 *         name="[[_getValueLabel(selectedItems.*)]]"
 *         class="dropdown-trigger"
 *         label="[[label]]"
 *         label-float="[[labelFloat]]"
 *         slot="dropdown-trigger"
 *       ></tf-dropdown-trigger>
 *       <div slot="dropdown-content">
 *         conten goes here
 *       </div>
 *     </paper-menu-button>
 */
@customElement('tf-dropdown-trigger')
class TfDropdownTrigger extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <div class="label hidden-label" aria-hidden="">[[label]]</div>
    <div class="content">
      <div class="label real-label">[[label]]</div>
      <span>[[name]]</span>
      <iron-icon icon="arrow-drop-down" aria-hidden=""></iron-icon>
    </div>
    <div class="underline" aria-hidden="">
      <div class="unfocused-line"></div>
      <div class="focused-line"></div>
    </div>
    <paper-ripple id="ripple" aria-hidden=""></paper-ripple>
    <style>
      :host {
        border-radius: 2px;
        display: inline-block;
        overflow: hidden;
        padding: 4px;

        --tf-dropdown-trigger-secondary-color: var(--paper-grey-600);
        --tf-dropdown-trigger-content-height: 24px;
        --tf-dropdown-focus-color: var(--tb-orange-strong);
      }

      .content {
        align-items: center;
        display: flex;
        justify-content: space-between;
        line-height: var(--tf-dropdown-trigger-content-height);
        position: relative;

        @apply --tf-dropdown-trigger-content;
      }

      .label {
        display: none;
        color: var(--tf-dropdown-trigger-secondary-color);
      }

      :host(.label-floats) .hidden-label {
        display: unset;
        line-height: calc(var(--tf-dropdown-trigger-content-height) * 0.833);
        padding-right: var(--tf-dropdown-trigger-content-height);
        visibility: hidden;
      }

      :host(.label-floats) .real-label {
        bottom: 0;
        left: 0;
        position: absolute;
        right: 0;
        transform-origin: top left;
        transition: transform 0.25s;
      }

      :host(.label-shown) .real-label {
        display: unset;
      }

      :host(.label-floating) .real-label {
        transform: translateY(-75%) scale(0.75);
      }

      iron-icon {
        color: var(--tf-dropdown-trigger-secondary-color);
        height: var(--tf-dropdown-trigger-content-height);
        width: var(--tf-dropdown-trigger-content-height);
      }

      :host([focused]) .focused-line {
        transform: none;
        transition: transform 0.25s;

        @apply --paper-transition-easing;
      }

      :host([focused].label-floating) .real-label {
        color: var(--tf-dropdown-focus-color);
        transition: color 0.25s;
      }

      .underline {
        position: relative;
      }

      .unfocused-line {
        padding-top: 1px;
        border-bottom: 1px solid
          var(
            --tf-dropdown-trigger-underline-color,
            var(--secondary-text-color)
          );
      }

      .focused-line {
        border-bottom: 2px solid var(--tf-dropdown-focus-color);
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        transform-origin: center;
        transform: scale3d(0, 1, 1);
      }
    </style>
  `;

  @property({type: String})
  label: string;

  @property({
    type: Boolean,
  })
  labelFloat: boolean = false;

  @property({type: String})
  name: string;

  hostAttributes = {
    role: 'button',
    tabindex: '0',
  };

  mixinBehaviors = [PaperInkyFocusBehavior];

  @observe('label', 'name', 'labelFloat')
  _setHostClass() {
    this.toggleClass('label-floats', this.labelFloat);
    this.toggleClass('label-floating', Boolean(this.name));
    this.toggleClass(
      'label-shown',
      Boolean(this.label) && (!this.name || this.labelFloat)
    );
  }

  /**
   * Overrides PaperRippleBehavior because it was dis-satisfying.
   * Specifically, it was forcing a circular ripple that does not fill the
   * entire container.
   * @override
   */
  _createRipple() {
    return this.$.ripple;
  }
}
