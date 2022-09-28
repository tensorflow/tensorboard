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
import {
  CardFobControllerComponent,
  Fob,
} from '../card_fob/card_fob_controller_component';
import {
  TimeSelection,
  TimeSelectionAffordance,
  TimeSelectionWithAffordance,
} from '../card_fob/card_fob_types';
import {HistogramCardFobController} from './histogram_card_fob_controller';
import {TemporalScale} from './histogram_component';

describe('HistogramCardFobController', () => {
  let temporalScaleSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HistogramCardFobController, CardFobControllerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(input: {
    steps?: number[];
    timeSelection?: TimeSelection;
  }): ComponentFixture<HistogramCardFobController> {
    const fixture = TestBed.createComponent(HistogramCardFobController);

    // Absolutely place the fixture at the top left of the page to keep
    // position calculations in the test easier.
    fixture.debugElement.nativeElement.style.position = 'absolute';
    fixture.debugElement.nativeElement.style.left = '0';
    fixture.debugElement.nativeElement.style.top = '0';

    fixture.componentInstance.steps = input.steps ?? [100, 200, 300, 400];
    fixture.componentInstance.timeSelection = input.timeSelection ?? {
      start: {step: 200},
      end: null,
    };
    temporalScaleSpy = jasmine.createSpy();
    fixture.componentInstance.temporalScale =
      temporalScaleSpy as unknown as TemporalScale;
    temporalScaleSpy.and.callFake((step: number) => {
      // Imitate a 10 to 1 scale.
      return step * 10;
    });
    const onTimeSelectionChangedSpy = jasmine.createSpy();
    fixture.componentInstance.onTimeSelectionChanged.emit =
      onTimeSelectionChangedSpy;
    onTimeSelectionChangedSpy.and.callFake(
      (timeSelectionWithAffordance: TimeSelectionWithAffordance) => {
        fixture.componentInstance.timeSelection =
          timeSelectionWithAffordance.timeSelection;
      }
    );

    return fixture;
  }

  it('returns first element of steps from getLowestStep', () => {
    let fixture = createComponent({steps: [100, 200, 300, 400]});
    expect(fixture.componentInstance.getLowestStep()).toBe(100);
  });

  it('returns final element of steps from getHighestStep', () => {
    let fixture = createComponent({steps: [100, 200, 300, 400]});
    expect(fixture.componentInstance.getHighestStep()).toBe(400);
  });

  describe('getStepHigherThanAxisPosition', () => {
    it('gets step higher when position is not on a step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepHigher =
        fixture.componentInstance.getStepHigherThanAxisPosition(1500);
      expect(stepHigher).toEqual(200);
    });
    it('gets step on given position when that position is on a step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepHigher =
        fixture.componentInstance.getStepHigherThanAxisPosition(3000);
      expect(stepHigher).toEqual(300);
    });
    it('gets highest step when given position is higher than the max step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepHigher =
        fixture.componentInstance.getStepHigherThanAxisPosition(8000);
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
        fixture.componentInstance.getStepLowerThanAxisPosition(2500);
      expect(stepLower).toEqual(200);
    });
    it('gets step on given position when that position is on a step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepLower =
        fixture.componentInstance.getStepLowerThanAxisPosition(3000);
      expect(stepLower).toEqual(300);
    });
    it('gets highest step when given position is higher than the max step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepLower =
        fixture.componentInstance.getStepLowerThanAxisPosition(8000);
      expect(stepLower).toEqual(400);
    });
    it('gets lower step when given position is lower than the min step', () => {
      let fixture = createComponent({steps: [100, 200, 300, 400]});
      let stepLower =
        fixture.componentInstance.getStepLowerThanAxisPosition(10);
      expect(stepLower).toEqual(100);
    });
  });

  describe('getAxisPositionFromStartStep/EndStep', () => {
    it('calls the scale function', () => {
      let fixture = createComponent({
        timeSelection: {start: {step: 150}, end: {step: 300}},
      });
      expect(fixture.componentInstance.getAxisPositionFromStartStep()).toBe(
        1500
      );
      expect(fixture.componentInstance.getAxisPositionFromEndStep()).toBe(3000);
      expect(temporalScaleSpy).toHaveBeenCalledWith(150);
      expect(temporalScaleSpy).toHaveBeenCalledWith(300);
    });
  });

  describe('interaction with base controller', () => {
    it('properly uses scale when setting fob position', () => {
      let fixture = createComponent({
        timeSelection: {start: {step: 300}, end: null},
      });
      fixture.detectChanges();
      let testController = fixture.debugElement.query(
        By.directive(CardFobControllerComponent)
      ).componentInstance;
      expect(
        testController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3000);
    });
    it('moves the fob to the next highest step when dragging down', () => {
      let fixture = createComponent({
        steps: [100, 200, 300, 400],
        timeSelection: {start: {step: 300}, end: null},
      });
      fixture.detectChanges();
      let testController = fixture.debugElement.query(
        By.directive(CardFobControllerComponent)
      ).componentInstance;
      testController.startDrag(
        Fob.START,
        TimeSelectionAffordance.NONE,
        new MouseEvent('mouseDown')
      );
      // Starting step '300' renders the fob at 3000px. Mouse event at 3020px
      // mimics a drag down (towards higher steps).
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 3020,
        movementY: 1,
      });
      testController.mouseMove(fakeEvent);
      fixture.detectChanges();
      // Move to next step '400', which renders the fob at 4000px.
      expect(
        testController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4000);
    });
    it('moves the fob to the next lowest step when dragging up', () => {
      let fixture = createComponent({
        steps: [100, 200, 300, 400],
        timeSelection: {start: {step: 300}, end: null},
      });
      fixture.detectChanges();
      let testController = fixture.debugElement.query(
        By.directive(CardFobControllerComponent)
      ).componentInstance;
      testController.startDrag(
        Fob.START,
        TimeSelectionAffordance.NONE,
        new MouseEvent('mouseDown')
      );
      // Starting step '300' renders the fob at 3000px. Mouse event at 2980px
      // mimics a drag up (towards lower steps).
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 2980,
        movementY: -1,
      });
      testController.mouseMove(fakeEvent);
      fixture.detectChanges();
      // Move to previous step '200', which renders the fob at 2000px.
      expect(
        testController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2000);
    });
  });
});
