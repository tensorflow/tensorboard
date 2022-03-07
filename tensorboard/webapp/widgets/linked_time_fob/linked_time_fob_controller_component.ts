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
import {ScaleLinear, ScaleTime} from '../../third_party/d3';

export enum AxisDirection {
  HORIZONTAL,
  VERTICAL,
}

export enum Fob {
  NONE,
  START,
  END,
}

type TemporalScale = ScaleLinear<number, number> | ScaleTime<number, number>;
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
  @Input() axisDirection!: AxisDirection;
  @Input() steps!: number[];
  @Input() linkedTime!: LinkedTime;
  @Input() temporalScale!: TemporalScale;
  @Output() onSelectTimeChanged = new EventEmitter<LinkedTime>();

  private currentDraggingFob: Fob = Fob.NONE;

  private currentDraggingFobUpperBoundIndex: number = -1;
  private currentDraggingFobLowerBoundIndex: number = -1;

  // Helper function to check enum in template.
  public FobType(): typeof Fob {
    return Fob;
  }

  getCssTranslatePx(step: number): string {
    if (this.axisDirection === AxisDirection.VERTICAL) {
      return `translate(0px, ${this.temporalScale(step)}px)`;
    }

    return `translate(${this.temporalScale(step)}px, 0px)`;
  }

  startDrag(fob: Fob) {
    this.currentDraggingFob = fob;
    this.currentDraggingFobUpperBoundIndex =
      this.getDraggingFobUpperBoundIndex();
    this.currentDraggingFobLowerBoundIndex =
      this.getDraggingFobLowerBoundIndex();
  }

  stopDrag() {
    this.currentDraggingFob = Fob.NONE;
    this.currentDraggingFobUpperBoundIndex = -1;
    this.currentDraggingFobLowerBoundIndex = -1;
  }

  mouseMove(event: MouseEvent) {
    if (this.currentDraggingFob === Fob.NONE) return;

    let newLinkedTime = this.linkedTime;
    if (this.isDraggingHigher(event.clientY, event.movementY)) {
      const stepAbove =
        this.steps[this.getStepIndexHigherThanMousePosition(event.clientY)];
      if (this.currentDraggingFob === Fob.END) {
        newLinkedTime.end!.step = stepAbove;
      } else {
        newLinkedTime.start.step = stepAbove;
      }
      this.onSelectTimeChanged.emit(newLinkedTime);
    }

    if (this.isDraggingLower(event.clientY, event.movementY)) {
      const stepBelow =
        this.steps[this.getStepIndexLowerThanMousePosition(event.clientY)];
      if (this.currentDraggingFob === Fob.END) {
        newLinkedTime.end!.step = stepBelow;
      } else {
        newLinkedTime.start.step = stepBelow;
      }
      this.onSelectTimeChanged.emit(newLinkedTime);
    }
  }

  isDraggingLower(position: number, movement: number): boolean {
    return (
      position < this.getDraggingFobTop() &&
      movement < 0 &&
      this.getDraggingFobStep() > this.steps[0]
    );
  }

  isDraggingHigher(position: number, movement: number): boolean {
    return (
      position > this.getDraggingFobTop() &&
      movement > 0 &&
      this.getDraggingFobStep() < this.steps[this.steps.length - 1]
    );
  }

  getDraggingFobTop(): number {
    return this.currentDraggingFob !== Fob.END
      ? this.startFobWrapper.nativeElement.getBoundingClientRect().top
      : this.endFobWrapper.nativeElement.getBoundingClientRect().top;
  }

  getDraggingFobStep(): number {
    return this.currentDraggingFob !== Fob.END
      ? this.linkedTime!.start.step
      : this.linkedTime!.end!.step;
  }

  getStepIndexHigherThanMousePosition(position: number) {
    let stepIndex = 0;
    while (
      position - this.axisOverlay.nativeElement.getBoundingClientRect().top >
        this.temporalScale(this.steps[stepIndex]) &&
      stepIndex < this.currentDraggingFobUpperBoundIndex
    ) {
      stepIndex++;
    }
    return stepIndex;
  }

  getStepIndexLowerThanMousePosition(position: number) {
    let stepIndex = this.steps.length - 1;
    while (
      position - this.axisOverlay.nativeElement.getBoundingClientRect().top <
        this.temporalScale(this.steps[stepIndex]) &&
      stepIndex > this.currentDraggingFobLowerBoundIndex
    ) {
      stepIndex--;
    }
    return stepIndex;
  }

  // Gets the index of largest step that the currentDraggingFob is allowed to go.
  getDraggingFobUpperBoundIndex() {
    // When dragging the START fob while there is an END fob the upper bound is
    // the step before or equal to the endFob's step.
    if (this.currentDraggingFob === Fob.START && this.linkedTime.end !== null) {
      let index = 0;
      while (this.steps[index] < this.linkedTime.end.step) {
        index++;
      }
      return index;
    }

    // In all other cases the largest step is the upper bound.
    return this.steps.length - 1;
  }

  // Gets the index of smallest step that the currentDraggingFob is allowed to go.
  getDraggingFobLowerBoundIndex() {
    // The END fob cannot pass the START fob.
    if (this.currentDraggingFob === Fob.END) {
      let index = this.steps.length - 1;
      while (this.steps[index] > this.linkedTime.start.step) {
        index--;
      }
      return index;
    }

    // No fobs can pass the lowest step in this graph.
    return 0;
  }

  stepTyped(fob: Fob, step: number) {
    let newLinkedTime = {...this.linkedTime};
    if (fob === Fob.START) {
      newLinkedTime.start = {step};
    } else if (fob === Fob.END) {
      newLinkedTime.end = {step};
    }

    if (
      newLinkedTime.end !== null &&
      newLinkedTime.start.step > newLinkedTime.end.step
    ) {
      // The Start Step is now greater than the End Step - flip them.
      newLinkedTime = {
        start: newLinkedTime.end,
        end: newLinkedTime.start,
      };
    }

    this.onSelectTimeChanged.emit(newLinkedTime);
  }
}
