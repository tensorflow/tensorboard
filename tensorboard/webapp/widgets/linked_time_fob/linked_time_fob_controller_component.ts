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
import {LinkedTime, PluginType} from '../../metrics/types';
import {AxisDirection, Fob, FobCardData, ScalarFobData} from './types';

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
    return this.fobCardData.type === PluginType.SCALARS
      ? AxisDirection.HORIZONTAL
      : AxisDirection.VERTICAL;
  }

  getCssTranslatePx(step: number): string {
    if (this.getAxisDirection() === AxisDirection.VERTICAL) {
      return `translate(0px, ${this.translateStepToPixel(step)}px)`;
    }

    return `translate(${this.translateStepToPixel(step)}px, 0px)`;
  }

  translateStepToPixel(step: number) {
    if (this.fobCardData.type === PluginType.SCALARS) {
      return this.fobCardData.scale.forward(
        this.fobCardData.minMax,
        [
          0,
          // axisOverlay does not exist the first time getCssTranslatePx is called
          // so we make a simple approximation. It is immediately corrected before
          // any user will notice.
          this.axisOverlay
            ? this.axisOverlay.nativeElement.getBoundingClientRect().width
            : 10,
        ],
        step
      );
    }

    return this.fobCardData.scale(step);
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
    let position =
      this.getAxisDirection() === AxisDirection.VERTICAL
        ? event.clientY
        : event.clientX;
    let movement =
      this.getAxisDirection() === AxisDirection.VERTICAL
        ? event.movementY
        : event.movementX;
    return (
      position < this.getDraggingFobCenter() &&
      movement < 0 &&
      this.getDraggingFobStep() > this.getMinStep()
    );
  }

  isDraggingHigher(event: MouseEvent): boolean {
    let position =
      this.getAxisDirection() === AxisDirection.VERTICAL
        ? event.clientY
        : event.clientX;
    let movement =
      this.getAxisDirection() === AxisDirection.VERTICAL
        ? event.movementY
        : event.movementX;
    return (
      position > this.getDraggingFobCenter() &&
      movement > 0 &&
      this.getDraggingFobStep() < this.getMaxStep()
    );
  }

  getMaxStep(): number {
    if (this.fobCardData.type === PluginType.SCALARS) {
      let minMax = this.fobCardData.minMax;
      return minMax[0] < minMax[1] ? minMax[1] : minMax[0];
    }

    return this.fobCardData.steps[this.fobCardData.steps.length - 1];
  }

  getMinStep(): number {
    if (this.fobCardData.type === PluginType.SCALARS) {
      let minMax = this.fobCardData.minMax;
      return minMax[0] < minMax[1] ? minMax[0] : minMax[1];
    }

    return this.fobCardData.steps[0];
  }

  getDraggingFobCenter(): number {
    // the fob is centered around the top when in the vertical direction and
    // around the left when in the horizontal.
    if (this.getAxisDirection() === AxisDirection.VERTICAL) {
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
    let position =
      this.getAxisDirection() === AxisDirection.VERTICAL
        ? event.clientY
        : event.clientX;

    if (this.fobCardData.type === PluginType.SCALARS) {
      return this.getScalarStepWithBounds(this.fobCardData, position);
    }

    let stepIndex = 0;
    let steps = this.fobCardData.steps;
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
    let position =
      this.getAxisDirection() === AxisDirection.VERTICAL
        ? event.clientY
        : event.clientX;

    if (this.fobCardData.type === PluginType.SCALARS) {
      return this.getScalarStepWithBounds(this.fobCardData, position);
    }

    let steps = this.fobCardData.steps;
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

  getScalarStepWithBounds(scalarData: ScalarFobData, position: number) {
    let stepAtMouse = Math.round(
      scalarData.scale.reverse(
        scalarData.minMax,
        [
          this.axisOverlay.nativeElement.getBoundingClientRect().left,
          this.axisOverlay.nativeElement.getBoundingClientRect().right,
        ],
        position
      )
    );
    if (stepAtMouse > this.currentDraggingFobUpperBound) {
      return this.currentDraggingFobUpperBound;
    }
    if (stepAtMouse < this.currentDraggingFobLowerBound) {
      return this.currentDraggingFobLowerBound;
    }
    return stepAtMouse;
  }

  // Gets the index of largest step that the currentDraggingFob is allowed to go.
  getDraggingFobUpperBound() {
    // When dragging the START fob while there is an END fob the upper bound is
    // the step before or equal to the endFob's step.
    if (this.currentDraggingFob === Fob.START && this.linkedTime.end !== null) {
      if (this.fobCardData.type === PluginType.SCALARS) {
        return this.linkedTime.end.step;
      }

      let index = 0;
      let steps = this.fobCardData.steps;
      while (steps[index] < this.linkedTime.end.step) {
        index++;
      }
      return steps[index];
    }

    // In all other cases the largest step is the upper bound.
    return this.getMaxStep();
  }

  // Gets the index of smallest step that the currentDraggingFob is allowed to go.
  getDraggingFobLowerBound() {
    // The END fob cannot pass the START fob.
    if (this.currentDraggingFob === Fob.END) {
      if (this.fobCardData.type === PluginType.SCALARS) {
        return this.linkedTime.start.step;
      }

      let steps = this.fobCardData.steps;
      let index = steps.length - 1;
      while (steps[index] > this.linkedTime.start.step) {
        index--;
      }
      return steps[index];
    }

    // No fobs can pass the lowest step in this graph.
    return this.getMinStep();
  }
}
