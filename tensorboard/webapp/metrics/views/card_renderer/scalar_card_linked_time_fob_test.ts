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
import {LinearScale} from '../../../widgets/line_chart_v2/lib/scale';
import {LinkedTimeFobControllerComponent} from '../../../widgets/linked_time_fob/linked_time_fob_controller_component';
import {LinkedTime} from '../../../widgets/linked_time_fob/linked_time_types';
import {ScalarCardLinkedTimeFobController} from './scalar_card_linked_time_fob_controller';

const SCALE_RATIO = 10;

describe('ScalarLinkedTimeFobController', () => {
  let forwardScaleSpy: jasmine.Spy;
  let reverseScaleSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ScalarCardLinkedTimeFobController,
        LinkedTimeFobControllerComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(input: {
    linkedTime?: LinkedTime;
    minMax?: [number, number];
    axisSize?: number;
  }): ComponentFixture<ScalarCardLinkedTimeFobController> {
    const fixture = TestBed.createComponent(ScalarCardLinkedTimeFobController);
    fixture.componentInstance.linkedTime = input.linkedTime ?? {
      start: {step: 200},
      end: null,
    };

    fixture.componentInstance.minMax = input.minMax ?? [0, 1];
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

  describe('getAxisPositionFromStep', () => {
    it('calls the scale function', () => {
      const minMax: [number, number] = [0, 2];
      const axisSize = 20;
      const fixture = createComponent({minMax, axisSize});

      const position = fixture.componentInstance.getAxisPositionFromStep(1);

      expect(position).toBe(1 * SCALE_RATIO);
      expect(forwardScaleSpy).toHaveBeenCalledOnceWith(
        minMax,
        [0, axisSize],
        1
      );
    });
  });

  describe('getHighestStep', () => {
    it('gets the highest step when minMax is in order', () => {
      const fixture = createComponent({minMax: [0, 2]});

      const highestStep = fixture.componentInstance.getHighestStep();

      expect(highestStep).toBe(2);
    });

    it('gets the highest step when minMax is not in order', () => {
      const fixture = createComponent({minMax: [2, 0]});

      const highestStep = fixture.componentInstance.getHighestStep();

      expect(highestStep).toBe(2);
    });
  });

  describe('getLowestStep', () => {
    it('gets the lowest step when minMax is in order', () => {
      const fixture = createComponent({minMax: [0, 2]});

      const lowestStep = fixture.componentInstance.getLowestStep();

      expect(lowestStep).toBe(0);
    });

    it('gets the lowest step when minMax is not in order', () => {
      const fixture = createComponent({minMax: [2, 0]});

      const lowestStep = fixture.componentInstance.getLowestStep();

      expect(lowestStep).toBe(0);
    });
  });
});
