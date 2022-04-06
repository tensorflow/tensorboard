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
import {LinkedTimeFobControllerComponent} from '../../../widgets/linked_time_fob/linked_time_fob_controller_component';
import {LinkedTime} from '../../../widgets/linked_time_fob/linked_time_types';
import {LinearScale} from '../../../widgets/line_chart_v2/lib/scale';
import {ScalarCardLinkedTimeFobController} from './scalar_card_linked_time_fob_controller';

fdescribe('ScalarLinkedTimeFobController', () => {
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

    fixture.componentInstance.minMax = input.minMax ?? [0, 10];
    fixture.componentInstance.axisSize = input.axisSize ?? 100;

    const fakeScale = new LinearScale();
    forwardScaleSpy = jasmine.createSpy();
    reverseScaleSpy = jasmine.createSpy();
    fakeScale.forward = forwardScaleSpy;
    fakeScale.reverse = reverseScaleSpy;
    // Imitate a 10:1 scale.
    forwardScaleSpy.and.callFake(
      (domain: [number, number], range: [number, number], x: number) => {
        return x * 10;
      }
    );
    reverseScaleSpy.and.callFake(
      (domain: [number, number], range: [number, number], x: number) => {
        return x / 10;
      }
    );
    fixture.componentInstance.scale = fakeScale;
    return fixture;
  }

  describe('getAxisPositionFromStep', () => {
    it('calls the scale function', () => {
      const minMax: [number, number] = [0, 2];
      const axisSize = 20;
      let fixture = createComponent({minMax, axisSize});
      expect(fixture.componentInstance.getAxisPositionFromStep(1)).toBe(10);
      expect(forwardScaleSpy).toHaveBeenCalledOnceWith(
        minMax,
        [0, axisSize],
        1
      );
    });
  });
});
