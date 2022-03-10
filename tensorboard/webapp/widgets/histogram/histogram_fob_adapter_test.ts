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

import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ScaleLinear} from '../../third_party/d3';
import {HistogramFobAdapter} from './histogram_fob_adapter';

@Component({
  selector: 'axis-overlay',
  template: ` <div></div> `,
})
class AxisOverlayComponent {}

describe('HistogramFobAdapter', () => {
  let temporalScaleSpy: jasmine.Spy;
  beforeEach;
  function createInterface(customSteps?: number[]) {
    temporalScaleSpy = jasmine.createSpy();
    let scale = temporalScaleSpy as unknown as ScaleLinear<number, number>;
    let steps = customSteps || [0, 1, 2, 3];
    temporalScaleSpy.and.callFake((step: number) => {
      return step;
    });
    return new HistogramFobAdapter(scale, steps);
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
    let fixture: ComponentFixture<AxisOverlayComponent>;
    let overlayTop: number;
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [AxisOverlayComponent],
        schemas: [],
      }).compileComponents();
      fixture = TestBed.createComponent(AxisOverlayComponent);
      fixture.detectChanges();
      overlayTop = fixture.nativeElement.getBoundingClientRect().top;
    });
    it('gets step higher when position is not on a step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepHigherThanMousePosition(
        150 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(200);
    });
    it('gets step on given position when that position is on a step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepHigherThanMousePosition(
        300 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(300);
    });
    it('gets highest step when given position is higher than the max step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepHigherThanMousePosition(
        800 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(400);
    });
    it('gets lower step when given position is lower than the min step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepHigherThanMousePosition(
        10 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(100);
    });
  });

  describe('getStepLowerThanPosition', () => {
    let fixture: ComponentFixture<AxisOverlayComponent>;
    let overlayTop: number;
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [AxisOverlayComponent],
        schemas: [],
      }).compileComponents();
      fixture = TestBed.createComponent(AxisOverlayComponent);
      fixture.detectChanges();
      overlayTop = fixture.nativeElement.getBoundingClientRect().top;
    });
    it('gets step lower when position is not on a step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepLowerThanMousePosition(
        250 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(200);
    });
    it('gets step on given position when that position is on a step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepLowerThanMousePosition(
        300 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(300);
    });
    it('gets highest step when given position is higher than the max step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepLowerThanMousePosition(
        800 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(400);
    });
    it('gets lower step when given position is lower than the min step', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      let stepHigher = fobInterface.getStepLowerThanMousePosition(
        10 + overlayTop,
        fixture
      );
      expect(stepHigher).toEqual(100);
    });
  });
  describe('stepToPixel', () => {
    it('calls the scale function', () => {
      let fobInterface = createInterface([100, 200, 300, 400]);
      fobInterface.stepToPixel(150, [0, 0]);
      expect(temporalScaleSpy).toHaveBeenCalledOnceWith(150);
    });
  });
});
