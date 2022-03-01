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
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {LinkedTime} from '../../metrics/types';
import {AxisDirection, Fob, FobCardData} from './types';

@Component({
  selector: 'linked-time-fob-controller',
  templateUrl: 'linked_time_fob_controller_component.ng.html',
  styleUrls: ['linked_time_fob_controller_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkedTimeFobControllerComponent {
  @ViewChild('axisOverlay') private readonly axisOverlay!: ElementRef;
  @ViewChild('startFobWrapper') readonly startFobWrapper!: ElementRef;
  @ViewChild('endFobWrapper') readonly endFobWrapper!: ElementRef;

  @Input() linkedTime!: LinkedTime;
  @Input() fobCardData!: FobCardData;

  @Output() onSelectTimeChanged = new EventEmitter<LinkedTime>();

  private currentDraggingFob: Fob = Fob.NONE;

  private currentDraggingFobUpperBound: number = -1;
  private currentDraggingFobLowerBound: number = -1;

  // Helper function to check enum in template.
  public FobType(): typeof Fob {
    return Fob;
  }

  public getAxisDirection() {
    return this.fobCardData.histograms
      ? AxisDirection.VERTICAL
      : AxisDirection.HORIZONTAL;
  }

  getCssTranslatePx(step: number): string {
    if (this.fobCardData.histograms) {
      return `translate(0px, ${this.translateStepToPixel(step)}px)`;
    }

    return `translate(${this.translateStepToPixel(step)}px, 0px)`;
  }

  translateStepToPixel(step: number) {
    if (this.fobCardData.histograms) {
      return this.fobCardData.histograms.scale(step);
    }

    return this.fobCardData.scalars!.scale.forward(
      this.fobCardData.scalars!.minMax,
      [
        0,
        // axisOverlay does not exist the first time getCssTranslatePx is called
        // so we make out best approximation. It is immediately corrected before
        // any user will notice.
        this.axisOverlay
          ? this.axisOverlay.nativeElement.getBoundingClientRect().width
          : 10,
      ],
      step
    );
  }

  startDrag(fob: Fob) {
    this.currentDraggingFob = fob;
    this.currentDraggingFobUpperBound = this.getDraggingFobUpperBound();
    this.currentDraggingFobLowerBound = this.getDraggingFobLowerBound();
  }

  stopDrag() {
    this.currentDraggingFob = Fob.NONE;
    this.currentDraggingFobUpperBound = -1;
    this.currentDraggingFobLowerBound = -1;
  }

  mouseMove(event: MouseEvent) {
    if (this.currentDraggingFob === Fob.NONE) return;

    let newLinkedTime = this.linkedTime;
    if (this.isDraggingHigher(event)) {
      const stepAbove = this.getStepHigherThanMousePosition(event);
      if (this.currentDraggingFob === Fob.END) {
        newLinkedTime.end!.step = stepAbove;
      } else {
        newLinkedTime.start.step = stepAbove;
      }
      this.onSelectTimeChanged.emit(newLinkedTime);
    }

    if (this.isDraggingLower(event)) {
      const stepBelow = this.getStepLowerThanMousePosition(event);
      if (this.currentDraggingFob === Fob.END) {
        newLinkedTime.end!.step = stepBelow;
      } else {
        newLinkedTime.start.step = stepBelow;
      }
      this.onSelectTimeChanged.emit(newLinkedTime);
    }
  }

  isDraggingLower(event: MouseEvent): boolean {
    let position = this.fobCardData.histograms ? event.clientY : event.clientX;
    let movement = this.fobCardData.histograms
      ? event.movementY
      : event.movementX;
    return (
      position < this.getDraggingFobCenter() &&
      movement < 0 &&
      this.getDraggingFobStep() > this.getMinStep()
    );
  }

  isDraggingHigher(event: MouseEvent): boolean {
    let position = this.fobCardData.histograms ? event.clientY : event.clientX;
    let movement = this.fobCardData.histograms
      ? event.movementY
      : event.movementX;
    return (
      position > this.getDraggingFobCenter() &&
      movement > 0 &&
      this.getDraggingFobStep() < this.getMaxStep()
    );
  }

  getMaxStep(): number {
    if (this.fobCardData.scalars) {
      let minMax = this.fobCardData.scalars.minMax;
      return minMax[0] < minMax[1] ? minMax[1] : minMax[0];
    }

    return this.fobCardData.histograms!.steps[
      this.fobCardData.histograms!.steps.length - 1
    ];
  }

  getMinStep(): number {
    if (this.fobCardData.scalars) {
      let minMax = this.fobCardData.scalars.minMax;
      return minMax[0] < minMax[1] ? minMax[0] : minMax[1];
    }

    return this.fobCardData.histograms!.steps[0];
  }

  getDraggingFobCenter(): number {
    // the fob is centered around the top when in the vertical direction and
    // around the left when in the horizontal.
    if (this.fobCardData.histograms) {
      return this.currentDraggingFob !== Fob.END
        ? this.startFobWrapper.nativeElement.getBoundingClientRect().top
        : this.endFobWrapper.nativeElement.getBoundingClientRect().top;
    } else {
      return this.currentDraggingFob !== Fob.END
        ? this.startFobWrapper.nativeElement.getBoundingClientRect().left
        : this.endFobWrapper.nativeElement.getBoundingClientRect().left;
    }
  }

  getDraggingFobStep(): number {
    return this.currentDraggingFob !== Fob.END
      ? this.linkedTime!.start.step
      : this.linkedTime!.end!.step;
  }

  getStepHigherThanMousePosition(event: MouseEvent): number {
    let position = this.fobCardData.histograms ? event.clientY : event.clientX;
    if (this.fobCardData.scalars) {
      let stepAtMouse = Math.round(
        this.fobCardData.scalars.scale.reverse(
          this.fobCardData.scalars.minMax,
          [
            this.axisOverlay.nativeElement.getBoundingClientRect().left,
            this.axisOverlay.nativeElement.getBoundingClientRect().right,
          ],
          position
        )
      );
      if (stepAtMouse <= this.currentDraggingFobUpperBound) {
        return stepAtMouse;
      }
      return this.currentDraggingFobUpperBound;
    }
    let stepIndex = 0;
    let steps = this.fobCardData.histograms!.steps;
    while (
      position - this.axisOverlay.nativeElement.getBoundingClientRect().top >
        this.translateStepToPixel(steps[stepIndex]) &&
      steps[stepIndex] < this.currentDraggingFobUpperBound
    ) {
      stepIndex++;
    }
    return steps[stepIndex];
  }

  getStepLowerThanMousePosition(event: MouseEvent) {
    let position = this.fobCardData.histograms ? event.clientY : event.clientX;
    if (this.fobCardData.scalars) {
      let stepAtMouse = Math.round(
        this.fobCardData.scalars.scale.reverse(
          this.fobCardData.scalars.minMax,
          [
            this.axisOverlay.nativeElement.getBoundingClientRect().left,
            this.axisOverlay.nativeElement.getBoundingClientRect().right,
          ],
          position
        )
      );
      if (stepAtMouse >= this.currentDraggingFobLowerBound) {
        return stepAtMouse;
      }
      return this.currentDraggingFobLowerBound;
    }

    let steps = this.fobCardData.histograms!.steps;
    let stepIndex = steps.length - 1;
    while (
      position - this.axisOverlay.nativeElement.getBoundingClientRect().top <
        this.translateStepToPixel(steps[stepIndex]) &&
      steps[stepIndex] > this.currentDraggingFobLowerBound
    ) {
      stepIndex--;
    }
    return steps[stepIndex];
  }

  // Gets the index of largest step that the currentDraggingFob is allowed to go.
  getDraggingFobUpperBound() {
    // When dragging the START fob while there is an END fob the upper bound is
    // the step before or equal to the endFob's step.
    if (this.currentDraggingFob === Fob.START && this.linkedTime.end !== null) {
      if (this.fobCardData.histograms) {
        let index = 0;
        let steps = this.fobCardData.histograms.steps;
        while (steps[index] < this.linkedTime.end.step) {
          index++;
        }
        return steps[index];
      }

      return this.linkedTime.end.step;
    }

    // In all other cases the largest step is the upper bound.
    if (this.fobCardData.scalars) {
      let minMax = this.fobCardData.scalars.minMax;
      return minMax[0] < minMax[1] ? minMax[1] : minMax[0];
    }

    let steps = this.fobCardData.histograms!.steps;
    return steps[steps.length - 1];
  }

  // Gets the index of smallest step that the currentDraggingFob is allowed to go.
  getDraggingFobLowerBound() {
    // The END fob cannot pass the START fob.
    if (this.currentDraggingFob === Fob.END) {
      if (this.fobCardData.histograms) {
        let steps = this.fobCardData.histograms.steps;
        let index = steps.length - 1;
        while (steps[index] > this.linkedTime.start.step) {
          index--;
        }
        return steps[index];
      }

      return this.linkedTime.start.step;
    }

    // No fobs can pass the lowest step in this graph.
    if (this.fobCardData.scalars) {
      let minMax = this.fobCardData.scalars.minMax;
      return minMax[0] < minMax[1] ? minMax[0] : minMax[1];
    }
    return this.fobCardData.histograms!.steps[0];
  }
}
