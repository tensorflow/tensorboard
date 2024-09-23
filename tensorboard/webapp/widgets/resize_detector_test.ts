/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {ResizeDetectorDirective} from './resize_detector_directive';

@Component({
  standalone: false,
  selector: 'testing-component',
  template: `
    <div
      *ngIf="renderDirective"
      detectResize
      [resizeEventDebouncePeriodInMs]="resizeEventDebouncePeriodInMs"
      (onResize)="onResize()"
    ></div>
  `,
})
class TestableComponent {
  @Input() renderDirective: boolean = true;
  @Input() resizeEventDebouncePeriodInMs?: number;
  @Input() onResize!: () => void;
}

describe('resize detector', () => {
  let triggerResize: () => void;
  let resizeObservers: ResizeObserver[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, ResizeDetectorDirective],
    }).compileComponents();

    resizeObservers = [];
    spyOn(window, 'ResizeObserver').and.callFake(function (
      callback: ResizeObserverCallback
    ) {
      const resizeObserver: ResizeObserver = {
        disconnect: () => {},
        observe: () => {},
        unobserve: () => {},
      };
      triggerResize = () => {
        callback([], resizeObserver);
      };
      resizeObservers.push(resizeObserver);
      return resizeObserver;
    });
  });

  it('does not call onResize on initial render without resize', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onResize = jasmine.createSpy();
    fixture.componentInstance.resizeEventDebouncePeriodInMs = 50;
    fixture.componentInstance.onResize = onResize;
    fixture.detectChanges();

    // When ResizeObserver is initially created, it calls the callback.
    // Ignore that.
    triggerResize();
    tick(10000);
    expect(onResize).not.toHaveBeenCalled();
  }));

  it('calls onResize on debounce', fakeAsync(() => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onResize = jasmine.createSpy();
    fixture.componentInstance.resizeEventDebouncePeriodInMs = 50;
    fixture.componentInstance.onResize = onResize;
    fixture.detectChanges();

    triggerResize();
    expect(onResize).not.toHaveBeenCalled();

    tick(10);
    triggerResize();
    expect(onResize).not.toHaveBeenCalled();

    tick(50);
    expect(onResize).toHaveBeenCalledTimes(1);
  }));

  it('unregisters when the directive is removed', () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onResize = jasmine.createSpy();
    fixture.componentInstance.onResize = onResize;
    fixture.detectChanges();
    const unobserveSpy = spyOn(resizeObservers[0], 'unobserve');

    fixture.componentInstance.renderDirective = false;
    fixture.detectChanges();

    triggerResize();

    expect(unobserveSpy).toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });
});
