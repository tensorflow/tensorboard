/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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
import {Directive, ElementRef, Input, OnDestroy, OnInit} from '@angular/core';
import {Subject} from 'rxjs';
import {debounceTime, skip, takeUntil} from 'rxjs/operators';

const STORAGE_KEY = '_tb_resize_heights.v1';

function loadHeights(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveHeight(key: string, height: number) {
  const heights = loadHeights();
  heights[key] = Math.round(height);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(heights));
}

/**
 * Directive that persists an element's user-resized height to localStorage
 * and restores it on init. Works with CSS `resize: vertical`.
 *
 * Usage: <div persistResize="my-unique-key" ...>
 */
@Directive({
  standalone: false,
  selector: '[persistResize]',
})
export class PersistResizeDirective implements OnInit, OnDestroy {
  @Input('persistResize') key!: string;

  private readonly ngUnsubscribe$ = new Subject<void>();
  private readonly resize$ = new Subject<number>();
  private resizeObserver: ResizeObserver | null = null;

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    const stored = loadHeights()[this.key];
    if (stored) {
      this.el.nativeElement.style.height = `${stored}px`;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.resize$.next(entry.contentRect.height);
      }
    });
    this.resizeObserver.observe(this.el.nativeElement);

    this.resize$
      .pipe(skip(1), debounceTime(300), takeUntil(this.ngUnsubscribe$))
      .subscribe((height) => {
        saveHeight(this.key, height);
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
    this.resizeObserver?.disconnect();
  }
}
