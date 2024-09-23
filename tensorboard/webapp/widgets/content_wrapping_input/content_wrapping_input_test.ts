/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

import {Component, Input} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {KeyType, sendKey} from '../../testing/dom';
import {ContentWrappingInputComponent} from './content_wrapping_input_component';

@Component({
  standalone: false,
  selector: 'testing-component',
  template: `
    <content-wrapping-input
      [style]="style"
      [value]="value"
      [pattern]="pattern"
      (blur)="onBlur($event)"
      (focus)="onFocus($event)"
      (keydown)="onKeydown($event)"
      (keyup)="onKeyup($event)"
      (onValueChange)="onValueChange($event)"
    ></content-wrapping-input>
  `,
})
class TestableComponent {
  @Input() style?: string;
  @Input() value!: string;
  @Input() pattern?: string;
  @Input() onBlur: (e: FocusEvent) => void = () => {};
  @Input() onFocus: (e: FocusEvent) => void = () => {};
  @Input() onKeydown: (e: KeyboardEvent) => void = () => {};
  @Input() onKeyup: (e: KeyboardEvent) => void = () => {};
  @Input() onValueChange: (val: {value: string}) => void = () => {};
}

describe('widgets/content_wrapping_input', () => {
  const byCss = {
    input: By.css('content-wrapping-input input'),
    component: By.directive(ContentWrappingInputComponent),
    container: By.css('.container'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContentWrappingInputComponent, TestableComponent],
    }).compileComponents();
  });

  function getInputValue(fixture: ComponentFixture<TestableComponent>): string {
    const inputEl = fixture.debugElement.query(byCss.input)
      .nativeElement as HTMLInputElement;
    return inputEl.value;
  }

  function getInputWidth(fixture: ComponentFixture<TestableComponent>): number {
    const inputEl = fixture.debugElement.query(byCss.input)
      .nativeElement as HTMLInputElement;
    return Number(window.getComputedStyle(inputEl).width.slice(0, -2));
  }

  it('renders value and their changes', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.value = 'foo';
    fixture.detectChanges();

    expect(getInputValue(fixture)).toBe('foo');

    fixture.componentInstance.value = 'bar';
    fixture.detectChanges();
    expect(getInputValue(fixture)).toBe('bar');
  });

  it('resizes the input field on value change', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.value = 'foo';
    fixture.detectChanges();

    const fooWidth = getInputWidth(fixture);

    fixture.componentInstance.value = 'foobar';
    fixture.detectChanges();

    expect(getInputWidth(fixture)).toBeGreaterThan(fooWidth);

    fixture.componentInstance.value = 'fo';
    fixture.detectChanges();

    expect(getInputWidth(fixture)).toBeLessThan(fooWidth);
  });

  it('propagates events', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onKeydown = jasmine.createSpy();
    fixture.componentInstance.value = 'foo';
    fixture.componentInstance.onKeydown = onKeydown;
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(byCss.input)
      .nativeElement as HTMLInputElement;
    inputEl.dispatchEvent(new KeyboardEvent('keydown', {key: 'd'}));

    expect(onKeydown).toHaveBeenCalledWith(
      new KeyboardEvent('keydown', {key: 'd'})
    );
  });

  it('emits onValueChange when value changes with current input value', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onValueChange = jasmine.createSpy();
    fixture.componentInstance.value = 'foo';
    fixture.componentInstance.onValueChange = onValueChange;
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(byCss.input)
      .nativeElement as HTMLInputElement;
    inputEl.value = 'food';
    inputEl.dispatchEvent(new InputEvent('input', {data: 'd'}));

    expect(onValueChange).toHaveBeenCalledWith({value: 'food'});
  });

  describe('pattern validation-less', () => {
    it('puts class "is-valid" for all kinds of input', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.value = 'foo';
      fixture.detectChanges();

      const container = fixture.debugElement.query(byCss.container);
      expect(container.nativeElement.classList.contains('is-valid')).toBe(true);

      fixture.componentInstance.value = 'bar';
      fixture.detectChanges();

      expect(container.nativeElement.classList.contains('is-valid')).toBe(true);
    });

    it('puts class "is-valid" even when style is specified', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.style = 'error';
      fixture.componentInstance.value = 'foo';
      fixture.detectChanges();

      const component = fixture.debugElement.query(byCss.component);
      const container = fixture.debugElement.query(byCss.container);
      expect(component.nativeElement.classList.contains('error')).toBe(true);
      expect(container.nativeElement.classList.contains('is-valid')).toBe(true);

      fixture.componentInstance.style = 'high-contrast';
      fixture.detectChanges();

      expect(component.nativeElement.classList.contains('high-contrast')).toBe(
        true
      );
      expect(container.nativeElement.classList.contains('is-valid')).toBe(true);
    });
  });

  describe('pattern validation', () => {
    it('validates input when `pattern` is present', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.value = 'foo';
      fixture.componentInstance.pattern = '^[o]+$';
      fixture.detectChanges();

      const container = fixture.debugElement.query(byCss.container);
      expect(container.nativeElement.classList.contains('is-valid')).toBe(
        false
      );

      fixture.componentInstance.pattern = '^[fo]+$';
      fixture.detectChanges();

      expect(container.nativeElement.classList.contains('is-valid')).toBe(true);
    });

    it('sets everything as valid when pattern is not present', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.value = 'foo';
      fixture.detectChanges();

      const container = fixture.debugElement.query(byCss.container);
      expect(container.nativeElement.classList.contains('is-valid')).toBe(true);
    });

    it('validates when user inputs', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.value = 'foo';
      fixture.componentInstance.pattern = '^hello$';
      fixture.detectChanges();

      const inputDebugEl = fixture.debugElement.query(byCss.input);
      sendKey(fixture, inputDebugEl, {
        type: KeyType.CHARACTER,
        key: '^',
        prevString: 'hello',
        startingCursorIndex: 5,
      });

      const container = fixture.debugElement.query(byCss.container);
      expect(container.nativeElement.classList.contains('is-valid')).toBe(
        false
      );
    });
  });
});
