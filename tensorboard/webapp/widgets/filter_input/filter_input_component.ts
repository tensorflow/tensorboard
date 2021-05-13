/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Component, Input, ViewChild} from '@angular/core';
import {MatAutocompleteTrigger} from '@angular/material/autocomplete';

/**
 * A text input field intended for filtering items.
 */
@Component({
  selector: 'tb-filter-input',
  template: `
    <input
      type="text"
      autocomplete="off"
      [placeholder]="placeholder"
      [matAutocomplete]="matAutocomplete"
      [matAutocompleteDisabled]="!matAutocomplete"
    />
  `,
  styles: [
    `
      :host {
        display: flex;
      }

      input {
        font: inherit;
        border: none;
        outline: none;
        padding: 0;
        width: 100%;
      }
    `,
  ],
})
export class FilterInputComponent {
  @Input() value!: string;
  @Input() matAutocomplete?: string;
  @Input() placeholder?: string;

  @ViewChild(MatAutocompleteTrigger)
  autocompleteTrigger!: MatAutocompleteTrigger;

  getAutocompleteTrigger(): MatAutocompleteTrigger {
    return this.autocompleteTrigger;
  }
}
