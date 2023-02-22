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
import {
  getCurrentRouteRunSelection,
  getMetricsHideEmptyCards,
  getMetricsTagMetadata,
} from '../../../selectors';
import {DeepReadonly} from '../../../util/types';
import {isSingleRunPlugin, PluginType} from '../../data_source';
import {getNonEmptyCardIdsWithMetadata, TagMetadata} from '../../store';
import {compareTagNames} from '../../utils';
import {CardIdWithMetadata} from '../metrics_view_types';

const getTagsWithScalarData = createSelector(
  getMetricsTagMetadata,
  getCurrentRouteRunSelection,
  (
    tagMetadata: DeepReadonly<TagMetadata>,
    runSelection: Map<string, boolean> | null
  ) => {
    return new Set(
      Object.entries(tagMetadata.scalars.tagToRuns)
        // If there are runs selected, filter to a list of tags with at least one selected run
        .filter(([, runs]) => {
          if (!runSelection || !runSelection.size) {
            return true;
          }
          return runs.some((run) => runSelection?.get(run));
        })
        .map(([tag]) => tag)
    );
  }
);

const getRenderableCardIdsWithMetadata = createSelector(
  getNonEmptyCardIdsWithMetadata,
  getCurrentRouteRunSelection,
  getMetricsHideEmptyCards,
  getTagsWithScalarData,
  (cardList, runSelectionMap, hideEmptyCards, tagsWithScalarData) => {
    const cardsWithMetadata = cardList.filter((card) => {
      if (!isSingleRunPlugin(card.plugin)) {
        return true;
      }
      return Boolean(runSelectionMap && runSelectionMap.get(card.runId!));
    });
    if (hideEmptyCards) {
      return cardsWithMetadata.filter((cardIdWithMetadata) => {
        if (cardIdWithMetadata.plugin !== PluginType.SCALARS) {
          return true;
        }
        return tagsWithScalarData!.has(cardIdWithMetadata.tag);
      });
    }

    return cardsWithMetadata;
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

export const TEST_ONLY = {
  getTagsWithScalarData,
};
