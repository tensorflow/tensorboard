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

import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CardFobControllerComponent} from '../../../widgets/card_fob/card_fob_controller_component';
import {TimeSelection} from '../../../widgets/card_fob/card_fob_types';
import {LinearScale} from '../../../widgets/line_chart_v2/lib/scale';
import {ScalarCardFobController} from './scalar_card_fob_controller';
import {MinMaxStep} from './scalar_card_types';

const SCALE_RATIO = 10;

describe('ScalarFobController', () => {
  let forwardScaleSpy: jasmine.Spy;
  let reverseScaleSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ScalarCardFobController, CardFobControllerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(input: {
    timeSelection?: TimeSelection;
    minMax?: [number, number];
    minMaxStep?: MinMaxStep;
    axisSize?: number;
  }): ComponentFixture<ScalarCardFobController> {
    const fixture = TestBed.createComponent(ScalarCardFobController);
    fixture.componentInstance.timeSelection = input.timeSelection ?? {
      start: {step: 200},
      end: null,
    };

    fixture.componentInstance.minMaxHorizontalViewExtend = input.minMax ?? [
      -1, 2,
    ];
    fixture.componentInstance.minMaxStep = input.minMaxStep ?? {
      minStep: 0,
      maxStep: 1,
    };
    fixture.componentInstance.axisSize = input.axisSize ?? 1;

    const fakeScale = new LinearScale();
    forwardScaleSpy = jasmine.createSpy();
    reverseScaleSpy = jasmine.createSpy();
    fakeScale.forward = forwardScaleSpy;
    fakeScale.reverse = reverseScaleSpy;
    forwardScaleSpy.and.callFake(
      (domain: [number, number], range: [number, number], step: number) => {
        return step * SCALE_RATIO;
      }
    );
    reverseScaleSpy.and.callFake(
      (
        domain: [number, number],
        range: [number, number],
        axisPosition: number
      ) => {
        return axisPosition / SCALE_RATIO;
      }
    );
    fixture.componentInstance.scale = fakeScale;
    return fixture;
  }

  describe('getAxisPositionFromStartStep/EndStep', () => {
    it('calls the scale function', () => {
      const minMax: [number, number] = [0, 2];
      const axisSize = 20;
      const fixture = createComponent({
        minMax,
        axisSize,
        timeSelection: {start: {step: 1}, end: {step: 3}},
      });

      const startPosition =
        fixture.componentInstance.getAxisPositionFromStartStep();
      const endPosition =
        fixture.componentInstance.getAxisPositionFromEndStep();

      expect(startPosition).toBe(1 * SCALE_RATIO);
      expect(endPosition).toBe(3 * SCALE_RATIO);
      expect(forwardScaleSpy).toHaveBeenCalledWith(minMax, [0, axisSize], 1);
      expect(forwardScaleSpy).toHaveBeenCalledWith(minMax, [0, axisSize], 3);
    });
  });

  it('gets the highest/lowest step', () => {
    const fixture = createComponent({minMaxStep: {minStep: 0, maxStep: 2}});

    const highestStep = fixture.componentInstance.getHighestStep();
    const lowestStep = fixture.componentInstance.getLowestStep();

    expect(lowestStep).toBe(0);
    expect(highestStep).toBe(2);
  });

  describe('getStepHigherThanAxisPosition', () => {
    it('gets step at given position', () => {
      const fixture = createComponent({});

      const step = fixture.componentInstance.getStepHigherThanAxisPosition(10);

      expect(step).toBe(10 / SCALE_RATIO);
    });

    it('gets highest step if given position is higher than the position at highest step', () => {
      const fixture = createComponent({minMaxStep: {minStep: 0, maxStep: 2}});

      const step = fixture.componentInstance.getStepHigherThanAxisPosition(30);

      expect(step).toBe(2);
    });

    it('gets lowest step if given position is lower than the position at lowest step', () => {
      const fixture = createComponent({minMaxStep: {minStep: 1, maxStep: 3}});

      const step = fixture.componentInstance.getStepHigherThanAxisPosition(0);

      expect(step).toBe(1);
    });
  });

  describe('getStepLowerThanAxisPosition', () => {
    it('gets step at given position', () => {
      const fixture = createComponent({});

      const step = fixture.componentInstance.getStepLowerThanAxisPosition(10);

      expect(step).toBe(10 / SCALE_RATIO);
    });

    it('gets highest step if given position is higher than the position at highest step', () => {
      const fixture = createComponent({minMaxStep: {minStep: 0, maxStep: 2}});

      const step = fixture.componentInstance.getStepLowerThanAxisPosition(30);

      expect(step).toBe(2);
    });

    it('gets lowest step if given position is lower than the position at lowest step', () => {
      const fixture = createComponent({minMaxStep: {minStep: 1, maxStep: 3}});

      const step = fixture.componentInstance.getStepLowerThanAxisPosition(0);

      expect(step).toBe(1);
    });
  });
});
