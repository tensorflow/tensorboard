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
  computed,
  Input,
  Signal,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {
  combineLatestWith,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
} from 'rxjs/operators';
import {State} from '../../../app_state';
import {DeepReadonly} from '../../../util/types';
import {getMetricsFilteredPluginTypes, getMetricsTagFilter} from '../../store';
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {CardIdWithMetadata} from '../metrics_view_types';
import {getSortedRenderableCardIdsWithMetadata} from './common_selectors';

export const FILTER_VIEW_DEBOUNCE_IN_MS = 200;

/**
 * An area showing cards that match the tag filter.
 */
@Component({
  standalone: false,
  selector: 'metrics-filtered-view',
  template: `
    <metrics-filtered-view-component
      [isEmptyMatch]="isEmptyMatch()"
      [cardIdsWithMetadata]="cardIdsWithMetadata()"
      [cardObserver]="cardObserver"
    ></metrics-filtered-view-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilteredViewContainer {
  @Input() cardObserver!: CardObserver;

  constructor(private readonly store: Store<State>) {
    this.cardIdsWithMetadata$ = this.store
      .select(getSortedRenderableCardIdsWithMetadata)
      .pipe(
        combineLatestWith(this.store.select(getMetricsFilteredPluginTypes)),
        map(([cardList, filteredPluginTypes]) => {
          if (!filteredPluginTypes.size) return cardList;
          return cardList.filter((card) =>
            filteredPluginTypes.has(card.plugin)
          );
        }),
        combineLatestWith(this.store.select(getMetricsTagFilter)),
        debounceTime(FILTER_VIEW_DEBOUNCE_IN_MS),
        map(([cardList, tagFilter]) => {
          try {
            return {cardList, regex: new RegExp(tagFilter, 'i')};
          } catch (e) {
            return {cardList, regex: null};
          }
        }),
        filter(({regex}) => regex !== null),
        map(({cardList, regex}) => {
          return cardList.filter(({tag}) => regex!.test(tag));
        }),
        distinctUntilChanged<DeepReadonly<CardIdWithMetadata>[]>(
          (prev, updated) => {
            if (prev.length !== updated.length) {
              return false;
            }
            return prev.every((prevVal, index) => {
              return prevVal.cardId === updated[index].cardId;
            });
          }
        ),
        startWith([])
      ) as Observable<DeepReadonly<CardIdWithMetadata>[]>;
    this.cardIdsWithMetadata = toSignal(this.cardIdsWithMetadata$, {
      requireSync: true,
    });
    const fullCardIds = this.store.selectSignal(
      getSortedRenderableCardIdsWithMetadata
    );
    this.isEmptyMatch = computed(() => {
      return (
        Boolean(fullCardIds().length) && this.cardIdsWithMetadata().length === 0
      );
    });
  }

  readonly cardIdsWithMetadata$: Observable<DeepReadonly<CardIdWithMetadata>[]>;
  readonly cardIdsWithMetadata: Signal<DeepReadonly<CardIdWithMetadata>[]>;

  readonly isEmptyMatch: Signal<boolean>;
}
