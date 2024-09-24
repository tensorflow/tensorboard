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
import {CardFobComponent} from './card_fob_component';
import {AxisDirection} from './card_fob_types';

@Component({
  standalone: false,
  selector: 'testable-fob-comp',
  template: `
    <card-fob
      #Fob
      [axisDirection]="axisDirection"
      [step]="step"
      [allowRemoval]="allowRemoval"
      (stepChanged)="stepChanged($event)"
    ></card-fob>
  `,
})
class TestableFobComponent {
  @ViewChild('Fob')
  fob!: CardFobComponent;

  @Input() step!: number;
  @Input() axisDirection!: AxisDirection;
  @Input() allowRemoval: boolean = true;

  @Input() stepChanged!: (newStep: number) => void;
}

describe('card fob', () => {
  let stepChangedSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableFobComponent, CardFobComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createFobComponent(input: {
    step?: number;
    allowRemoval?: boolean;
    axisDirection?: AxisDirection;
  }): ComponentFixture<TestableFobComponent> {
    const fixture = TestBed.createComponent(TestableFobComponent);
    fixture.componentInstance.step = input.step ? input.step : 1;
    fixture.componentInstance.axisDirection = input.axisDirection
      ? input.axisDirection
      : AxisDirection.HORIZONTAL;
    if (input.allowRemoval !== undefined) {
      fixture.componentInstance.allowRemoval = input.allowRemoval;
    }

    stepChangedSpy = jasmine.createSpy();
    fixture.componentInstance.stepChanged = stepChangedSpy;

    return fixture;
  }

  it('renders step span in fob', () => {
    const fixture = createFobComponent({step: 3});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    expect(stepSpan.nativeElement.innerText).toBe('3');
  });

  it('does not render deselect button when allowRemoval is false', () => {
    const fixture = createFobComponent({
      allowRemoval: false,
    });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('button'))).toBeNull();
  });

  it('emits stepChange when pressing enter key', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    stepSpan.nativeElement.innerText = '3';
    stepSpan.triggerEventHandler('keydown.enter', {
      target: stepSpan.nativeElement,
      preventDefault: () => {},
    });

    expect(stepChangedSpy).toHaveBeenCalledWith(3);
  });

  it('emits stepChange on blur', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    stepSpan.nativeElement.innerText = '3';
    stepSpan.triggerEventHandler('blur', {
      target: stepSpan.nativeElement,
      preventDefault: () => {},
    });

    expect(stepChangedSpy).toHaveBeenCalledWith(3);
  });

  it('emits stepChange with null when entering empty string', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    stepSpan.nativeElement.innerText = '';
    stepSpan.triggerEventHandler('keydown.enter', {
      target: stepSpan.nativeElement,
      preventDefault: () => {},
    });

    expect(stepChangedSpy).toHaveBeenCalledWith(null);
  });

  it('does not emit preventDefault when pressing number', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    const keyboardEvent = new KeyboardEvent('keypress', {
      key: '2',
      keyCode: 50,
    });
    const preventDefaultSpy = jasmine.createSpy();
    keyboardEvent.preventDefault = preventDefaultSpy;

    stepSpan.triggerEventHandler('keypress', keyboardEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('emits preventDefault when pressing space key', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    const keyboardEvent = new KeyboardEvent('keypress', {
      key: ' ',
      keyCode: 32,
    });
    const preventDefaultSpy = jasmine.createSpy();
    keyboardEvent.preventDefault = preventDefaultSpy;

    stepSpan.triggerEventHandler('keypress', keyboardEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('emits preventDefault when pressing character key', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    const keyboardEvent = new KeyboardEvent('keypress', {
      key: 'd',
      keyCode: 100,
    });
    const preventDefaultSpy = jasmine.createSpy();
    keyboardEvent.preventDefault = preventDefaultSpy;

    stepSpan.triggerEventHandler('keypress', keyboardEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('emits preventDefault when pressing shift enter key', () => {
    const fixture = createFobComponent({});
    fixture.detectChanges();

    const stepSpan = fixture.debugElement.query(By.css('span'));
    const preventDefaultSpy = jasmine.createSpy();

    stepSpan.triggerEventHandler('keydown.shift.enter', {
      preventDefault: preventDefaultSpy,
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
