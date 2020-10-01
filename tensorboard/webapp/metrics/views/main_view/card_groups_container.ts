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
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {State} from '../../../app_state';
import {getCurrentRouteRunSelection} from '../../../selectors';
import {isSingleRunPlugin} from '../../data_source';
import {getNonEmptyCardIdsWithMetadata} from '../../store';
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {CardGroup} from '../metrics_view_types';
import {groupCardIdWithMetdata} from '../utils';

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

@Component({
  selector: 'metrics-card-groups',
  template: `
    <metrics-card-groups-component
      [cardGroups]="cardGroups$ | async"
      [cardObserver]="cardObserver"
    ></metrics-card-groups-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardGroupsContainer {
  @Input() cardObserver!: CardObserver;

  constructor(private readonly store: Store<State>) {}

  readonly cardGroups$: Observable<CardGroup[]> = this.store
    .select(getRenderableCardIdsWithMetadata)
    .pipe(map((cardList) => groupCardIdWithMetdata(cardList)));
}
