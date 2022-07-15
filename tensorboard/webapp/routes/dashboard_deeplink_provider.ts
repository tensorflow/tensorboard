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
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, of, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {DeepLinkProvider} from '../app_routing/deep_link_provider';
import {SerializableQueryParams} from '../app_routing/types';
import {State} from '../app_state';
import {
  FeatureFlagMetadata,
  FeatureFlagMetadataMap,
  FeatureFlagType,
} from '../feature_flag/store/feature_flag_metadata';
import {
  isPluginType,
  isSampledPlugin,
  isSingleRunPlugin,
} from '../metrics/data_source/types';
import {CardUniqueInfo} from '../metrics/types';
import {GroupBy, GroupByKey} from '../runs/types';
import * as selectors from '../selectors';
import {
  DeserializedState,
  PINNED_CARDS_KEY,
  RUN_COLOR_GROUP_KEY,
  RUN_FILTER_KEY,
  SMOOTHING_KEY,
  TAG_FILTER_KEY,
} from './dashboard_deeplink_provider_types';
import {getOverriddenFeatureFlagStates} from './feature_flag_serializer';

const COLOR_GROUP_REGEX_VALUE_PREFIX = 'regex:';

/**
 * Provides deeplinking for the core dashboards page.
 */
@Injectable()
export class DashboardDeepLinkProvider extends DeepLinkProvider {
  private getMetricsPinnedCards(
    store: Store<State>
  ): Observable<SerializableQueryParams> {
    return combineLatest([
      store.select(selectors.getPinnedCardsWithMetadata),
      store.select(selectors.getUnresolvedImportedPinnedCards),
    ]).pipe(
      map(([pinnedCards, unresolvedImportedPinnedCards]) => {
        if (!pinnedCards.length && !unresolvedImportedPinnedCards.length) {
          return [];
        }

        const pinnedCardsToStore = pinnedCards.map(
          ({plugin, tag, sample, runId}) => {
            const info = {plugin, tag} as CardUniqueInfo;
            if (isSingleRunPlugin(plugin)) {
              info.runId = runId!;
            }
            if (isSampledPlugin(plugin)) {
              info.sample = sample!;
            }
            return info;
          }
        );
        // Intentionally order unresolved cards last, so that cards pinned by
        // the user in this session have priority.
        const cardsToStore = [
          ...pinnedCardsToStore,
          ...unresolvedImportedPinnedCards,
        ];
        return [{key: 'pinnedCards', value: JSON.stringify(cardsToStore)}];
      })
    );
  }

  serializeStateToQueryParams(
    store: Store<State>
  ): Observable<SerializableQueryParams> {
    return combineLatest([
      this.getMetricsPinnedCards(store),
      store.select(selectors.getMetricsTagFilter).pipe(
        map((filterText) => {
          if (!filterText) {
            return [];
          }
          return [{key: TAG_FILTER_KEY, value: filterText}];
        })
      ),
      of(getOverriddenFeatureFlagStates(
        FeatureFlagMetadataMap as Record<
          string,
          FeatureFlagMetadata<FeatureFlagType>
        >
      )),
      store.select(selectors.getMetricsSettingOverrides).pipe(
        map((settingOverrides) => {
          if (Number.isFinite(settingOverrides.scalarSmoothing)) {
            return [
              {
                key: SMOOTHING_KEY,
                value: String(settingOverrides.scalarSmoothing),
              },
            ];
          }
          return [];
        })
      ),
      store.select(selectors.getRunUserSetGroupBy).pipe(
        map((groupBy) => {
          if (!groupBy) return [];
          let value: string;

          switch (groupBy.key) {
            case GroupByKey.EXPERIMENT:
              value = 'experiment';
              break;
            case GroupByKey.RUN:
              value = 'run';
              break;
            case GroupByKey.REGEX:
              value = `${COLOR_GROUP_REGEX_VALUE_PREFIX}${groupBy.regexString}`;
              break;
            default:
              throw new RangeError(`Serialization not implemented`);
          }

          return [{key: RUN_COLOR_GROUP_KEY, value}];
        })
      ),
      store.select(selectors.getRunSelectorRegexFilter).pipe(
        map((value) => {
          if (!value) return [];
          return [{key: RUN_FILTER_KEY, value}];
        })
      ),
    ]).pipe(
      map((queryParamList) => {
        return queryParamList.flat();
      })
    );
  }

  deserializeQueryParams(
    queryParams: SerializableQueryParams
  ): DeserializedState {
    let pinnedCards = null;
    let smoothing = null;
    let tagFilter = null;
    let groupBy: GroupBy | null = null;
    let runFilter = null;

    for (const {key, value} of queryParams) {
      switch (key) {
        case PINNED_CARDS_KEY:
          pinnedCards = extractPinnedCardsFromURLText(value);
          break;
        case SMOOTHING_KEY:
          smoothing = Number(value);
          break;
        case RUN_COLOR_GROUP_KEY: {
          switch (value) {
            case 'experiment':
              groupBy = {key: GroupByKey.EXPERIMENT};
              break;
            case 'run':
              groupBy = {key: GroupByKey.RUN};
              break;
          }

          if (value.startsWith(COLOR_GROUP_REGEX_VALUE_PREFIX)) {
            const regexString = value.slice(
              COLOR_GROUP_REGEX_VALUE_PREFIX.length
            );
            groupBy = {key: GroupByKey.REGEX, regexString};
          }
          break;
        }
        case TAG_FILTER_KEY:
          tagFilter = value;
          break;
        case RUN_FILTER_KEY:
          runFilter = value;
          break;
      }
    }

    return {
      metrics: {
        pinnedCards: pinnedCards || [],
        smoothing,
        tagFilter,
      },
      runs: {
        groupBy,
        regexFilter: runFilter,
      },
    };
  }
}

function extractPinnedCardsFromURLText(
  urlText: string
): CardUniqueInfo[] | null {
  // Check that the URL text parses.
  let object;
  try {
    object = JSON.parse(urlText) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(object)) {
    return null;
  }

  const result = [];
  for (const item of object) {
    // Validate types.
    const isPluginString = typeof item.plugin === 'string';
    const isRunString = typeof item.runId === 'string';
    const isSampleNumber = typeof item.sample === 'number';
    const isTagString = typeof item.tag === 'string';
    const isRunTypeValid = isRunString || typeof item.runId === 'undefined';
    const isSampleTypeValid =
      isSampleNumber || typeof item.sample === 'undefined';
    if (
      !isPluginString ||
      !isTagString ||
      !isRunTypeValid ||
      !isSampleTypeValid
    ) {
      continue;
    }

    // Required fields and range errors.
    if (!isPluginType(item.plugin)) {
      continue;
    }
    if (!item.tag) {
      continue;
    }
    if (isSingleRunPlugin(item.plugin)) {
      // A single run plugin must specify a non-empty run.
      if (!item.runId) {
        continue;
      }
    } else {
      // A multi run plugin must not specify a run.
      if (item.runId) {
        continue;
      }
    }
    if (isSampleNumber) {
      if (!isSampledPlugin(item.plugin)) {
        continue;
      }
      if (!Number.isInteger(item.sample) || item.sample < 0) {
        continue;
      }
    }

    // Assemble result.
    const resultItem = {plugin: item.plugin, tag: item.tag} as CardUniqueInfo;
    if (isRunString) {
      resultItem.runId = item.runId;
    }
    if (isSampleNumber) {
      resultItem.sample = item.sample;
    }
    result.push(resultItem);
  }
  return result;
}
