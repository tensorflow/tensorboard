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
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {fromEvent, Observable, Subject} from 'rxjs';
import {combineLatestWith, filter, map, takeUntil} from 'rxjs/operators';
import {MouseEventButtons} from '../../util/dom';
import {sideBarWidthChanged} from '../actions';
import {State} from '../state';
import {
  getRunsTableFullScreen,
  getSideBarWidthInPercent,
} from '../store/core_selectors';

@Component({
  selector: 'tb-dashboard-layout',
  template: `
    <button
      *ngIf="(width$ | async) === 0"
      class="expand"
      (click)="expandSidebar()"
    >
      <mat-icon svgIcon="expand_more_24px"></mat-icon>
    </button>
    <nav
      *ngIf="(width$ | async) > 0"
      class="sidebar"
      [style.width.%]="width$ | async"
      [style.minWidth.px]="MINIMUM_SIDEBAR_WIDTH_IN_PX"
      [style.maxWidth.%]="(runsTableFullScreen$ | async) ? 100 : ''"
    >
      <ng-content select="[sidebar]"></ng-content>
    </nav>
    <div
      *ngIf="(width$ | async) > 0"
      class="resizer"
      (mousedown)="resizeGrabbed()"
    ></div>
    <ng-content select="[main]"></ng-content>
  `,
  styleUrls: ['layout_container.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutContainer implements OnDestroy {
  readonly runsTableFullScreen$ = this.store.select(getRunsTableFullScreen);
  readonly width$: Observable<number> = this.store
    .select(getSideBarWidthInPercent)
    .pipe(
      combineLatestWith(this.runsTableFullScreen$),
      map(([percentageWidth, fullScreen]) => {
        return fullScreen ? 100 : percentageWidth;
      })
    );
  private readonly ngUnsubscribe = new Subject<void>();
  private resizing: boolean = false;

  readonly MINIMUM_SIDEBAR_WIDTH_IN_PX = 75;

  constructor(private readonly store: Store<State>, hostElRef: ElementRef) {
    fromEvent<MouseEvent>(hostElRef.nativeElement, 'mousemove')
      .pipe(
        takeUntil(this.ngUnsubscribe),
        filter(() => this.resizing)
      )
      .subscribe((event) => {
        // If mouse ever leaves the browser and comes back, there are chances
        // that the LEFT button is no longer being held down. This makes sure
        // we don't have a funky UX where sidebar resizes without user
        // mousedowning.
        if (
          (event.buttons & MouseEventButtons.LEFT) !==
          MouseEventButtons.LEFT
        ) {
          this.resizing = false;
          return;
        }
        // Prevents mousemove from selecting text underneath.
        event.preventDefault();
        const {width} = hostElRef.nativeElement.getBoundingClientRect();
        // Collapse the sidebar when it is too small.
        const widthInPercent =
          event.clientX <= this.MINIMUM_SIDEBAR_WIDTH_IN_PX
            ? 0
            : (event.clientX / width) * 100;
        this.store.dispatch(sideBarWidthChanged({widthInPercent}));
      });

    fromEvent(hostElRef.nativeElement, 'mouseup', {passive: true})
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.resizing = false;
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  resizeGrabbed() {
    this.resizing = true;
  }

  expandSidebar() {
    this.store.dispatch(
      sideBarWidthChanged({
        widthInPercent: 20,
      })
    );
  }
}
