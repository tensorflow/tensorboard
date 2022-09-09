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
  OnChanges,
  Output,
  SimpleChange,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  AxisDirection,
  CardFobGetStepFromPositionHelper,
  TimeSelection,
  TimeSelectionAffordance,
  TimeSelectionWithAffordance,
} from './card_fob_types';

export enum Fob {
  NONE,
  START,
  END,
}

const TIME_SELECTION_TO_FOB: Record<keyof TimeSelection, Fob> = {
  start: Fob.START,
  end: Fob.END,
};

@Component({
  selector: 'card-fob-controller',
  templateUrl: 'card_fob_controller_component.ng.html',
  styleUrls: ['card_fob_controller_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFobControllerComponent implements OnChanges {
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

  @Output() onTimeSelectionChanged =
    new EventEmitter<TimeSelectionWithAffordance>();
  @Output() onTimeSelectionToggled = new EventEmitter();

  private currentDraggingFob: Fob = Fob.NONE;
  private affordance: TimeSelectionAffordance = TimeSelectionAffordance.NONE;

  // mouseListener and stopListener are used to keep a reference to the
  // EventListeners used to track mouse movement and mouse up in order to
  // remove those listener when dragging is finished.
  private mouseListener: any = this.mouseMove.bind(this);
  private stopListener: any = this.stopDrag.bind(this);

  constructor(private readonly root: ElementRef) {}

  readonly Fob = Fob;
  readonly TimeSelectionAffordance = TimeSelectionAffordance;

  private hasValueChanged(change?: SimpleChange) {
    return (
      change &&
      change.currentValue !== change.previousValue &&
      !change.isFirstChange()
    );
  }

  private getBoundTimeSelection(
    selectionType: keyof TimeSelection,
    min: number,
    max: number
  ) {
    const selection = this.timeSelection[selectionType];
    if (!selection) return null;

    if (selection.step < min) {
      return min;
    }
    if (selection.step > max) {
      return max;
    }

    return selection.step;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      this.hasValueChanged(changes['lowestStep']) ||
      this.hasValueChanged(changes['highestStep'])
    ) {
      const min: number =
        changes['lowestStep']?.currentValue ?? this.lowestStep;
      const max: number =
        changes['highestStep']?.currentValue ?? this.highestStep;
      const start = this.getBoundTimeSelection('start', min, max);
      const end = this.getBoundTimeSelection('end', min, max);
      const stepHasChanged =
        start !== this.timeSelection.start.step ||
        end !== this.timeSelection.end?.step;
      if (stepHasChanged && min !== max) {
        this.onTimeSelectionChanged.emit({
          timeSelection: {
            start: {step: start!},
            end: end === null ? null : {step: end},
          },
          affordance: TimeSelectionAffordance.SCALAR_CARD_ZOOM,
        });
      }
    }
  }

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

  stopEventPropagation(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  startDrag(fob: Fob, affordance: TimeSelectionAffordance, event: MouseEvent) {
    // When clicking on the fob, we needs to allow MouseEvent propagate to the
    // text span in the fob for editing. The contenteditable attribute also
    // stops the event from propagating which satisfies our need to call
    // stopEventPropagation regardless of affordance.
    if (affordance !== TimeSelectionAffordance.FOB) {
      this.stopEventPropagation(event);
    }
    document.addEventListener('mousemove', this.mouseListener);
    document.addEventListener('mouseup', this.stopListener);
    this.currentDraggingFob = fob;
    this.affordance = affordance;
  }

  stopDrag() {
    document.removeEventListener('mousemove', this.mouseListener);
    document.removeEventListener('mouseup', this.stopListener);
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

  private shouldSwapFobs(newStep: number) {
    if (!this.timeSelection.end) {
      return false;
    }
    if (this.currentDraggingFob === Fob.END) {
      return newStep < this.timeSelection.start.step;
    }
    if (this.currentDraggingFob === Fob.START) {
      return newStep > this.timeSelection.end.step;
    }

    return false;
  }

  private getNewTimeSelection(
    newStep: number,
    timeSelection: TimeSelection
  ): TimeSelection {
    // Single Selection
    if (!this.timeSelection.end) {
      timeSelection.start.step = newStep;
      return timeSelection;
    }

    // Range Selection
    // Swapping if fobs pass each other
    if (this.shouldSwapFobs(newStep)) {
      const [oldDraggingFob, newDraggingFob]: Array<keyof TimeSelection> =
        this.currentDraggingFob === Fob.END
          ? ['end', 'start']
          : ['start', 'end'];
      this.currentDraggingFob = TIME_SELECTION_TO_FOB[newDraggingFob];
      timeSelection[oldDraggingFob]!.step =
        this.timeSelection[newDraggingFob]!.step;
      timeSelection[newDraggingFob]!.step = newStep;
      return timeSelection;
    }

    if (this.currentDraggingFob === Fob.END) {
      timeSelection.end = {step: newStep};
      return timeSelection;
    }

    timeSelection.start.step = newStep;
    return timeSelection;
  }

  mouseMove(event: MouseEvent) {
    if (this.currentDraggingFob === Fob.NONE) return;

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

    const newTimeSelection = this.getNewTimeSelection(
      newStep,
      this.timeSelection
    );
    this.onTimeSelectionChanged.emit({
      timeSelection: newTimeSelection,
    });
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
        affordance: TimeSelectionAffordance.FOB_REMOVED,
        timeSelection: {...this.timeSelection, end: null},
      });
      return;
    }

    if (this.timeSelection.end !== null) {
      this.onTimeSelectionChanged.emit({
        affordance: TimeSelectionAffordance.FOB_REMOVED,
        timeSelection: {
          start: this.timeSelection.end,
          end: null,
        },
      });
      return;
    }

    this.onTimeSelectionToggled.emit();
  }
}
