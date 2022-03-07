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
import {LinkedTimeFobComponent} from './linked_time_fob_component';
import {AxisDirection} from './linked_time_fob_controller_component';

@Component({
  selector: 'testable-fob-comp',
  template: `
    <linked-time-fob
      #Fob
      [axisDirection]="axisDirection"
      [step]="step"
      (stepChange)="stepChange($event)"
    ></linked-time-fob>
  `,
})
class TestableFobComponent {
  @ViewChild('Fob')
  fob!: LinkedTimeFobComponent;

  @Input() step!: number;
  @Input() axisDirection!: AxisDirection;

  @Input() stepChange!: (newStep: number) => void;
}

describe('linked time fob', () => {
  let stepTypedSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableFobComponent, LinkedTimeFobComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createFobComponent(input: {
    step?: number;
    axisDirection?: AxisDirection;
  }): ComponentFixture<TestableFobComponent> {
    const fixture = TestBed.createComponent(TestableFobComponent);
    fixture.componentInstance.step = input.step ? input.step : 1;
    fixture.componentInstance.axisDirection = input.axisDirection
      ? input.axisDirection
      : AxisDirection.HORIZONTAL;

    stepTypedSpy = jasmine.createSpy();
    fixture.componentInstance.stepChange = stepTypedSpy;
    return fixture;
  }

  it('double clicking fob changes to input', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('input'))).toBeFalsy();

    const mainDiv = fixture.debugElement.query(By.css('div'));
    mainDiv.triggerEventHandler('dblclick', {});
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('input'))).toBeTruthy();
  });

  it('input element holds step value when activated', () => {
    const fixture = createFobComponent({step: 3});
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('input'))).toBeFalsy();

    const mainDiv = fixture.debugElement.query(By.css('div'));
    mainDiv.triggerEventHandler('dblclick', {});
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    expect(input).toBeTruthy();
    expect(input.nativeElement.value).toEqual('3');
  });

  it('Entering input after double clicking emits the proper event', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('input'))).toBeFalsy();

    const mainDiv = fixture.debugElement.query(By.css('div'));
    mainDiv.triggerEventHandler('dblclick', {});
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('input'));
    expect(input).toBeTruthy();

    sendKeys(fixture, input, '3');
    input.triggerEventHandler('change', {target: input.nativeElement});
    fixture.detectChanges();

    expect(stepTypedSpy).toHaveBeenCalledOnceWith(3);
    expect(fixture.debugElement.query(By.css('input'))).toBeFalsy();
  });
});
