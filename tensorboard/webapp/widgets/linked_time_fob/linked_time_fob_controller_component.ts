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
  horizontal = 0,
  vertical,
}

export enum DraggingFob {
  none = 0,
  startFob,
  endFob,
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
  @ViewChild('startFobWrapper') private readonly startFobWrapper!: ElementRef;
  @ViewChild('endFobWrapper') private readonly endFobWrapper!: ElementRef;
  @Input() axisDirection!: AxisDirection;
  @Input() steps!: Array<number>;
  @Input() linkedTime!: LinkedTime;
  @Input() temporalScale!: TemporalScale;
  @Output() onSelectTimeChanged = new EventEmitter<LinkedTime>();

  private currentDraggingFob: DraggingFob = DraggingFob.none;

  public DraggingFobType(): typeof DraggingFob {
    return DraggingFob;
  }

  getCssTranslatePx(step: number): string {
    if (this.axisDirection == AxisDirection.vertical) {
      return `translate(0px, ${this.temporalScale(step)}px)`;
    }

    return `translate(${this.temporalScale(step)}px, 0px)`;
  }

  startDrag(fob: DraggingFob) {
    this.currentDraggingFob = fob;
  }

  stopDrag() {
    this.currentDraggingFob = DraggingFob.none;
  }

  mouseMove(event: MouseEvent) {
    if (this.currentDraggingFob === DraggingFob.none) return;

    let newLinkedTime = this.linkedTime;
    if (this.isDraggingUp(event.clientY, event.movementY)) {
      const stepAbove =
        this.steps[this.getStepIndexAboveMousePosition(event.clientY)];
      if (this.currentDraggingFob == DraggingFob.startFob) {
        newLinkedTime.start.step = stepAbove;
      } else {
        newLinkedTime.end!.step = stepAbove;
      }
      this.onSelectTimeChanged.emit(newLinkedTime);
    }

    if (this.isDraggingDown(event.clientY, event.movementY)) {
      const stepBelow =
        this.steps[this.getStepIndexBelowMousePosition(event.clientY)];
      if (this.currentDraggingFob == DraggingFob.startFob) {
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
    return this.currentDraggingFob !== DraggingFob.endFob
      ? this.startFobWrapper.nativeElement.getBoundingClientRect().top
      : this.endFobWrapper.nativeElement.getBoundingClientRect().top;
  }

  getDraggingFobStep(): number {
    return this.currentDraggingFob !== DraggingFob.endFob
      ? this.linkedTime!.start.step
      : this.linkedTime!.end!.step;
  }

  getStepIndexAboveMousePosition(position: number) {
    let stepIndex = 0;
    while (
      position -
        this.axisOverlay.nativeElement.getBoundingClientRect().top -
        this.temporalScale(this.steps[stepIndex]) >
        1 &&
      stepIndex < this.getDraggingFobUpperBound()
    ) {
      stepIndex++;
    }
    return stepIndex;
  }

  getStepIndexBelowMousePosition(position: number) {
    let stepIndex = this.steps.length - 1;
    while (
      position -
        this.axisOverlay.nativeElement.getBoundingClientRect().top -
        this.temporalScale(this.steps[stepIndex]) <
        1 &&
      stepIndex > this.getDraggingFobLowerBound()
    ) {
      stepIndex--;
    }
    return stepIndex;
  }

  getDraggingFobUpperBound() {
    if (
      this.currentDraggingFob === DraggingFob.startFob &&
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
    if (this.currentDraggingFob === DraggingFob.endFob) {
      let index = this.steps.length - 1;
      while (this.steps[index] > this.linkedTime.start.step) {
        index--;
      }
      console.log('getDraggingFobLowerBound');
      console.log('returning index for step: ', this.steps[index]);
      console.log('decreasing until: ', this.linkedTime.start.step);
      return index;
    }

    return 0;
  }
}
