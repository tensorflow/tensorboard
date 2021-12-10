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
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {filter, map, pairwise, skip, startWith} from 'rxjs/operators';
import {State} from '../../../app_state';
import {DeepReadonly} from '../../../util/types';
import {getPinnedCardsWithMetadata} from '../../store';
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {CardIdWithMetadata} from '../metrics_view_types';

@Component({
  selector: 'metrics-pinned-view',
  template: `
    <metrics-pinned-view-component
      [cardIdsWithMetadata]="cardIdsWithMetadata$ | async"
      [newCardPinnedIds]="newCardPinnedIds$ | async"
      [cardObserver]="cardObserver"
    ></metrics-pinned-view-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinnedViewContainer {
  @Input() cardObserver!: CardObserver;

  constructor(private readonly store: Store<State>) {}

  readonly cardIdsWithMetadata$: Observable<
    DeepReadonly<CardIdWithMetadata[]>
  > = this.store.select(getPinnedCardsWithMetadata).pipe(startWith([]));

  // An opaque id that changes in value when new cards are pinned.
  readonly newCardPinnedIds$: Observable<[number]> = this.store
    .select(getPinnedCardsWithMetadata)
    .pipe(
      // Ignore the first pinned card values which is empty, `[]`, in the store.
      skip(1),
      map((cards) => cards.map((card) => card.cardId)),
      pairwise(),
      map(([before, after]) => {
        const beforeSet = new Set(before);
        const afterSet = new Set(after);
        for (const cardId of afterSet) {
          if (!beforeSet.has(cardId)) return Date.now();
        }
        return null;
      }),
      // Pairwise accumulates value until there is a value for both `before` and `after`.
      // Two `pairwise` can cause values to be ignored too one too many times and
      // `startWith` helps with setting the first value.
      startWith(null),
      pairwise(),
      map(([before, after]) => {
        if (before === null && after === null) return null;
        if (after === null) return [before];
        return [after];
      }),
      filter((value) => value !== null),
      map((val) => [val![0]] as [number])
    );
}
