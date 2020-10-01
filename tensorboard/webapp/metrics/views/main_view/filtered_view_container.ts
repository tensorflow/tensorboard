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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {createSelector, Store} from '@ngrx/store';
import {combineLatest, Observable, of} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators';

import {State} from '../../../app_state';
import {getCurrentRouteRunSelection} from '../../../selectors';
import {isSingleRunPlugin} from '../../data_source';
import {getMetricsTagFilter, getNonEmptyCardIdsWithMetadata} from '../../store';
import {CardObserver} from '../card_renderer/card_lazy_loader';

import {CardIdWithMetadata} from '../metrics_view_types';
import {compareTagNames} from '../utils';

const getRenderableCardIdsWithMetadata = createSelector(
  getNonEmptyCardIdsWithMetadata,
  getCurrentRouteRunSelection,
  (cardList, runSelectionMap) => {
    return cardList.filter((card) => {
      if (!isSingleRunPlugin(card.plugin)) {
        return true;
      }
      return Boolean(runSelectionMap && runSelectionMap.get(card.runId!));
    });
  }
);

/**
 * An area showing cards that match the tag filter.
 */
@Component({
  selector: 'metrics-filtered-view',
  template: `
    <metrics-filtered-view-component
      [cardIdsWithMetadata]="cardIdsWithMetadata$ | async"
      [cardObserver]="cardObserver"
    ></metrics-filtered-view-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilteredViewContainer {
  @Input() cardObserver!: CardObserver;

  constructor(private readonly store: Store<State>) {}

  readonly cardIdsWithMetadata$: Observable<
    CardIdWithMetadata[]
  > = this.store.select(getRenderableCardIdsWithMetadata).pipe(
    switchMap((cardList) => {
      return combineLatest([
        of(cardList),
        this.store.select(getMetricsTagFilter),
      ]);
    }),
    map(([cardList, tagFilter]) => {
      try {
        return {cardList, regex: new RegExp(tagFilter)};
      } catch (e) {
        return {cardList, regex: null};
      }
    }),
    filter(({regex}) => regex !== null),
    map(({cardList, regex}) => {
      return cardList.filter(({tag}) => regex!.test(tag));
    }),
    map((cardList) => {
      return cardList.sort((cardA, cardB) => {
        return compareTagNames(cardA.tag, cardB.tag);
      });
    }),
    distinctUntilChanged((prev, updated) => {
      if (prev.length !== updated.length) {
        return false;
      }
      return prev.every((prevVal, index) => {
        return prevVal.cardId === updated[index].cardId;
      });
    }),
    startWith([])
  );
}
