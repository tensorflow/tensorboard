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
import {
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
} from '@angular/core';
import {Subject} from 'rxjs';
import {take, takeUntil} from 'rxjs/operators';

/**
 * A directive that calls `onVisibilityChange` when element visiblity changes.
 */
@Directive({selector: '[observeIntersection]'})
export class IntersectionObserverDirective implements OnDestroy {
  @Output() onVisibilityChange = new EventEmitter<{visible: boolean}>();

  private readonly ngUnsubscribe$ = new Subject();
  private readonly onEvent$ = new Subject<IntersectionObserverEntry[]>();

  constructor(ref: ElementRef) {
    const intersectionObserver = new IntersectionObserver((entries) => {
      this.onEvent$.next(entries);
    });
    intersectionObserver.observe(ref.nativeElement);
    this.ngUnsubscribe$.subscribe(() => {
      intersectionObserver.unobserve(ref.nativeElement);
    });
    this.onEvent$.pipe(takeUntil(this.ngUnsubscribe$)).subscribe((entries) => {
      const lastEntry = entries.slice(-1)[0];
      this.onVisibilityChange.emit({visible: lastEntry.isIntersecting});
    });
  }

  ngOnDestroy() {
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

  waitForEventForTestOnly(): Promise<void> {
    return new Promise((resolve) => {
      return this.onEvent$.pipe(take(1)).subscribe(() => {
        resolve();
      });
    });
  }
}
