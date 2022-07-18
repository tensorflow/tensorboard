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
import {
  AxisDirection,
  CardFobGetStepFromPositionHelper,
  TimeSelection,
  TimeSelectionAffordance,
} from './card_fob_types';

export enum Fob {
  NONE,
  START,
  END,
}

@Component({
  selector: 'card-fob-controller',
  templateUrl: 'card_fob_controller_component.ng.html',
  styleUrls: ['card_fob_controller_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFobControllerComponent {
  @ViewChild('startFobWrapper') readonly startFobWrapper!: ElementRef;
  @ViewChild('endFobWrapper') readonly endFobWrapper!: ElementRef;
  @Input() axisDirection!: AxisDirection;
  @Input() timeSelection!: TimeSelection;
  @Input() cardFobHelper!: CardFobGetStepFromPositionHelper;
  @Input() startStepAxisPosition!: number;
  @Input() endStepAxisPosition!: number | null;
  @Input() highestStep!: number;
  @Input() lowestStep!: number;
  @Input() showExtendedLine?: Boolean = false;

  @Output() onTimeSelectionChanged = new EventEmitter<{
    timeSelection: TimeSelection;
    affordance?: TimeSelectionAffordance;
  }>();
  @Output() onTimeSelectionToggled = new EventEmitter();

  private currentDraggingFob: Fob = Fob.NONE;
  private affordance: TimeSelectionAffordance = TimeSelectionAffordance.NONE;

  constructor(private readonly root: ElementRef) {}

  readonly Fob = Fob;
  readonly TimeSelectionAffordance = TimeSelectionAffordance;

  getCssTranslatePxForStartFob() {
    if (this.axisDirection === AxisDirection.VERTICAL) {
      return `translate(0px, ${this.startStepAxisPosition}px)`;
    }
    return `translate(${this.startStepAxisPosition}px, 0px)`;
  }

  getCssTranslatePxForEndFob() {
    if (this.endStepAxisPosition === null) {
      return '';
    }
    if (this.axisDirection === AxisDirection.VERTICAL) {
      return `translate(0px, ${this.endStepAxisPosition}px)`;
    }
    return `translate(${this.endStepAxisPosition}px, 0px)`;
  }

  startDrag(fob: Fob, affordance: TimeSelectionAffordance) {
    document.body.addEventListener('mousemove', this.mouseMove.bind(this));
    this.currentDraggingFob = fob;
    this.affordance = affordance;
  }

  stopDrag() {
    // This function might be overtrigged by both mouseup and mouseleave.
    // We only want to fire one onTimeSelectionChanged event.
    if (
      this.currentDraggingFob === Fob.NONE ||
      this.affordance === TimeSelectionAffordance.NONE
    ) {
      return;
    }

    this.currentDraggingFob = Fob.NONE;
    this.onTimeSelectionChanged.emit({
      timeSelection: this.timeSelection,
      affordance: this.affordance,
    });
    this.affordance = TimeSelectionAffordance.NONE;
  }

  isVertical() {
    return this.axisDirection === AxisDirection.VERTICAL;
  }

  mouseMove(event: MouseEvent) {
    if (event.buttons == 0) {
      this.stopDrag();
    }
    if (this.currentDraggingFob === Fob.NONE) return;

    const newTimeSelection = this.timeSelection;
    let newStep: number | null = null;
    const mousePosition = this.getMousePositionFromEvent(event);
    const movement =
      this.axisDirection === AxisDirection.VERTICAL
        ? event.movementY
        : event.movementX;
    if (this.isDraggingHigher(mousePosition, movement)) {
      newStep = this.cardFobHelper.getStepHigherThanAxisPosition(mousePosition);
    } else if (this.isDraggingLower(mousePosition, movement)) {
      newStep = this.cardFobHelper.getStepLowerThanAxisPosition(mousePosition);
    }

    if (newStep === null) {
      return;
    }

    if (this.currentDraggingFob === Fob.END) {
      // Do not let the end fob pass the start fob.
      // TODO: add swapping logic here to allow continued dragging
      if (newStep <= this.timeSelection.start.step) {
        newStep = this.timeSelection.start.step;
      }
      newTimeSelection.end!.step = newStep;
    } else {
      // Do not let the start fob pass the end fob.
      // TODO: add swapping logic here to allow continued dragging
      if (this.timeSelection.end && newStep >= this.timeSelection.end.step) {
        newStep = this.timeSelection.end.step;
      }
      newTimeSelection.start.step = newStep;
    }
    this.onTimeSelectionChanged.emit({timeSelection: newTimeSelection});
  }

  isDraggingLower(position: number, movement: number): boolean {
    return (
      position < this.getDraggingFobCenter() &&
      movement < 0 &&
      this.getDraggingFobStep() > this.lowestStep
    );
  }

  isDraggingHigher(position: number, movement: number): boolean {
    return (
      position > this.getDraggingFobCenter() &&
      movement > 0 &&
      this.getDraggingFobStep() < this.highestStep
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
        this.root.nativeElement.getBoundingClientRect().top
      );
    } else {
      return (
        (this.currentDraggingFob !== Fob.END
          ? this.startFobWrapper.nativeElement.getBoundingClientRect().left
          : this.endFobWrapper.nativeElement.getBoundingClientRect().left) -
        this.root.nativeElement.getBoundingClientRect().left
      );
    }
  }

  getDraggingFobStep(): number {
    return this.currentDraggingFob !== Fob.END
      ? this.timeSelection.start.step
      : this.timeSelection.end!.step;
  }

  getMousePositionFromEvent(event: MouseEvent): number {
    return this.axisDirection === AxisDirection.VERTICAL
      ? event.clientY - this.root.nativeElement.getBoundingClientRect().top
      : event.clientX - this.root.nativeElement.getBoundingClientRect().left;
  }

  stepTyped(fob: Fob, step: number | null) {
    // Types empty string in fob.
    if (step === null) {
      // Removes fob on range selection and sets step to minimum on single selection.
      if (this.timeSelection.end !== null) {
        this.onFobRemoved(fob);
      } else {
        // TODO(jieweiwu): sets start step to minum.
      }

      return;
    }

    let newTimeSelection = {...this.timeSelection};
    if (fob === Fob.START) {
      newTimeSelection.start = {step};
    } else if (fob === Fob.END) {
      newTimeSelection.end = {step};
    }

    if (
      newTimeSelection.end !== null &&
      newTimeSelection.start.step > newTimeSelection.end.step
    ) {
      // The Start Step is now greater than the End Step - flip them.
      newTimeSelection = {
        start: newTimeSelection.end,
        end: newTimeSelection.start,
      };
    }

    // TODO(jieweiwu): Only emits action when time selection is changed.
    this.onTimeSelectionChanged.emit({
      timeSelection: newTimeSelection,
      affordance: TimeSelectionAffordance.FOB_TEXT,
    });
  }

  /**
   * When in range selection(which means we have a start and an end
   * fob) clicking "X" to remove a fob will leave the remaining fob in place.
   * This means we switch to single selection. If the end fob is removed we
   * simply remove it. However, if the start fob is removed we must change the
   * end fob to the start fob before removing the end fob. This gives the effect
   * that the start fob was removed. Lastly when in single selection removing the
   * fob toggles the feature entirely.
   */
  onFobRemoved(fob: Fob) {
    if (fob === Fob.END) {
      this.onTimeSelectionChanged.emit({
        timeSelection: {...this.timeSelection, end: null},
        affordance: TimeSelectionAffordance.FOB_REMOVED,
      });
      return;
    }

    if (this.timeSelection.end !== null) {
      this.onTimeSelectionChanged.emit({
        timeSelection: {
          start: this.timeSelection.end,
          end: null,
        },
        affordance: TimeSelectionAffordance.FOB_REMOVED,
      });
      return;
    }

    this.onTimeSelectionToggled.emit();
  }
}
