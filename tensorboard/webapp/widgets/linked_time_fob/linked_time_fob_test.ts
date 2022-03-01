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
import {ScaleLinear} from '../../third_party/d3';
import {LinkedTimeFobComponent} from './linked_time_fob_component';
import {LinkedTimeFobControllerComponent} from './linked_time_fob_controller_component';
import {AxisDirection, Fob, FobCardData, Scale} from './types';
import {LinearScale} from '../line_chart_v2/lib/scale';

@Component({
  selector: 'testable-comp',
  template: `
    <linked-time-fob-controller
      #FobController
      [axisDirection]="axisDirection"
      [linkedTime]="linkedTime"
      [steps]="steps"
      [temporalScale]="temporalScale"
      [fobCardData]="fobCardData"
      (onSelectTimeChanged)="onSelectTimeChanged($event)"
    ></linked-time-fob-controller>
  `,
})
class TestableComponent {
  @ViewChild('FobController')
  fobController!: LinkedTimeFobControllerComponent;

  @Input() linkedTime!: LinkedTime;
  @Input() fobCardData!: FobCardData;

  @Input() onSelectTimeChanged!: (newLinkedTime: LinkedTime) => void;
}

describe('linked_time_fob_controller', () => {
  let onSelectTimeChanged: jasmine.Spy;
  let temporalScaleSpy: jasmine.Spy;
  let forwardScaleSpy: jasmine.Spy;
  let reverseScaleSpy: jasmine.Spy;
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
    axisDirection: AxisDirection;
    steps?: number[];
    minMax?: [number, number];
    linkedTime?: LinkedTime;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    if (input.axisDirection === AxisDirection.VERTICAL) {
      temporalScaleSpy = jasmine.createSpy();
      fixture.componentInstance.fobCardData = {
        histograms: {
          steps: input.steps || [1, 2, 3, 4],
          scale: temporalScaleSpy as unknown as ScaleLinear<number, number>,
        },
      };
      temporalScaleSpy.and.callFake((step: number) => {
        return step;
      });
    }

    if (input.axisDirection === AxisDirection.HORIZONTAL) {
      let fakeScale = new LinearScale();
      forwardScaleSpy = jasmine.createSpy();
      reverseScaleSpy = jasmine.createSpy();
      fakeScale.forward = forwardScaleSpy;
      fakeScale.reverse = reverseScaleSpy;
      forwardScaleSpy.and.callFake(
        (domain: [number, number], range: [number, number], x: number) => {
          return x;
        }
      );
      reverseScaleSpy.and.callFake(
        (domain: [number, number], range: [number, number], x: number) => {
          return x;
        }
      );
      fixture.componentInstance.fobCardData = {
        scalars: {
          scale: fakeScale,
          minMax: input.minMax || [0, 4],
        },
      };
    }

    fixture.componentInstance.linkedTime = input.linkedTime || {
      start: {step: 1},
      end: null,
    };

    onSelectTimeChanged = jasmine.createSpy();
    fixture.componentInstance.onSelectTimeChanged = onSelectTimeChanged;

    return fixture;
  }

  describe('vertical dragging', () => {
    it('moves the start fob down to mouse when mouse is dragging down and is below fob', () => {
      let fixture = createComponent({axisDirection: AxisDirection.VERTICAL});
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
        axisDirection: AxisDirection.VERTICAL,
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
  describe('horizontal dragging fob', () => {
    it('moves to mouse when dragging to the right', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 1}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(1);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 3, movementX: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 3},
        end: null,
      });
    });

    it('moves to mouse when dragging to the left', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 3}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(3);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 1, movementX: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(1);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: null,
      });
    });

    it('does not move when dragging to the left but the mouse is on the right of the fob', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 1}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(1);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 3, movementX: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(1);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });

    it('does not move when dragging to the right but the mouse is on the left of the fob', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 3}, end: null},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(3);
      fobController.startDrag(Fob.START);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 1, movementX: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.startFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(3);
      expect(onSelectTimeChanged).toHaveBeenCalledTimes(0);
    });

    it('endFob moves to mouse when dragged to the right', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 1}, end: {step: 2}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(2);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 4, movementX: 1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(4);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 4},
      });
    });

    it('endFob moves to mouse when dragged to the left', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 1}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(4);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 2, movementX: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 1},
        end: {step: 2},
      });
    });

    it('endFob does not pass startFob when dragging to the left', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 2}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(4);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 1, movementX: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: {step: 2},
      });
    });

    it('startFob does not pass endFob when dragging to the right', () => {
      let fixture = createComponent({
        axisDirection: AxisDirection.HORIZONTAL,
        linkedTime: {start: {step: 2}, end: {step: 4}},
      });
      fixture.detectChanges();
      let fobController = fixture.componentInstance.fobController;
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(4);
      fobController.startDrag(Fob.END);
      let fakeEvent = new MouseEvent('mousemove', {clientX: 1, movementX: -1});
      fobController.mouseMove(fakeEvent);
      fixture.detectChanges();
      expect(
        fobController.endFobWrapper.nativeElement.getBoundingClientRect().left
      ).toEqual(2);
      expect(onSelectTimeChanged).toHaveBeenCalledOnceWith({
        start: {step: 2},
        end: {step: 2},
      });
    });
  });
});
