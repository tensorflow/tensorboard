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
import {By} from '@angular/platform-browser';
import {ScaleLinear} from '../../third_party/d3';
import {AxisDirection} from '../linked_time_fob/linked_time_fob_controller_component';
import {HistogramLinkedTimeFobController} from './histogram_linked_time_fob_controller';
import {
  LinkedTimeFobControllerComponent,
  Fob,
} from '../linked_time_fob/linked_time_fob_controller_component';
import {LinkedTime} from '../linked_time_fob/linked_time_types';

describe('HistogramLinkedTimeFobController', () => {
  let temporalScaleSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        HistogramLinkedTimeFobController,
        LinkedTimeFobControllerComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(input: {
    steps?: number[];
    linkedTime?: LinkedTime;
  }): ComponentFixture<HistogramLinkedTimeFobController> {
    const fixture = TestBed.createComponent(HistogramLinkedTimeFobController);
    fixture.componentInstance.axisDirection = AxisDirection.VERTICAL;
    fixture.componentInstance.steps = input.steps || [100, 200, 300, 400];
    fixture.componentInstance.linkedTime = input.linkedTime || {
      start: {step: 200},
      end: null,
    };
    temporalScaleSpy = jasmine.createSpy();
    fixture.componentInstance.temporalScale =
      temporalScaleSpy as unknown as ScaleLinear<number, number>;
    temporalScaleSpy.and.callFake((step: number) => {
      return step;
    });
    return fixture;
  }

  describe('getStepHigherThanAxisPosition', () => {
    it('gets step higher when position is not on a step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepHigher =
        fixture.componentInstance.getStepHigherThanAxisPosition(150);
      expect(stepHigher).toEqual(200);
    });
    it('gets step on given position when that position is on a step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepHigher =
        fixture.componentInstance.getStepHigherThanAxisPosition(300);
      expect(stepHigher).toEqual(300);
    });
    it('gets highest step when given position is higher than the max step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepHigher =
        fixture.componentInstance.getStepHigherThanAxisPosition(800);
      expect(stepHigher).toEqual(400);
    });
    it('gets lower step when given position is lower than the min step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepHigher =
        fixture.componentInstance.getStepHigherThanAxisPosition(10);
      expect(stepHigher).toEqual(100);
    });
  });

  describe('getStepLowerThanAxisPosition', () => {
    it('gets step lower when position is not on a step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepLower =
        fixture.componentInstance.getStepLowerThanAxisPosition(250);
      expect(stepLower).toEqual(200);
    });
    it('gets step on given position when that position is on a step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepLower =
        fixture.componentInstance.getStepLowerThanAxisPosition(300);
      expect(stepLower).toEqual(300);
    });
    it('gets highest step when given position is higher than the max step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepLower =
        fixture.componentInstance.getStepLowerThanAxisPosition(800);
      expect(stepLower).toEqual(400);
    });
    it('gets lower step when given position is lower than the min step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepLower =
        fixture.componentInstance.getStepLowerThanAxisPosition(10);
      expect(stepLower).toEqual(100);
    });
  });
  describe('getAxisPositionFromStep', () => {
    it('calls the scale function', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      fixture.componentInstance.getAxisPositionFromStep(150);
      expect(temporalScaleSpy).toHaveBeenCalledOnceWith(150);
    });
  });
  describe('interaction with base controller', () => {
    it('properly uses scale when setting fob position', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 300}, end: null},
      });
      temporalScaleSpy.and.callFake((step) => {
        return step * 2;
      });
      fixture.detectChanges();
      let testController = fixture.debugElement.query(
        By.directive(LinkedTimeFobControllerComponent)
      ).componentInstance;
      expect(
        testController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(600);
    });

    it('moves the fob to the next highest step when draggin down', () => {
      let fixture = createComponent({
        steps: [100, 200, 300, 400],
        linkedTime: {start: {step: 300}, end: null},
      });
      fixture.detectChanges();
      let testController = fixture.debugElement.query(
        By.directive(LinkedTimeFobControllerComponent)
      ).componentInstance;
      testController.startDrag(Fob.START);
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 302,
        movementY: 1,
      });
      testController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        testController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(400);
    });

    it('moves the fob to the next lowest step when draggin up', () => {
      let fixture = createComponent({
        steps: [100, 200, 300, 400],
        linkedTime: {start: {step: 300}, end: null},
      });
      fixture.detectChanges();
      let testController = fixture.debugElement.query(
        By.directive(LinkedTimeFobControllerComponent)
      ).componentInstance;
      testController.startDrag(Fob.START);
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 298,
        movementY: -1,
      });
      testController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        testController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(200);
    });
  });
});
