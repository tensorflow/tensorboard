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

import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AxisDirection} from './linked_time_fob_controller_component';

@Component({
  selector: 'linked-time-fob',
  template: `<span [style.transform]="getCenteringTransform()">{{
    step | number
  }}</span>`,
  styleUrls: ['linked_time_fob_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkedTimeFobComponent {
  @Input()
  step!: number;

  @Input() axisDirection!: AxisDirection;

  getCenteringTransform() {
    if (this.axisDirection === AxisDirection.VERTICAL) {
      return 'translateY(-50%)';
    } else {
      return 'translateX(-50%)';
    }
  }
}
