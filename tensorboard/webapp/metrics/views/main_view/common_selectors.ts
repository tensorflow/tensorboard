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
import {createSelector} from '@ngrx/store';
import {State} from '../../../app_state';
import {getCurrentRouteRunSelection} from '../../../selectors';
import {DeepReadonly} from '../../../util/types';
import {isSingleRunPlugin} from '../../data_source';
import {getNonEmptyCardIdsWithMetadata} from '../../store';
import {compareTagNames} from '../../utils';
import {CardIdWithMetadata} from '../metrics_view_types';

const getRenderableCardIdsWithMetadata = createSelector<
  State,
  readonly DeepReadonly<CardIdWithMetadata>[],
  Map<string, boolean> | null,
  DeepReadonly<CardIdWithMetadata>[]
>(
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

export const getSortedRenderableCardIdsWithMetadata = createSelector<
  State,
  DeepReadonly<CardIdWithMetadata>[],
  DeepReadonly<CardIdWithMetadata>[]
>(getRenderableCardIdsWithMetadata, (cardList) => {
  return cardList.sort((cardA, cardB) => {
    return compareTagNames(cardA.tag, cardB.tag);
  });
});
