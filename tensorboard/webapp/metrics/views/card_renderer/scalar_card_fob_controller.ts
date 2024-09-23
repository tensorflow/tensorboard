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
  TimeSelectionAffordance,
} from '../../../widgets/card_fob/card_fob_types';
import {Scale} from '../../../widgets/line_chart_v2/lib/public_types';
import {MinMaxStep} from './scalar_card_types';

@Component({
  standalone: false,
  selector: 'scalar-card-fob-controller',
  template: `
    <card-fob-controller
      [style.pointerEvents]="disableInteraction ? 'none' : 'all'"
      [axisDirection]="axisDirection"
      [timeSelection]="timeSelection"
      [startStepAxisPosition]="getAxisPositionFromStartStep()"
      [endStepAxisPosition]="getAxisPositionFromEndStep()"
      [prospectiveStepAxisPosition]="getAxisPositionFromProspectiveStep()"
      [highestStep]="getHighestStep()"
      [lowestStep]="getLowestStep()"
      [prospectiveStep]="prospectiveStep"
      [cardFobHelper]="cardFobHelper"
      [showExtendedLine]="true"
      [allowFobRemoval]="allowFobRemoval"
      (onProspectiveStepChanged)="onProspectiveStepChanged($event)"
      (onTimeSelectionChanged)="onTimeSelectionChanged.emit($event)"
      (onTimeSelectionToggled)="onTimeSelectionToggled.emit($event)"
    ></card-fob-controller>
  `,
  styleUrls: ['scalar_card_fob_controller.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardFobController {
  @Input() timeSelection?: TimeSelection;
  @Input() scale!: Scale;
  @Input() minMaxHorizontalViewExtend!: [number, number];
  @Input() minMaxStep!: MinMaxStep;
  @Input() axisSize!: number;
  @Input() disableInteraction: boolean = false;
  @Input() allowFobRemoval?: boolean = true;

  @Output() onTimeSelectionChanged = new EventEmitter<{
    timeSelection: TimeSelection;
    affordance?: TimeSelectionAffordance;
  }>();
  @Output() onTimeSelectionToggled = new EventEmitter();

  readonly axisDirection = AxisDirection.HORIZONTAL;
  readonly cardFobHelper: CardFobGetStepFromPositionHelper = {
    getStepHigherThanAxisPosition:
      this.getStepHigherThanAxisPosition.bind(this),
    getStepLowerThanAxisPosition: this.getStepLowerThanAxisPosition.bind(this),
  };
  prospectiveStep: number | null = null;

  getAxisPositionFromStartStep() {
    if (!this.timeSelection) {
      return '';
    }
    return this.scale.forward(
      this.minMaxHorizontalViewExtend,
      [0, this.axisSize],
      this.timeSelection.start.step
    );
  }

  getAxisPositionFromEndStep() {
    if (!this.timeSelection?.end) {
      return null;
    }
    return this.scale.forward(
      this.minMaxHorizontalViewExtend,
      [0, this.axisSize],
      this.timeSelection?.end.step ?? this.minMaxStep.maxStep
    );
  }

  getAxisPositionFromProspectiveStep() {
    if (this.prospectiveStep === null) return null;

    return this.scale.forward(
      this.minMaxHorizontalViewExtend,
      [0, this.axisSize],
      this.prospectiveStep
    );
  }

  onProspectiveStepChanged(step: number | null) {
    this.prospectiveStep = step;
  }

  getHighestStep(): number {
    return this.minMaxStep.maxStep;
  }

  getLowestStep(): number {
    return this.minMaxStep.minStep;
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
      this.scale.reverse(
        this.minMaxHorizontalViewExtend,
        [0, this.axisSize],
        position
      )
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
