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
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import {Store} from '@ngrx/store';
import {BehaviorSubject, combineLatest, Observable, of, Subject} from 'rxjs';
import {map, shareReplay, switchMap, takeUntil, tap} from 'rxjs/operators';
import {State} from '../../../app_state';
import {
  getMetricsCardMinWidth,
  getMetricsStepSelectorEnabled,
  getMetricsTagGroupExpansionState,
  getMetricsXAxisType,
} from '../../../selectors';
import {selectors as settingsSelectors} from '../../../settings';
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {CardIdWithMetadata} from '../metrics_view_types';

@Component({
  selector: 'metrics-card-grid',
  template: `
    <metrics-card-grid-component
      [isGroupExpanded]="isGroupExpanded$ | async"
      [pageIndex]="normalizedPageIndex$ | async"
      [numPages]="numPages$ | async"
      [showPaginationControls]="showPaginationControls$ | async"
      [cardIdsWithMetadata]="pagedItems$ | async"
      [cardMinWidth]="cardMinWidth$ | async"
      [cardObserver]="cardObserver"
      [isStepSelectorEnabled]="isStepSelectorEnabled$ | async"
      [xAxisType]="getMetricsXAxisType$ | async"
      (pageIndexChanged)="onPageIndexChanged($event)"
    >
    </metrics-card-grid-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardGridContainer implements OnChanges, OnDestroy {
  // groupName must be non-null if the group should be collapse/expand-able.
  @Input() groupName: string | null = null;
  @Input() cardIdsWithMetadata!: CardIdWithMetadata[];
  @Input() cardObserver!: CardObserver;

  private readonly groupName$ = new BehaviorSubject<string | null>(null);
  readonly pageIndex$ = new BehaviorSubject<number>(0);
  private readonly items$ = new BehaviorSubject<CardIdWithMetadata[]>([]);
  private readonly ngUnsubscribe = new Subject<void>();

  readonly isStepSelectorEnabled$ = this.store.select(
    getMetricsStepSelectorEnabled
  );
  readonly getMetricsXAxisType$ = this.store.select(getMetricsXAxisType);

  readonly numPages$ = combineLatest([
    this.items$,
    this.store.select(settingsSelectors.getPageSize),
  ]).pipe(
    map(([items, pageSize]) => {
      return Math.ceil(items.length / pageSize);
    })
  );

  readonly isGroupExpanded$: Observable<boolean> = this.groupName$.pipe(
    switchMap((groupName) => {
      return groupName !== null
        ? this.store.select(getMetricsTagGroupExpansionState, groupName)
        : of(true);
    })
  );

  readonly showPaginationControls$: Observable<boolean> = this.numPages$.pipe(
    map((numPages) => numPages > 1)
  );

  readonly normalizedPageIndex$ = combineLatest([
    this.pageIndex$,
    this.numPages$,
  ]).pipe(
    takeUntil(this.ngUnsubscribe),
    tap(([pageIndex, numPages]) => {
      // Cycle in the Observable but only loops when pageIndex is not
      // valid and does not repeat more than once.
      if (numPages === 0) {
        return;
      }
      if (pageIndex >= numPages) {
        this.pageIndex$.next(numPages - 1);
      } else if (pageIndex < 0) {
        this.pageIndex$.next(0);
      }
    }),
    map(([pageIndex, numPages]) => {
      return Math.min(Math.max(pageIndex, 0), numPages - 1);
    }),
    shareReplay(1)
  );

  readonly pagedItems$ = combineLatest([
    this.items$,
    this.store.select(settingsSelectors.getPageSize),
    this.normalizedPageIndex$,
    this.isGroupExpanded$,
  ]).pipe(
    map(([items, pageSize, pageIndex, expanded]) => {
      const startIndex = pageSize * pageIndex;
      const endIndex = pageSize * pageIndex + (expanded ? pageSize : 0);
      return items.slice(startIndex, endIndex);
    })
  );

  readonly cardMinWidth$ = this.store.select(getMetricsCardMinWidth);

  constructor(private readonly store: Store<State>) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cardIdsWithMetadata']) {
      this.items$.next(this.cardIdsWithMetadata);
    }

    if (changes['groupName']) {
      this.groupName$.next(this.groupName);
    }
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onPageIndexChanged(newIndex: number) {
    this.pageIndex$.next(newIndex);
  }
}
