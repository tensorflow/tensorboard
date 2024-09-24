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
import {Component, EventEmitter, Input, Output} from '@angular/core';

export interface DropdownOption {
  value: any;
  displayText: string;
  /**
   * Whether the option should appear non-interactable. 'enabled' by default.
   */
  disabled?: boolean;
  /**
   * Optional alias for the displayText.
   */
  displayAlias?: string;
}

/**
 * A generic dropdown with options, similar to <select>.
 */
@Component({
  standalone: false,
  selector: 'tb-dropdown',
  template: `
    <mat-select
      [value]="value"
      [hideSingleSelectionIndicator]="true"
      (selectionChange)="selectionChange.emit($event.value)"
    >
      <mat-option
        *ngFor="let option of options"
        [value]="option.value"
        [disabled]="option.disabled"
      >
        <span
          class="option-content"
          title="{{ option.displayAlias }}: {{ option.displayText }}"
        >
          <b *ngIf="option.displayAlias">{{ option.displayAlias }}:</b>
          {{ option.displayText }}
        </span>
      </mat-option>
    </mat-select>
  `,
  styleUrls: [`dropdown_component.css`],
})
export class DropdownComponent {
  @Input() value = '';
  @Input() options: DropdownOption[] = [];
  @Output() readonly selectionChange = new EventEmitter<any>();
}
