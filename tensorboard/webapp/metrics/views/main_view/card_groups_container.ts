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
import {combineLatestWith, map} from 'rxjs/operators';
import {State} from '../../../app_state';
import {getMetricsFilteredPluginTypes} from '../../store';
import {groupCardIdWithMetdata} from '../../utils';
import {CardObserver} from '../card_renderer/card_lazy_loader';
import {CardGroup} from '../metrics_view_types';
import {getSortedRenderableCardIdsWithMetadata} from './common_selectors';

@Component({
  standalone: false,
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

  constructor(private readonly store: Store<State>) {
    this.cardGroups$ = this.store
      .select(getSortedRenderableCardIdsWithMetadata)
      .pipe(
        combineLatestWith(this.store.select(getMetricsFilteredPluginTypes)),
        map(([cardList, filteredPlugins]) => {
          if (!filteredPlugins.size) return cardList;
          return cardList.filter((card) => {
            return filteredPlugins.has(card.plugin);
          });
        }),
        map((cardList) => groupCardIdWithMetdata(cardList))
      );
  }

  readonly cardGroups$: Observable<CardGroup[]>;
}
