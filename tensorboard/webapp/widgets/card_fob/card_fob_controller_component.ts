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
import {CardFobComponent} from './card_fob_component';
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
  standalone: false,
  selector: 'card-fob-controller',
  templateUrl: 'card_fob_controller_component.ng.html',
  styleUrls: ['card_fob_controller_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardFobControllerComponent {
  @ViewChild('startFobWrapper') readonly startFobWrapper!: ElementRef;
  @ViewChild('endFobWrapper') readonly endFobWrapper!: ElementRef;
  @ViewChild('prospectiveFobWrapper')
  readonly prospectiveFobWrapper!: ElementRef;
  @Input() axisDirection!: AxisDirection;
  @Input() timeSelection?: TimeSelection;
  @Input() cardFobHelper!: CardFobGetStepFromPositionHelper;
  @Input() startStepAxisPosition!: number;
  @Input() endStepAxisPosition!: number | null;
  @Input() highestStep!: number;
  @Input() lowestStep!: number;
  @Input() showExtendedLine?: Boolean = false;
  @Input() prospectiveStep: number | null = null;
  @Input() prospectiveStepAxisPosition?: number | null = null;
  @Input() allowFobRemoval?: boolean = true;

  @Output() onTimeSelectionChanged =
    new EventEmitter<TimeSelectionWithAffordance>();
  @Output() onTimeSelectionToggled = new EventEmitter();
  @Output() onProspectiveStepChanged = new EventEmitter<number | null>();

  private hasFobMoved: boolean = false;
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

  getCssTranslatePxForProspectiveFob() {
    if (this.prospectiveStep === null) {
      return '';
    }

    if (this.axisDirection === AxisDirection.VERTICAL) {
      return `translate(0px, ${this.prospectiveStepAxisPosition}px)`;
    }
    return `translate(${this.prospectiveStepAxisPosition}px, 0px)`;
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
    if (this.hasFobMoved && this.timeSelection) {
      this.onTimeSelectionChanged.emit({
        timeSelection: this.timeSelection,
        affordance: this.affordance,
      });
    }
    this.affordance = TimeSelectionAffordance.NONE;
    this.hasFobMoved = false;
  }

  isVertical() {
    return this.axisDirection === AxisDirection.VERTICAL;
  }

  private shouldSwapFobs(newStep: number) {
    if (!this.timeSelection || !this.timeSelection.end) {
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
    const newTimeSelection = {...timeSelection};

    if (!this.timeSelection) {
      return newTimeSelection;
    }
    // Single Selection
    if (!this.timeSelection.end) {
      newTimeSelection.start = {step: newStep};
      return newTimeSelection;
    }

    // Range Selection
    // Swapping if fobs pass each other
    if (this.shouldSwapFobs(newStep)) {
      const [oldDraggingFob, newDraggingFob]: Array<keyof TimeSelection> =
        this.currentDraggingFob === Fob.END
          ? ['end', 'start']
          : ['start', 'end'];
      this.currentDraggingFob = TIME_SELECTION_TO_FOB[newDraggingFob];
      newTimeSelection[oldDraggingFob]! = this.timeSelection[newDraggingFob]!;
      newTimeSelection[newDraggingFob]! = {step: newStep};
      return newTimeSelection;
    }

    if (this.currentDraggingFob === Fob.END) {
      newTimeSelection.end = {step: newStep};
      return newTimeSelection;
    }

    newTimeSelection.start = {step: newStep};
    return newTimeSelection;
  }

  getNewStepFromMouseEvent(event: MouseEvent): number | null {
    let newStep: number | null = null;
    const mousePosition = this.getMousePositionFromEvent(event);
    const movement =
      this.axisDirection === AxisDirection.VERTICAL
        ? event.movementY
        : event.movementX;
    if (this.isMovingHigher(mousePosition, movement)) {
      newStep = this.cardFobHelper.getStepHigherThanAxisPosition(mousePosition);
    } else if (this.isMovingLower(mousePosition, movement)) {
      newStep = this.cardFobHelper.getStepLowerThanAxisPosition(mousePosition);
    }

    if (newStep === null) {
      return null;
    }

    return newStep;
  }

  mouseMove(event: MouseEvent) {
    if (this.currentDraggingFob === Fob.NONE) return;

    const newStep = this.getNewStepFromMouseEvent(event);
    if (newStep === null || !this.timeSelection) {
      return;
    }

    const newTimeSelection = this.getNewTimeSelection(
      newStep,
      this.timeSelection
    );
    this.onTimeSelectionChanged.emit({
      timeSelection: newTimeSelection,
    });
    this.hasFobMoved = true;
  }

  mouseOverProspectiveFobArea(event: MouseEvent) {
    if (
      this.timeSelection?.end !== null &&
      this.timeSelection?.end !== undefined
    ) {
      return;
    }

    const newStep = this.getNewStepFromMouseEvent(event);
    if (newStep === null) {
      return;
    }

    this.onProspectiveStepChanged.emit(newStep);
  }

  isMovingLower(position: number, movement: number): boolean {
    if (this.currentDraggingFob === Fob.NONE && this.prospectiveStep === null) {
      return true;
    }

    const currentStep = this.getCurrentFobStep();
    if (currentStep === undefined) {
      return false;
    }

    return (
      position < this.getDraggingFobCenter() &&
      movement < 0 &&
      currentStep > this.lowestStep
    );
  }

  isMovingHigher(position: number, movement: number): boolean {
    if (this.currentDraggingFob === Fob.NONE && this.prospectiveStep === null) {
      return true;
    }

    const currentStep = this.getCurrentFobStep();
    if (currentStep === undefined) {
      return false;
    }

    return (
      position > this.getDraggingFobCenter() &&
      movement > 0 &&
      currentStep < this.highestStep
    );
  }

  getDraggingFobCenter(): number {
    // To calculate the "center" position of a fob we actually must look at the
    // "top" or "left" properties of it. When the axis is in a vertical
    // direction the visible fob's center is actually rendered over the "top" of
    // the element's natural position(using translateY(-50%)). While in the
    // horizontal direction the fob's center is actually rendered over the left
    // of the element's natural position (using translateX(-50%)).
    const currentFob = this.getCurrentFob()?.nativeElement;
    if (!currentFob) {
      return 0;
    }
    let fobTopPosition = currentFob.getBoundingClientRect().top;
    let fobLeftPosition = currentFob.getBoundingClientRect().left;

    if (this.axisDirection === AxisDirection.VERTICAL) {
      return (
        fobTopPosition - this.root.nativeElement.getBoundingClientRect().top
      );
    }
    return (
      fobLeftPosition - this.root.nativeElement.getBoundingClientRect().left
    );
  }

  getCurrentFob(): ElementRef<CardFobComponent & HTMLElement> | null {
    switch (this.currentDraggingFob) {
      case Fob.START:
        return this.startFobWrapper;
      case Fob.END:
        return this.endFobWrapper;
      case Fob.NONE:
        return this.prospectiveFobWrapper;
    }
  }

  getCurrentFobStep(): number | undefined {
    switch (this.currentDraggingFob) {
      case Fob.START:
        return this.timeSelection?.start.step;
      case Fob.END:
        return this.timeSelection?.end?.step;
      case Fob.NONE:
        return this.prospectiveStep ?? undefined;
    }
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
      if (this.timeSelection!.end !== null) {
        this.onFobRemoved(fob);
      } else {
        // TODO(jieweiwu): sets start step to minum.
      }

      return;
    }

    let newTimeSelection = {...this.timeSelection!};
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

  prospectiveFobClicked(event: Event) {
    event.stopPropagation();
    const newTimeSelection = this.getProspectiveTimeSelection();
    if (!newTimeSelection) {
      return;
    }

    this.onTimeSelectionChanged.emit({
      affordance: TimeSelectionAffordance.FOB_ADDED,
      timeSelection: newTimeSelection,
    });
    this.onProspectiveStepChanged.emit(null);
  }

  private getProspectiveTimeSelection() {
    if (!this.prospectiveStep) {
      return;
    }
    if (this.timeSelection) {
      const startStep = Math.min(
        this.timeSelection.start.step,
        this.prospectiveStep
      );
      const endStep = Math.max(
        this.timeSelection.start.step,
        this.prospectiveStep
      );
      return {
        start: {step: startStep},
        end: {step: endStep},
      };
    }

    return {
      start: {step: this.prospectiveStep},
      end: null,
    };
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
        timeSelection: {...this.timeSelection!, end: null},
      });
      return;
    }

    if (this.timeSelection!.end !== null) {
      this.onTimeSelectionChanged.emit({
        affordance: TimeSelectionAffordance.FOB_REMOVED,
        timeSelection: {
          start: this.timeSelection!.end,
          end: null,
        },
      });
      return;
    }

    this.onTimeSelectionToggled.emit();
  }

  onProspectiveAreaMouseLeave() {
    this.onProspectiveStepChanged.emit(null);
  }
}
