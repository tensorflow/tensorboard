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
import {
  AxisDirection,
  CardFobAdapter,
  LinkedTime,
} from '../card_fob/card_fob_types';
import {TemporalScale} from './histogram_component';

@Component({
  selector: 'histogram-card-fob-controller',
  template: `
    <card-fob-controller
      [axisDirection]="axisDirection"
      [linkedTime]="linkedTime"
      [cardAdapter]="this"
      (onSelectTimeChanged)="onSelectTimeChanged.emit($event)"
      (onSelectTimeToggle)="onSelectTimeToggle.emit()"
    ></card-fob-controller>
  `,
})
export class HistogramCardFobController implements CardFobAdapter {
  @Input() steps!: number[];
  @Input() linkedTime!: LinkedTime;
  @Input() temporalScale!: TemporalScale;
  @Output() onSelectTimeChanged = new EventEmitter<LinkedTime>();
  @Output() onSelectTimeToggle = new EventEmitter();

  readonly axisDirection = AxisDirection.VERTICAL;

  getHighestStep(): number {
    return this.steps[this.steps.length - 1];
  }
  getLowestStep(): number {
    return this.steps[0];
  }
  getAxisPositionFromStep(step: number): number {
    return this.temporalScale(step);
  }
  getStepHigherThanAxisPosition(position: number): number {
    let stepIndex = 0;
    while (
      position > this.temporalScale(this.steps[stepIndex]) &&
      stepIndex < this.steps.length - 1
    ) {
      stepIndex++;
    }
    return this.steps[stepIndex];
  }
  getStepLowerThanAxisPosition(position: number): number {
    let stepIndex = this.steps.length - 1;
    while (
      position < this.temporalScale(this.steps[stepIndex]) &&
      stepIndex > 0
    ) {
      stepIndex--;
    }
    return this.steps[stepIndex];
  }
}
