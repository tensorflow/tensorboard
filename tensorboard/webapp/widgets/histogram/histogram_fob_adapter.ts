import {ElementRef} from '@angular/core';
import {FobCardAdapter} from '../linked_time_fob/types';
import {TemporalScale} from './histogram_component';

export class HistogramFobAdapter implements FobCardAdapter {
  scale: TemporalScale;
  steps: number[];
  upperBound: number;
  lowerBound: number;
  constructor(scale: TemporalScale, steps: number[]) {
    this.scale = scale;
    this.steps = steps;
    this.lowerBound = steps[0];
    this.upperBound = steps[steps.length - 1];
  }
  setBounds(overrides: {lowerOverride?: number; higherOverride?: number}) {
    this.lowerBound = overrides.lowerOverride || this.steps[0];
    this.upperBound =
      overrides.higherOverride || this.steps[this.steps.length - 1];
  }
  stepToPixel(step: number, domain: [number, number]): number {
    return this.scale(step);
  }
  getStepHigherThanMousePosition(
    position: number,
    axisOverlay: ElementRef
  ): number {
    let stepIndex = 0;
    while (
      position - axisOverlay.nativeElement.getBoundingClientRect().top >
        this.scale(this.steps[stepIndex]) &&
      this.steps[stepIndex] < this.upperBound
    ) {
      stepIndex++;
    }
    return this.steps[stepIndex];
  }

  getStepLowerThanMousePosition(
    position: number,
    axisOverlay: ElementRef
  ): number {
    let stepIndex = this.steps.length - 1;
    while (
      position - axisOverlay.nativeElement.getBoundingClientRect().top <
        this.scale(this.steps[stepIndex]) &&
      this.steps[stepIndex] > this.lowerBound
    ) {
      stepIndex--;
    }
    return this.steps[stepIndex];
  }
}
