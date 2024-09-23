/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  MAT_CHECKBOX_DEFAULT_OPTIONS,
  MatCheckboxDefaultOptions,
} from '@angular/material/checkbox';

@Component({
  standalone: false,
  selector: 'saving-pins-checkbox',
  template: `
    <div class="saving-pins-checkbox">
      <mat-checkbox
        color="primary"
        [checked]="isChecked"
        (click)="onCheckboxToggled.emit()"
        >Enable saving pins (Scalars only)</mat-checkbox
      >
      <mat-icon
        class="info"
        svgIcon="help_outline_24px"
        title="When saving pins are enabled, pinned cards will be visible across multiple experiments."
      ></mat-icon>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['saving_pins_checkbox_component.css'],
  providers: [
    {
      provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
      useValue: {clickAction: 'noop'} as MatCheckboxDefaultOptions,
    },
  ],
})
export class SavingPinsCheckboxComponent {
  @Input() isChecked!: boolean;

  @Output() onCheckboxToggled = new EventEmitter<void>();
}
