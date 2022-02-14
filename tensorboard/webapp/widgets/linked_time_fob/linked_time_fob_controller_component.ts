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
  HORIZONTAL = 0,
  VERTICAL,
}

export enum Fobs {
  NONE = 0,
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

  private currentDraggingFob: Fobs = Fobs.NONE;

  // Helper function to check enum in template.
  public FobsType(): typeof Fobs {
    return Fobs;
  }

  getCssTranslatePx(step: number): string {
    if (this.axisDirection == AxisDirection.VERTICAL) {
      return `translate(0px, ${this.temporalScale(step)}px)`;
    }

    return `translate(${this.temporalScale(step)}px, 0px)`;
  }

  startDrag(fob: Fobs) {
    this.currentDraggingFob = fob;
  }

  stopDrag() {
    this.currentDraggingFob = Fobs.NONE;
  }

  mouseMove(event: MouseEvent) {
    if (this.currentDraggingFob === Fobs.NONE) return;

    let newLinkedTime = this.linkedTime;
    if (this.isDraggingUp(event.clientY, event.movementY)) {
      const stepAbove =
        this.steps[this.getStepIndexAboveMousePosition(event.clientY)];
      if (this.currentDraggingFob == Fobs.START) {
        newLinkedTime.start.step = stepAbove;
      } else {
        newLinkedTime.end!.step = stepAbove;
      }
      this.onSelectTimeChanged.emit(newLinkedTime);
    }

    if (this.isDraggingDown(event.clientY, event.movementY)) {
      const stepBelow =
        this.steps[this.getStepIndexBelowMousePosition(event.clientY)];
      if (this.currentDraggingFob == Fobs.START) {
        newLinkedTime.start.step = stepBelow;
      } else {
        newLinkedTime.end!.step = stepBelow;
      }
      this.onSelectTimeChanged.emit(newLinkedTime);
    }
  }

  isDraggingDown(position: number, movement: number): boolean {
    return (
      position < this.getDraggingFobTop() &&
      movement < 0 &&
      this.getDraggingFobStep() > this.steps[0]
    );
  }

  isDraggingUp(position: number, movement: number): boolean {
    return (
      position > this.getDraggingFobTop() &&
      movement > 0 &&
      this.getDraggingFobStep() < this.steps[this.steps.length - 1]
    );
  }

  getDraggingFobTop(): number {
    return this.currentDraggingFob !== Fobs.END
      ? this.startFobWrapper.nativeElement.getBoundingClientRect().top
      : this.endFobWrapper.nativeElement.getBoundingClientRect().top;
  }

  getDraggingFobStep(): number {
    return this.currentDraggingFob !== Fobs.END
      ? this.linkedTime!.start.step
      : this.linkedTime!.end!.step;
  }

  getStepIndexAboveMousePosition(position: number) {
    let stepIndex = 0;
    while (
      position - this.axisOverlay.nativeElement.getBoundingClientRect().top >
        this.temporalScale(this.steps[stepIndex]) &&
      stepIndex < this.getDraggingFobUpperBound()
    ) {
      stepIndex++;
    }
    return stepIndex;
  }

  getStepIndexBelowMousePosition(position: number) {
    let stepIndex = this.steps.length - 1;
    while (
      position - this.axisOverlay.nativeElement.getBoundingClientRect().top <
        this.temporalScale(this.steps[stepIndex]) &&
      stepIndex > this.getDraggingFobLowerBound()
    ) {
      stepIndex--;
    }
    return stepIndex;
  }

  getDraggingFobUpperBound() {
    if (
      this.currentDraggingFob === Fobs.START &&
      this.linkedTime.end !== null
    ) {
      let index = 0;
      while (this.steps[index] < this.linkedTime.end.step) {
        index++;
      }
      return index;
    }

    return this.steps.length - 1;
  }

  getDraggingFobLowerBound() {
    if (this.currentDraggingFob === Fobs.END) {
      let index = this.steps.length - 1;
      while (this.steps[index] > this.linkedTime.start.step) {
        index--;
      }
      return index;
    }

    return 0;
  }
}
