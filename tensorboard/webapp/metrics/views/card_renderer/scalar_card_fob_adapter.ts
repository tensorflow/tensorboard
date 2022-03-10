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

import {ElementRef} from '@angular/core';
import {FobCardAdapter} from '../../../widgets/linked_time_fob/types';
import {Scale} from '../../../widgets/line_chart_v2/lib/public_types';

export class ScalarCardFobAdapter implements FobCardAdapter {
  scale: Scale;
  minMax: [number, number];
  upperBound: number;
  lowerBound: number;
  constructor(scale: Scale, minMax: [number, number]) {
    this.scale = scale;
    this.minMax = minMax;
    this.lowerBound = this.getMinStep();
    this.upperBound = this.getMaxStep();
  }
  setBounds(overrides: {lowerOverride?: number; higherOverride?: number}) {
    this.lowerBound = overrides.lowerOverride || this.getMinStep();
    this.upperBound = overrides.higherOverride || this.getMaxStep();
  }

  stepToPixel(step: number, domain: [number, number]): number {
    return this.scale.forward(this.minMax, domain, step);
  }

  getStepHigherThanMousePosition(
    position: number,
    axisOverlay: ElementRef
  ): number {
    console.log('getstep higher');
    return this.getStepAtMousePostion(position, axisOverlay);
  }

  getStepLowerThanMousePosition(
    position: number,
    axisOverlay: ElementRef
  ): number {
    console.log('getstep lower');
    return this.getStepAtMousePostion(position, axisOverlay);
  }

  getStepAtMousePostion(position: number, axisOverlay: ElementRef): number {
    let stepAtMouse = Math.round(
      this.scale.reverse(
        this.minMax,
        [
          axisOverlay.nativeElement.getBoundingClientRect().left,
          axisOverlay.nativeElement.getBoundingClientRect().right,
        ],
        position
      )
    );
    if (stepAtMouse > this.upperBound) {
      return this.upperBound;
    }
    if (stepAtMouse < this.lowerBound) {
      return this.lowerBound;
    }
    return stepAtMouse;
  }

  getMaxStep(): number {
    let minMax = this.minMax;
    return minMax[0] < minMax[1] ? minMax[1] : minMax[0];
  }

  getMinStep(): number {
    let minMax = this.minMax;
    return minMax[0] < minMax[1] ? minMax[0] : minMax[1];
  }
}
