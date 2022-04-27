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
import {AxisDirection, FobCardAdapter, LinkedTime} from './linked_time_types';

export enum Fob {
  NONE,
  START,
  END,
}

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
  @Input() linkedTime!: LinkedTime;
  @Input() cardAdapter!: FobCardAdapter;

  @Output() onSelectTimeToggle = new EventEmitter();
  @Output() onSelectTimeChanged = new EventEmitter<LinkedTime>();

  private currentDraggingFob: Fob = Fob.NONE;

  // Helper function to check enum in template.
  public FobType(): typeof Fob {
    return Fob;
  }

  getCssTranslatePx(step: number): string {
    if (this.axisDirection === AxisDirection.VERTICAL) {
      return `translate(0px, ${this.cardAdapter.getAxisPositionFromStep(
        step
      )}px)`;
    }

    return `translate(${this.cardAdapter.getAxisPositionFromStep(
      step
    )}px, 0px)`;
  }

  startDrag(fob: Fob) {
    this.currentDraggingFob = fob;
  }

  stopDrag() {
    this.currentDraggingFob = Fob.NONE;
  }

  isVertical() {
    return this.axisDirection === AxisDirection.VERTICAL;
  }

  mouseMove(event: MouseEvent) {
    if (this.currentDraggingFob === Fob.NONE) return;

    const newLinkedTime = this.linkedTime;
    let newStep: number | null = null;
    const mousePosition = this.getMousePositionFromEvent(event);
    const movement =
      this.axisDirection === AxisDirection.VERTICAL
        ? event.movementY
        : event.movementX;
    if (this.isDraggingHigher(mousePosition, movement)) {
      newStep = this.cardAdapter.getStepHigherThanAxisPosition(mousePosition);
    } else if (this.isDraggingLower(mousePosition, movement)) {
      newStep = this.cardAdapter.getStepLowerThanAxisPosition(mousePosition);
    }

    if (newStep === null) {
      return;
    }

    if (this.currentDraggingFob === Fob.END) {
      // Do not let the end fob pass the start fob.
      // TODO: add swapping logic here to allow continued dragging
      if (newStep <= this.linkedTime.start.step) {
        newStep = this.linkedTime.start.step;
      }
      newLinkedTime.end!.step = newStep;
    } else {
      // Do not let the start fob pass the end fob.
      // TODO: add swapping logic here to allow continued dragging
      if (this.linkedTime.end && newStep >= this.linkedTime.end.step) {
        newStep = this.linkedTime.end.step;
      }
      newLinkedTime.start.step = newStep;
    }
    this.onSelectTimeChanged.emit(newLinkedTime);
  }

  isDraggingLower(position: number, movement: number): boolean {
    return (
      position < this.getDraggingFobCenter() &&
      movement < 0 &&
      this.getDraggingFobStep() > this.cardAdapter.getLowestStep()
    );
  }

  isDraggingHigher(position: number, movement: number): boolean {
    return (
      position > this.getDraggingFobCenter() &&
      movement > 0 &&
      this.getDraggingFobStep() < this.cardAdapter.getHighestStep()
    );
  }

  getDraggingFobCenter(): number {
    // To calculate the "center" position of a fob we actually must look at the
    // "top" or "left" properties of it. When the axis is in a vertical
    // direction the visible fob's center is actually rendered over the "top" of
    // the element's natural position(using translateY(-50%)). While in the
    // horizontal direction the fob's center is actually rendered over the left
    // of the element's natural position (using translateX(-50%)).
    if (this.axisDirection === AxisDirection.VERTICAL) {
      return (
        (this.currentDraggingFob !== Fob.END
          ? this.startFobWrapper.nativeElement.getBoundingClientRect().top
          : this.endFobWrapper.nativeElement.getBoundingClientRect().top) -
        this.axisOverlay.nativeElement.getBoundingClientRect().top
      );
    } else {
      return (
        (this.currentDraggingFob !== Fob.END
          ? this.startFobWrapper.nativeElement.getBoundingClientRect().left
          : this.endFobWrapper.nativeElement.getBoundingClientRect().left) -
        this.axisOverlay.nativeElement.getBoundingClientRect().left
      );
    }
  }

  getDraggingFobStep(): number {
    return this.currentDraggingFob !== Fob.END
      ? this.linkedTime!.start.step
      : this.linkedTime!.end!.step;
  }

  getMousePositionFromEvent(event: MouseEvent): number {
    return this.axisDirection === AxisDirection.VERTICAL
      ? event.clientY -
          this.axisOverlay.nativeElement.getBoundingClientRect().top
      : event.clientX -
          this.axisOverlay.nativeElement.getBoundingClientRect().left;
  }

  stepTyped(fob: Fob, step: number | null) {
    // Types empty string in fob.
    if (step === null) {
      // Removes fob on range selection and sets step to minimum on single selection.
      if (this.linkedTime.end !== null) {
        this.onFobRemoved(fob);
      } else {
        // TODO(jieweiwu): sets start step to minum.
      }

      return;
    }

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

    // TODO(jieweiwu): Only emits action when linked time is changed.
    this.onSelectTimeChanged.emit(newLinkedTime);
  }

  /**
   * When in range selection(which means we have a start and an end
   * fob) deselecting a fob will leave the remaining fob in place. This means we
   * switch to single selection. If the end fob is deselected we simply remove
   * it. However, if the start fob is deselected we must change the end fob to
   * the start fob before removing the end fob. This gives the effect that the
   * start fob was remove. Lastly when in single selection deselecting the fob
   * toggles the feature entirely.
   */
  onFobRemoved(fob: Fob) {
    if (fob === Fob.END) {
      this.onSelectTimeChanged.emit({...this.linkedTime, end: null});
      return;
    }

    if (this.linkedTime.end !== null) {
      this.onSelectTimeChanged.emit({start: this.linkedTime.end, end: null});
      return;
    }

    this.onSelectTimeToggle.emit();
  }
}
