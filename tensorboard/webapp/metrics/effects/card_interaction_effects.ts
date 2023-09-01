/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {Injectable} from '@angular/core';
import {Action, Store, createAction} from '@ngrx/store';
import {
  State,
  getNewCardInteractions,
  getCardMetadataMap,
  getPreviousCardInteractions,
} from '../store';
import {Actions, OnInitEffects, createEffect, ofType} from '@ngrx/effects';
import {CardInteractionsDataSource} from '../data_source/card_interactions_data_source';
import {withLatestFrom, skip, tap} from 'rxjs';
import {metricsPreviousCardInteractionsChanged} from '../actions';
import {getActiveNamespaceId} from '../../app_routing/store/app_routing_selectors';
import {CardIdWithMetadata} from '../types';

const initAction = createAction('[Card Interaction Effects] Init');

@Injectable()
export class CardInteractionEffects implements OnInitEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: CardInteractionsDataSource
  ) {}

  /** @export */
  ngrxOnInitEffects(): Action {
    return initAction();
  }

  private getCardInteractions$ = this.store.select(getNewCardInteractions).pipe(
    // Don't get the initial state
    skip(1)
  );

  private getPreviousCardInteractions$ = this.store
    .select(getPreviousCardInteractions)
    .pipe(
      // Don't get the initial state
      skip(1)
    );

  readonly onInitEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(initAction),
        tap(() => {
          this.store.dispatch(
            metricsPreviousCardInteractionsChanged({
              cardInteractions: this.dataSource.getCardInteractions(),
            })
          );
        })
      );
    },
    {dispatch: false}
  );

  /** @export */
  readonly cardInteractionsEffect$ = createEffect(
    () => {
      return this.getCardInteractions$.pipe(
        tap((cardInteractions) => {
          this.dataSource.saveCardInteractions(cardInteractions);
        })
      );
    },
    {dispatch: false}
  );

  /** @export */
  readonly updateInteractionsOnNavigationEffect$ = createEffect(
    () => {
      return this.store.select(getActiveNamespaceId).pipe(
        withLatestFrom(
          this.getCardInteractions$,
          this.getPreviousCardInteractions$,
          this.store.select(getCardMetadataMap)
        ),
        tap(
          ([, newCardInteractions, previousCardInteractions, metadataMap]) => {
            const nextCardInteractions = {
              pins: makeUnique([
                ...previousCardInteractions.pins,
                ...newCardInteractions.pins,
              ]),
              clicks: makeUnique([
                ...previousCardInteractions.clicks,
                ...newCardInteractions.clicks,
              ]),
              tagFilters: Array.from(
                new Set([
                  ...previousCardInteractions.tagFilters,
                  ...newCardInteractions.tagFilters,
                ])
              ),
            };

            this.store.dispatch(
              metricsPreviousCardInteractionsChanged({
                cardInteractions: nextCardInteractions,
              })
            );

            function makeUnique(cardMetadata: CardIdWithMetadata[]) {
              return Array.from(
                new Set(cardMetadata.map(({cardId}) => cardId))
              ).map((cardId) => ({...metadataMap[cardId], cardId}));
            }
          }
        )
      );
    },
    {dispatch: false}
  );
}

export const TEST_ONLY = {
  initAction,
};
