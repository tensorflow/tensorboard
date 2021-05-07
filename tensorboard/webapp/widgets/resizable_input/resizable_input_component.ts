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

import {EventEmitter, Component, Input, Output} from '@angular/core';

@Component({
  selector: 'resizable-input',
  template: `<span
    [class]="{'single-line': singleLine, 'multi-line': !singleLine}"
    contenteditable
    (keydown)="onKeyDown.emit($event)"
    (keyup)="onKeyUp.emit($event)"
    (input)="onInput.emit($event)"
    >{{ value }}</span
  >`,
  styles: [
    `
      .multi-line {
        white-space: pre-line;
      }

      .single-line {
        white-space: nowrap;
      }

      /* <br> is created by browser so angular is unaware of it. */
      .single-line ::ng-deep br {
        display: none;
      }
    `,
  ],
})
export class ResizableInputComponent {
  @Input()
  value!: string;

  @Input()
  singleLine: boolean = true;

  @Output()
  onInput = new EventEmitter<InputEvent>();

  @Output()
  onKeyDown = new EventEmitter<KeyboardEvent>();

  @Output()
  onKeyUp = new EventEmitter<KeyboardEvent>();
}
