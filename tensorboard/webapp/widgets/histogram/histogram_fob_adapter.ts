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

import {FobCardAdapter} from '../linked_time_fob/types';
import {TemporalScale} from './histogram_component';

export class HistogramFobAdapter implements FobCardAdapter {
  scale: TemporalScale;
  steps: number[];
  containerRect: DOMRect;
  upperBound: number;
  lowerBound: number;
  constructor(scale: TemporalScale, steps: number[], containerRect: DOMRect) {
    this.scale = scale;
    this.steps = steps;
    this.containerRect = containerRect;
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

  getStepHigherThanMousePosition(position: number): number {
    let stepIndex = 0;
    while (
      position - this.containerRect.top > this.scale(this.steps[stepIndex]) &&
      this.steps[stepIndex] < this.upperBound
    ) {
      stepIndex++;
    }
    return this.steps[stepIndex];
  }

  getStepLowerThanMousePosition(position: number): number {
    let stepIndex = this.steps.length - 1;
    while (
      position - this.containerRect.top < this.scale(this.steps[stepIndex]) &&
      this.steps[stepIndex] > this.lowerBound
    ) {
      stepIndex--;
    }
    return this.steps[stepIndex];
  }
}
