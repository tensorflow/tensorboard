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
} from '../../../widgets/card_fob/card_fob_types';
import {Scale} from '../../../widgets/line_chart_v2/lib/public_types';

@Component({
  selector: 'scalar-card-fob-controller',
  template: `
    <card-fob-controller
      [axisDirection]="axisDirection"
      [timeSelection]="timeSelection"
      [axisPositionFromStartStep]="getAxisPositionFromStartStep()"
      [axisPositionFromEndStep]="getAxisPositionFromEndStep()"
      [highestStep]="getHighestStep()"
      [lowestStep]="getLowestStep()"
      [cardFobHelper]="cardFobHelper"
      [showExtendedLine]="true"
      (onTimeSelectionChanged)="onTimeSelectionChanged.emit($event)"
      (onTimeSelectionToggled)="onTimeSelectionToggled.emit($event)"
    ></card-fob-controller>
  `,
  styleUrls: ['scalar_card_fob_controller.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardFobController {
  @Input() timeSelection!: TimeSelection;
  @Input() scale!: Scale;
  @Input() minMax!: [number, number];
  @Input() axisSize!: number;

  @Output() onTimeSelectionChanged = new EventEmitter<TimeSelection>();
  @Output() onTimeSelectionToggled = new EventEmitter();

  readonly axisDirection = AxisDirection.HORIZONTAL;
  readonly cardFobHelper: CardFobGetStepFromPositionHelper = {
    getStepHigherThanAxisPosition:
      this.getStepHigherThanAxisPosition.bind(this),
    getStepLowerThanAxisPosition: this.getStepLowerThanAxisPosition.bind(this),
  };

  getAxisPositionFromStartStep() {
    return this.scale.forward(
      this.minMax,
      [0, this.axisSize],
      this.timeSelection.start.step
    );
  }

  getAxisPositionFromEndStep() {
    if (this.timeSelection.end === null) {
      return null;
    }
    return this.scale.forward(
      this.minMax,
      [0, this.axisSize],
      this.timeSelection.end.step
    );
  }

  getHighestStep(): number {
    const minMax = this.minMax;
    return minMax[0] < minMax[1] ? minMax[1] : minMax[0];
  }

  getLowestStep(): number {
    const minMax = this.minMax;
    return minMax[0] < minMax[1] ? minMax[0] : minMax[1];
  }

  getStepHigherThanAxisPosition(position: number): number {
    return this.getStepAtMousePostion(position);
  }

  getStepLowerThanAxisPosition(position: number): number {
    return this.getStepAtMousePostion(position);
  }

  // Utility functions.
  /**
   * For the purposes of linked time Scalar charts are considered continuous.
   * This means that we assume there is a step at any point along the chart.
   * getStepHigherThanAxisPosition and getStepLowerThanAxisPosition are actually
   * defined in the FobCardAdapter as getting the step higher than or equal to
   * and less than or equal to, respectivelty. Therefore since we assume there
   * is data at each step we always return the step at the position. This means
   * both getStepHigherThanAxisPosition and getStepLowerThanAxisPosition will
   * always return the same thing.
   */
  getStepAtMousePostion(position: number): number {
    const stepAtMouse = Math.round(
      this.scale.reverse(this.minMax, [0, this.axisSize], position)
    );
    if (stepAtMouse > this.getHighestStep()) {
      return this.getHighestStep();
    }
    if (stepAtMouse < this.getLowestStep()) {
      return this.getLowestStep();
    }
    return stepAtMouse;
  }
}
