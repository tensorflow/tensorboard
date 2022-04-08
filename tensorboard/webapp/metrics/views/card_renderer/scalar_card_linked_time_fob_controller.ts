/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.
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
import {Scale} from '../../../widgets/line_chart_v2/lib/public_types';
import {
  AxisDirection,
  FobCardAdapter,
  LinkedTime,
} from '../../../widgets/linked_time_fob/linked_time_types';

@Component({
  selector: 'scalar-card-linked-time-fob-controller',
  template: `
    <linked-time-fob-controller
      [axisDirection]="axisDirection"
      [linkedTime]="linkedTime"
      [cardAdapter]="this"
      (onSelectTimeChanged)="onSelectTimeChanged.emit($event)"
    ></linked-time-fob-controller>
  `,
})
export class ScalarCardLinkedTimeFobController implements FobCardAdapter {
  @Input() linkedTime!: LinkedTime;
  @Input() scale!: Scale;
  @Input() minMax!: [number, number];
  @Input() axisSize!: number;

  @Output() onSelectTimeChanged = new EventEmitter<LinkedTime>();

  readonly axisDirection = AxisDirection.HORIZONTAL;

  // TODO(jameshollyer): Implements remaining methods for scalar card fob controller.
  getHighestStep(): number {
    return -1;
  }

  getLowestStep(): number {
    return -1;
  }

  getAxisPositionFromStep(step: number): number {
    return this.scale.forward(this.minMax, [0, this.axisSize], step);
  }

  getStepHigherThanAxisPosition(position: number): number {
    return -1;
  }

  getStepLowerThanAxisPosition(position: number): number {
    return -1;
  }
}
