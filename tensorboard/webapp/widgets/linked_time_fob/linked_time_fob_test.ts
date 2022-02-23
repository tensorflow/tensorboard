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
import {LinkedTime} from '../../metrics/types';
import {ScaleLinear, ScaleTime} from '../../third_party/d3';
import {LinkedTimeFobComponent} from './linked_time_fob_component';
import {
  AxisDirection,
  Fob,
  LinkedTimeFobControllerComponent,
} from './linked_time_fob_controller_component';

type TemporalScale = ScaleLinear<number, number> | ScaleTime<number, number>;

@Component({
  selector: 'testable-comp',
  template: `
    <linked-time-fob-controller
      #FobController
      [axisDirection]="axisDirection"
      [linkedTime]="linkedTime"
      [steps]="steps"
      [temporalScale]="temporalScale"
      (onSelectTimeChanged)="onSelectTimeChanged($event)"
    ></linked-time-fob-controller>
  `,
})
class TestableComponent {
  @ViewChild('FobController')
  fobController!: LinkedTimeFobControllerComponent;

  @Input() steps!: number[];
  @Input() axisDirection!: AxisDirection;
  @Input() linkedTime!: LinkedTime;
  @Input() temporalScale!: TemporalScale;

  @Input() onSelectTimeChanged!: (newLinkedTime: LinkedTime) => void;
}

fdescribe('linked_time_fob_controller', () => {
  let onSelectTimeChanged: jasmine.Spy;
  let temporalScaleSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        TestableComponent,
        LinkedTimeFobControllerComponent,
        LinkedTimeFobComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(input: {
    steps?: number[];
    axisDirection?: AxisDirection;
    linkedTime?: LinkedTime;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.steps = input.steps || [1, 2, 3, 4];

    fixture.componentInstance.axisDirection =
      input.axisDirection || AxisDirection.VERTICAL;

    fixture.componentInstance.linkedTime = input.linkedTime || {
      start: {step: 1},
      end: null,
    };

    temporalScaleSpy = jasmine.createSpy();
    fixture.componentInstance.temporalScale =
      temporalScaleSpy as unknown as ScaleLinear<number, number>;

    temporalScaleSpy.and.callFake((step: number) => {
      return step;
    });

    onSelectTimeChanged = jasmine.createSpy();
    fixture.componentInstance.onSelectTimeChanged = onSelectTimeChanged;

    return fixture;
  }

  describe('vertical dragging', () => {
    it('moves the start fob down to mouse when mouse is dragging down and is below fob', () => {
      let fixture = createComponent({});
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(1);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 3, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: null,
      });
    });

    it('moves the start fob above mouse when mouse is dragging up and above the fob', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 4}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 2, movementY: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: null,
      });
    });

    it('does not move the start fob when mouse is dragging up but, is below the fob', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 2}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 4, movementY: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });

    it('does not move the start fob when mouse is dragging down but, is above the fob', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 4}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 2, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });

    it('does not move the start fob when mouse is dragging down but, the fob is already on the final step', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 4}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 8, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });

    it('start fob moves does not pass the end fob when being dragged passed it.', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 2}, end: {step: 3}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 4, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: {step: 3},
      });
    });

    it('end fob moves to the mouse when mouse is dragging up and mouse is above the fob', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 1}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(1);
      fobController.startDrag(Fob.END);
      onSelectTimeChanged.calls.reset();
      let fakeEvent = new MouseEvent('mousemove', {clientY: 3, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 3},
      });
    });

    it('end fob moves to the mouse when mouse is dragging down and mouse is below the fob', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(4);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 2, movementY: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 2},
      });
    });

    it('end fob does not move when mouse is dragging down but, mouse is above the fob', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 2}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 3, movementY: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });

    it('end fob does not move when mouse is dragging up but, mouse is below the fob', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 3}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 2, movementY: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });

    it('end fob does not pass the start fob when being dragged passed it.', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 2}, end: {step: 3}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(3);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientY: 1, movementY: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().top
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: {step: 2},
      });
    });
  });

  describe('typing step into fob', () => {
    it('single time selection changed with fob typing', () => {
      let fixture = createComponent({});
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.START, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: null,
      });
    });

    it('range selection start fob step typed which is less than end fob step', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.START, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: {step: 4},
      });
    });

    it('range selection end fob step typed which is greater than start fob step', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.END, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 3},
      });
    });

    it('range selection swaps when start step is typed in which is greater than end step', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 1}, end: {step: 2}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.START, 3);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: {step: 3},
      });
    });

    it('range selection swaps when end step is typed in which is less than start step', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 3}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.END, 2);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: {step: 3},
      });
    });

    it('properly handles a 0 step', () => {
      let fixture = createComponent({
        linkedTime: {start: {step: 3}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      fobController.stepTyped(Fob.END, 0);
      fixture.detectChanges();
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 0},
        end: {step: 3},
      });
    });
  });
});
