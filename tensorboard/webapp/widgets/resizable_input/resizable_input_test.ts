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
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {KeyType, sendKey} from '../../testing/dom';
import {ResizableInputComponent} from './resizable_input_component';

@Component({
  selector: 'testable-component',
  template: ` <resizable-input
    [value]="value"
    (onKeyDown)="onKeyDown($event)"
    (onInput)="onInput($event)"
  ></resizable-input>`,
})
export class TestableComponent {
  @Input()
  value!: string;

  @Input()
  onKeyDown!: (event: KeyboardEvent) => void;

  @Input()
  onInput!: (event: InputEvent) => void;
}

qdescribe('resizable input widget', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, ResizableInputComponent],
    }).compileComponents();
  });

  describe('render', () => {
    it('renders `value` properly', () => {
      const fixture = TestBed.createComponent(ResizableInputComponent);
      fixture.componentInstance.value = 'foo';
      fixture.detectChanges();

      expect(fixture.nativeElement.innerText).toBe('foo');
    });

    it('updates content when `value` changes', () => {
      const fixture = TestBed.createComponent(ResizableInputComponent);
      fixture.componentInstance.value = 'foo';
      fixture.detectChanges();

      fixture.componentInstance.value = 'bar';
      fixture.detectChanges();

      expect(fixture.nativeElement.innerText).toBe('bar');
    });

    describe('single line mode', () => {
      it('ignores newline and brs', () => {
        const fixture = TestBed.createComponent(ResizableInputComponent);
        fixture.componentInstance.value = 'foo\n\nhello';
        fixture.componentInstance.singleLine = true;
        fixture.detectChanges();

        expect(fixture.nativeElement.innerText).toBe('foo hello');
      });
    });

    describe('multi line mode', () => {
      it('allows content to have new lines', () => {
        const fixture = TestBed.createComponent(ResizableInputComponent);
        fixture.componentInstance.value = 'foo\n\nhello';
        fixture.componentInstance.singleLine = false;
        fixture.detectChanges();

        expect(fixture.nativeElement.innerText).toBe('foo\n\nhello');
      });
    });
  });

  describe('events', () => {
    it('propagates events in the span', () => {
      const fixture = TestBed.createComponent(TestableComponent);
      const onInputSpy = jasmine.createSpy();
      const onKeyDownSpy = jasmine.createSpy();
      fixture.componentInstance.value = 'hello';
      fixture.componentInstance.onInput = onInputSpy;
      fixture.componentInstance.onKeyDown = onKeyDownSpy;
      fixture.detectChanges();

      const inputDebugEl = fixture.debugElement.query(By.css('span'));
      sendKey(fixture, inputDebugEl, {
        type: KeyType.CHARACTER,
        key: 'w',
        prevString: 'hellow',
        startingCursorIndex: 5,
      });

      expect(onInputSpy).toHaveBeenCalledTimes(1);
      expect(onKeyDownSpy).toHaveBeenCalledTimes(1);
    });
  });
});
