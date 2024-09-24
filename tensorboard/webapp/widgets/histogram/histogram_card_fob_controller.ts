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

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  AxisDirection,
  CardFobGetStepFromPositionHelper,
  TimeSelection,
} from '../card_fob/card_fob_types';
import {TemporalScale} from './histogram_component';

@Component({
  standalone: false,
  selector: 'histogram-card-fob-controller',
  template: `
    <card-fob-controller
      [axisDirection]="axisDirection"
      [timeSelection]="timeSelection"
      [startStepAxisPosition]="getAxisPositionFromStartStep()"
      [endStepAxisPosition]="getAxisPositionFromEndStep()"
      [highestStep]="getHighestStep()"
      [lowestStep]="getLowestStep()"
      [cardFobHelper]="cardFobHelper"
      (onTimeSelectionChanged)="onTimeSelectionChanged.emit($event)"
      (onTimeSelectionToggled)="onTimeSelectionToggled.emit()"
    ></card-fob-controller>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistogramCardFobController {
  @Input() steps!: number[];
  @Input() timeSelection!: TimeSelection;
  @Input() temporalScale!: TemporalScale;
  @Output() onTimeSelectionChanged = new EventEmitter<TimeSelection>();
  @Output() onTimeSelectionToggled = new EventEmitter();

  readonly axisDirection = AxisDirection.VERTICAL;
  readonly cardFobHelper: CardFobGetStepFromPositionHelper = {
    getStepHigherThanAxisPosition:
      this.getStepHigherThanAxisPosition.bind(this),
    getStepLowerThanAxisPosition: this.getStepLowerThanAxisPosition.bind(this),
  };

  getAxisPositionFromStartStep(): number {
    return this.temporalScale(this.timeSelection.start.step);
  }

  getAxisPositionFromEndStep(): number | null {
    if (this.timeSelection.end === null) {
      return null;
    }
    return this.temporalScale(this.timeSelection.end.step);
  }

  getHighestStep(): number {
    return this.steps[this.steps.length - 1];
  }

  getLowestStep(): number {
    return this.steps[0];
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
