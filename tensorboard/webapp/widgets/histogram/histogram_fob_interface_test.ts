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
import {HistogramFobInterface} from './histogram_fob_interface';
import {ScaleLinear} from '../../third_party/d3';
import {ElementRef} from '@angular/core';

class MockElementRef extends ElementRef {}

fdescribe('histogram fob interface', () => {
  let temporalScaleSpy = jasmine.createSpy();
  function createInterface(customSteps?: number[]) {
    let scale = temporalScaleSpy as unknown as ScaleLinear<number, number>;
    let steps = customSteps || [0, 1, 2, 3];
    temporalScaleSpy.and.callFake((step: number) => {
      return step;
    });
    return new HistogramFobInterface(scale, steps);
  }
  describe('setBounds', () => {
    it('sets bounds properly when given no overrides', () => {
      let fobInterface = createInterface([100, 200, 5000]);
      fobInterface.setBounds({});
      expect(fobInterface.lowerBound).toEqual(100);
      expect(fobInterface.upperBound).toEqual(5000);
    });
    it('sets bounds properly when given lower bound override', () => {
      let fobInterface = createInterface([100, 200, 5000]);
      fobInterface.setBounds({lowerOverride: 150});
      expect(fobInterface.lowerBound).toEqual(150);
      expect(fobInterface.upperBound).toEqual(5000);
    });
    it('sets bounds when given higher bound override', () => {
      let fobInterface = createInterface([100, 200, 5000]);
      fobInterface.setBounds({higherOverride: 250});
      expect(fobInterface.lowerBound).toEqual(100);
      expect(fobInterface.upperBound).toEqual(250);
    });
  });
  describe('getStepHigherThanPosition', () => {
    it('gets step higher when position is not on a step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let elementRef = new MockElementRef(null);
      let stepHigher = fobInterface.getStepHigherThanMousePosition(
        150,
        elementRef
      );
      expect(stepHigher).toEqual(200);
    });
  });
});
