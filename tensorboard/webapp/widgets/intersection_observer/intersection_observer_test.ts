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

import {ScrollingModule} from '@angular/cdk/scrolling';
import {Component, ElementRef, Input, ViewChild} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {IntersectionObserverDirective} from './intersection_observer_directive';

@Component({
  standalone: false,
  selector: 'testing-component',
  template: `
    <div class="container" cdkScrollable>
      <div
        #subjectUnderTest
        class="subject"
        observeIntersection
        (onVisibilityChange)="onVisibilityChange($event)"
        [intersectionObserverMargin]="intersectionObserverMargin"
      ></div>
    </div>
  `,
  styles: [
    `
      .container {
        height: 100px;
        overflow: hidden;
        position: fixed;
        width: 100px;
      }

      .subject {
        height: 10px;
        left: 0;
        position: absolute;
        top: 0;
        width: 10px;
      }
    `,
  ],
})
class TestableComponent {
  @ViewChild('subjectUnderTest') private readonly subject!: ElementRef;
  @ViewChild(IntersectionObserverDirective)
  private readonly directive!: IntersectionObserverDirective;

  @Input() intersectionObserverMargin?: string;
  @Input() onVisibilityChange!: (event: {visible: boolean}) => void;

  moveElement(position: {left: number; top: number}): void {
    this.subject.nativeElement.style.left = `${position.left}px`;
    this.subject.nativeElement.style.top = `${position.top}px`;
  }

  waitForEvent(): Promise<void> {
    return this.directive.waitForEventForTestOnly();
  }

  toggleElementVisibility(visible: boolean): void {
    this.subject.nativeElement.style.display = visible ? '' : 'none';
  }
}

describe('widgets/intersection_observer test', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, IntersectionObserverDirective],
      imports: [ScrollingModule],
    }).compileComponents();
  });

  it('triggers change initially', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onVisibilityChange = jasmine.createSpy();
    fixture.componentInstance.onVisibilityChange = onVisibilityChange;
    fixture.detectChanges();

    await fixture.componentInstance.waitForEvent();

    expect(onVisibilityChange).toHaveBeenCalledOnceWith({visible: true});
  });

  it('triggers change when DOM becomes invisible', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onVisibilityChange = jasmine.createSpy();
    fixture.componentInstance.onVisibilityChange = onVisibilityChange;
    fixture.detectChanges();

    expect(onVisibilityChange).not.toHaveBeenCalled();
    fixture.componentInstance.moveElement({left: 110, top: 0});

    await fixture.componentInstance.waitForEvent();

    expect(onVisibilityChange).toHaveBeenCalledOnceWith({visible: false});
  });

  it('triggers change when DOM becomes visible', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onVisibilityChange = jasmine.createSpy();
    fixture.componentInstance.onVisibilityChange = onVisibilityChange;
    fixture.detectChanges();

    expect(onVisibilityChange).not.toHaveBeenCalled();
    fixture.componentInstance.moveElement({left: 110, top: 0});
    await fixture.componentInstance.waitForEvent();

    fixture.componentInstance.moveElement({left: 10, top: 0});
    await fixture.componentInstance.waitForEvent();

    expect(onVisibilityChange.calls.allArgs()).toEqual([
      [{visible: false}],
      [{visible: true}],
    ]);
  });

  it('triggers change when an element becomes invisible with display property', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const onVisibilityChange = jasmine.createSpy();
    fixture.componentInstance.onVisibilityChange = onVisibilityChange;
    fixture.detectChanges();

    expect(onVisibilityChange).not.toHaveBeenCalled();
    fixture.componentInstance.toggleElementVisibility(false);
    await fixture.componentInstance.waitForEvent();

    fixture.componentInstance.toggleElementVisibility(true);
    await fixture.componentInstance.waitForEvent();

    expect(onVisibilityChange.calls.allArgs()).toEqual([
      [{visible: false}],
      [{visible: true}],
    ]);
  });

  it('allows specifying rootMargin string', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.intersectionObserverMargin =
      '10px 10px 10px 10px';
    const onVisibilityChange = jasmine.createSpy();
    fixture.componentInstance.onVisibilityChange = onVisibilityChange;
    fixture.detectChanges();

    fixture.componentInstance.moveElement({left: 0, top: 200});
    await fixture.componentInstance.waitForEvent();

    fixture.componentInstance.moveElement({left: 0, top: 109});
    await fixture.componentInstance.waitForEvent();

    expect(onVisibilityChange.calls.allArgs()).toEqual([
      [{visible: false}],
      [{visible: true}],
    ]);
  });

  it('does not set rootMargin at all if it is not specified', () => {
    const intersectionObserverSpy = spyOn(
      globalThis,
      'IntersectionObserver'
    ).and.callThrough();
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.onVisibilityChange = jasmine.createSpy();
    // intersectionObserverMargin is not set on purpose.
    fixture.detectChanges();

    expect(intersectionObserverSpy).toHaveBeenCalledOnceWith(
      jasmine.any(Function),
      {
        root: jasmine.any(HTMLElement),
        // rootMargin property is omitted as expected.
      }
    );
  });
});
