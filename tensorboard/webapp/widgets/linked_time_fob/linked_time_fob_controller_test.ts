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

import {Component, Input, NO_ERRORS_SCHEMA, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {sendKeys} from '../../testing/dom';
import {ScaleLinear, ScaleTime} from '../../third_party/d3';
import {LinkedTimeFobComponent} from './linked_time_fob_component';
import {
  AxisDirection,
  Fob,
  LinkedTimeFobControllerComponent,
} from './linked_time_fob_controller_component';
import {FobCardAdapter} from './types';
import {LinkedTime} from './linked_time_types';
import {FobCardAdapter} from './types';

@Component({
  selector: 'testable-comp',
  template: `
    <linked-time-fob-controller
      #FobController
      [axisDirection]="axisDirection"
      [linkedTime]="linkedTime"
      [cardAdapter]="fobCardAdapter"
      (onSelectTimeChanged)="onSelectTimeChanged($event)"
    ></linked-time-fob-controller>
  `,
})
class TestableComponent {
  @ViewChild('FobController')
  fobController!: LinkedTimeFobControllerComponent;

  @Input() axisDirection!: AxisDirection;
  @Input() linkedTime!: LinkedTime;
  @Input() fobCardAdapter!: FobCardAdapter;

  @Input() onSelectTimeChanged!: (newLinkedTime: LinkedTime) => void;
}

fdescribe('linked_time_fob_controller', () => {
  let onSelectTimeChanged: jasmine.Spy;
  let setBoundsSpy: jasmine.Spy;
  let stepToPixelSpy: jasmine.Spy;
  let getStepHigherSpy: jasmine.Spy;
  let getStepLowerSpy: jasmine.Spy;
  let fobCardAdapter: FobCardAdapter;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        TestableComponent,
        LinkedTimeFobComponent,
        LinkedTimeFobControllerComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(input: {
    steps?: number[];
    axisDirection?: AxisDirection;
    linkedTime: LinkedTime;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    setBoundsSpy = jasmine.createSpy();
    stepToPixelSpy = jasmine.createSpy();
    getStepHigherSpy = jasmine.createSpy();
    getStepLowerSpy = jasmine.createSpy();
    fobCardAdapter = {
      upperBound: 10,
      lowerBound: 0,
      setBounds: setBoundsSpy,
      stepToPixel: stepToPixelSpy,
      getStepHigherThanMousePosition: getStepHigherSpy,
      getStepLowerThanMousePosition: getStepLowerSpy,
    };

    stepToPixelSpy.and.callFake((step: number) => {
      return step;
    });
    getStepHigherSpy.and.callFake((step: number) => {
      return step;
    });
    getStepLowerSpy.and.callFake((step: number) => {
      return step;
    });
    fixture.componentInstance.fobCardAdapter = fobCardAdapter;

    fixture.componentInstance.axisDirection =
      input.axisDirection || AxisDirection.VERTICAL;

    fixture.componentInstance.linkedTime = input.linkedTime;

    onSelectTimeChanged = jasmine.createSpy();
    fixture.componentInstance.onSelectTimeChanged = onSelectTimeChanged;

    return fixture;
  }

  it('sets fob position based on linked time and stepToPixel call', () => {
    const fixture = createComponent({
      linkedTime: {start: {step: 2}, end: null},
    });
    fixture.detectChanges();
    expect(stepToPixelSpy).toHaveBeenCalledOnceWith(2, jasmine.any(Array));
  });
  it('Sets bounds when dragging start fob during range selection and resets bounds when done dragging', () => {
    const fixture = createComponent({
      linkedTime: {start: {step: 2}, end: {step: 3}},
    });
    fixture.detectChanges();
    const fobController = fixture.componentInstance.fobController;
    expect(
      fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
    ).toEqual(2);
    fobController.startDrag(Fob.START);
    expect(setBoundsSpy).toHaveBeenCalledOnceWith({higherOverride: 3});
    setBoundsSpy.calls.reset();
    fobController.stopDrag();
    expect(setBoundsSpy).toHaveBeenCalledOnceWith({});
  });
  it('Sets bounds when dragging end fob during range selection and resets bounds when done dragging', () => {
    const fixture = createComponent({
      linkedTime: {start: {step: 2}, end: {step: 3}},
    });
    fixture.detectChanges();
    const fobController = fixture.componentInstance.fobController;
    expect(
      fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
    ).toEqual(2);
    fobController.startDrag(Fob.END);
    expect(setBoundsSpy).toHaveBeenCalledOnceWith({lowerOverride: 2});
    setBoundsSpy.calls.reset();
    fobController.stopDrag();
    expect(setBoundsSpy).toHaveBeenCalledOnceWith({});
  });

  describe('vertical dragging', () => {
    it('moves the start fob based on adapter getStepHigherThanMousePosition when mouse is dragging down and is below fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: null},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(1);
      fobController.startDrag(Fob.START);
      const fakeEvent = new MouseEvent('mousemove', {clientY: 3, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepHigherSpy).toHaveBeenCalledOnceWith(3, jasmine.any(Object));
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: null,
      });
    });

    it('moves the start fob based on adapter getStepLowerThanMousePosition when mouse is dragging up and above the fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 4}, end: null},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.START);
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 2,
        movementY: -1,
      });
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepLowerSpy).toHaveBeenCalledOnceWith(2, jasmine.any(Object));
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: null,
      });
    });
    it('does not call getStepLowerThanMousePosition or getStepHigherThanMousePosition when mouse is dragging up but, is below the fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 2}, end: null},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      fobController.startDrag(Fob.START);
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 4,
        movementY: -1,
      });
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepLowerSpy).toHaveBeenCalledTimes(0);
      expect(getStepHigherSpy).toHaveBeenCalledTimes(0);
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });
    it('does not call getStepLowerThanMousePosition or getStepHigherThanMousePosition when mouse is dragging down but, is above the fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 4}, end: null},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.START);
      const fakeEvent = new MouseEvent('mousemove', {clientY: 2, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepLowerSpy).toHaveBeenCalledTimes(0);
      expect(getStepHigherSpy).toHaveBeenCalledTimes(0);
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });
    it('does not move the start fob or call call getStepLowerThanMousePosition or getStepHigherThanMousePosition when mouse is dragging down but, the fob is already on the final step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 4}, end: null},
      });
      fobCardAdapter.upperBound = 4;
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.START);
      const fakeEvent = new MouseEvent('mousemove', {clientY: 8, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepLowerSpy).toHaveBeenCalledTimes(0);
      expect(getStepHigherSpy).toHaveBeenCalledTimes(0);
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });
    it('end fob moves to the mouse when mouse is dragging up and mouse is above the fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 1}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(1);
      fobController.startDrag(Fob.END);
      onSelectTimeChanged.calls.reset();
      const fakeEvent = new MouseEvent('mousemove', {clientY: 3, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepHigherSpy).toHaveBeenCalledOnceWith(3, jasmine.any(Object));
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 3},
      });
    });
    it('end fob moves to the mouse when mouse is dragging down and mouse is below the fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 4}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.END);
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 2,
        movementY: -1,
      });
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepLowerSpy).toHaveBeenCalledOnceWith(2, jasmine.any(Object));
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 2},
      });
    });
    it('end fob does not move when mouse is dragging down but, mouse is above the fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 2}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      fobController.startDrag(Fob.END);
      const fakeEvent = new MouseEvent('mousemove', {
        clientY: 3,
        movementY: -1,
      });
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepLowerSpy).toHaveBeenCalledTimes(0);
      expect(getStepHigherSpy).toHaveBeenCalledTimes(0);
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });
    it('end fob does not move when mouse is dragging up but, mouse is below the fob', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 3}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      fobController.startDrag(Fob.END);
      const fakeEvent = new MouseEvent('mousemove', {clientY: 2, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(getStepLowerSpy).toHaveBeenCalledTimes(0);
      expect(getStepHigherSpy).toHaveBeenCalledTimes(0);
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });
  });

  describe('typing step into fob', () => {
    it('single time selection changed with fob typing', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: null},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.START, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: null,
      });
    });

    it('range selection start fob step typed which is less than end fob step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 4}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.START, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: {step: 4},
      });
    });

    it('range selection end fob step typed which is greater than start fob step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 4}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.END, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 3},
      });
    });

    it('range selection swaps when start step is typed in which is greater than end step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 2}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.START, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: {step: 3},
      });
    });

    it('range selection swaps when end step is typed in which is less than start step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 3}, end: {step: 4}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.END, 2);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: {step: 3},
      });
    });

    it('properly handles a 0 step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 3}, end: {step: 4}},
      });
      fixture.detectChanges();
      const fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.END, 0);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 0},
        end: {step: 3},
      });
    });

    it('changing start input modifies start step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: null},
      });
      fixture.detectChanges();

      const fobDiv = fixture.debugElement.query(
        By.css('linked-time-fob.startFob div')
      );
      fobDiv.triggerEventHandler('dblclick', {});
      fixture.detectChanges();

      const input = fobDiv.query(By.css('input'));

      sendKeys(fixture, input, '8');
      input.triggerEventHandler('change', {target: input.nativeElement});
      fixture.detectChanges();

      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 8},
        end: null,
      });
    });

    it('changing end fob input modifies end step', () => {
      const fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 3}},
      });
      fixture.detectChanges();

      const fobDiv = fixture.debugElement.query(
        By.css('linked-time-fob.endFob div')
      );
      fobDiv.triggerEventHandler('dblclick', {});
      fixture.detectChanges();

      const input = fobDiv.query(By.css('input'));

      sendKeys(fixture, input, '8');
      input.triggerEventHandler('change', {target: input.nativeElement});
      fixture.detectChanges();

      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 8},
      });
    });
  });
});
