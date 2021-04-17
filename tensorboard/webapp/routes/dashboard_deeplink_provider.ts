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
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {DeepLinkProvider} from '../app_routing/deep_link_provider';
import {SerializableQueryParams} from '../app_routing/types';
import {State} from '../app_state';
import {
  isPluginType,
  isSampledPlugin,
  isSingleRunPlugin,
} from '../metrics/data_source/types';
import {CardUniqueInfo, METRICS_SETTINGS_DEFAULT} from '../metrics/types';
import * as selectors from '../selectors';
import {getMetricsScalarSmoothing} from '../selectors';
import {
  EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY,
  GPU_LINE_CHART_QUERY_PARAM_KEY,
} from '../webapp_data_source/tb_feature_flag_data_source_types';
import {
  DeserializedState,
  PINNED_CARDS_KEY,
  SMOOTHING_KEY,
} from './dashboard_deeplink_provider_types';

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

  private getFeatureFlagStates(
    store: Store<State>
  ): Observable<SerializableQueryParams> {
    return combineLatest([
      store.select(selectors.getEnabledExperimentalPlugins),
      store.select(selectors.getOverriddenFeatureFlags),
    ]).pipe(
      map(([experimentalPlugins, overriddenFeatureFlags]) => {
        const queryParams = experimentalPlugins.map((pluginId) => {
          return {key: EXPERIMENTAL_PLUGIN_QUERY_PARAM_KEY, value: pluginId};
        });
        if (overriddenFeatureFlags.enableGpuChart !== undefined) {
          queryParams.push({
            key: GPU_LINE_CHART_QUERY_PARAM_KEY,
            value: String(overriddenFeatureFlags.enableGpuChart),
          });
        }
        return queryParams;
      })
    );
  }

  serializeStateToQueryParams(
    store: Store<State>
  ): Observable<SerializableQueryParams> {
    return combineLatest([
      this.getMetricsPinnedCards(store),
      this.getFeatureFlagStates(store),
      store.select(getMetricsScalarSmoothing).pipe(
        map((smoothing) => {
          if (smoothing === METRICS_SETTINGS_DEFAULT.scalarSmoothing) return [];
          return [{key: SMOOTHING_KEY, value: String(smoothing)}];
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
    for (const {key, value} of queryParams) {
      switch (key) {
        case PINNED_CARDS_KEY:
          pinnedCards = extractPinnedCardsFromURLText(value);
          break;
        case SMOOTHING_KEY:
          smoothing = Number(value);
          break;
      }
    }

    return {
      metrics: {
        pinnedCards: pinnedCards || [],
        smoothing,
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
