import {ElementRef} from '@angular/core';
import {CardFobInterface} from '../linked_time_fob/types';
import {TemporalScale} from './histogram_component';

export class HistogramFobInterface implements CardFobInterface {
  scale: TemporalScale;
  steps: number[];
  upperBound: number;
  lowerBound: number;
  constructor(scale: TemporalScale, steps: number[]) {
    console.log('constructor called');
    this.scale = scale;
    this.steps = steps;
    this.lowerBound = steps[0];
    this.upperBound = steps[steps.length - 1];
  }
  setBounds(overrides: {lowerOverride?: number; higherOverride?: number}) {
    console.log('setting bounds', overrides);
    this.lowerBound = overrides.lowerOverride || this.steps[0];
    this.upperBound =
      overrides.higherOverride || this.steps[this.steps.length - 1];
    console.log('setting bounds', this.upperBound);
  }
  stepToPixel(step: number, domain: [number, number]): number {
    return this.scale(step);
  }
  getStepHigherThanMousePosition(
    position: number,
    axisOverlay: ElementRef
  ): number {
    let stepIndex = 0;
    console.log('getting higher step', this.lowerBound, this.upperBound);
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
    console.log('getting lower step', this.lowerBound, this.upperBound);
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
