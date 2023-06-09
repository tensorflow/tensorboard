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
  getExperimentIdsFromRoute,
  getExperimentIdToExperimentAliasMap,
  getExperimentNames,
  getRunColorMap,
  getRunSelectorRegexFilter,
  getRouteKind,
  getRunsFromExperimentIds,
  getColumnHeadersForCard,
  getCardMetadata,
} from '../../../selectors';
import {DeepReadonly} from '../../../util/types';
import {
  getHparamFilterMapFromExperimentIds,
  getMetricFilterMapFromExperimentIds,
  getExperimentsHparamsAndMetricsSpecs,
} from '../../../hparams/_redux/hparams_selectors';
import {
  DiscreteFilter,
  DiscreteHparamValue,
  DomainType,
  IntervalFilter,
} from '../../../hparams/types';
import {
  RunTableItem,
  RunTableExperimentItem,
} from '../../../runs/views/runs_table/types';
import {matchRunToRegex} from '../../../util/matcher';
import {isSingleRunPlugin, PluginType} from '../../data_source';
import {getNonEmptyCardIdsWithMetadata, TagMetadata} from '../../store';
import {compareTagNames} from '../../utils';
import {CardIdWithMetadata} from '../metrics_view_types';
import {RouteKind} from '../../../app_routing/types';
import {memoize} from '../../../util/memoize';
import {
  ColumnHeader,
  ColumnHeaderType,
} from '../card_renderer/scalar_card_types';

export const getScalarTagsForRunSelection = createSelector(
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
  getScalarTagsForRunSelection,
  (
    cardList,
    runSelectionMap,
    hideEmptyScalarCards,
    scalarTagsForRunSelection
  ) => {
    const areAnyRunsSelected = Array.from(runSelectionMap?.values() || []).some(
      Boolean
    );
    return cardList.filter((card) => {
      if (!isSingleRunPlugin(card.plugin)) {
        if (
          hideEmptyScalarCards &&
          areAnyRunsSelected &&
          card.plugin === PluginType.SCALARS
        ) {
          return scalarTagsForRunSelection.has(card.tag);
        }
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

const utils = {
  filterRunItemsByRegex(
    runItems: RunTableItem[],
    regexString: string,
    shouldIncludeExperimentName: boolean
  ): RunTableItem[] {
    if (!regexString) {
      return runItems;
    }

    return runItems.filter((item) => {
      return matchRunToRegex(
        {
          runName: item.run.name,
          experimentAlias: item.experimentAlias,
        },
        regexString,
        shouldIncludeExperimentName
      );
    });
  },

  matchFilter(
    filter: DiscreteFilter | IntervalFilter,
    value: number | DiscreteHparamValue | undefined
  ): boolean {
    if (value === undefined) {
      return filter.includeUndefined;
    }
    if (filter.type === DomainType.DISCRETE) {
      // (upcast to work around bad TypeScript libdefs)
      const values: Readonly<Array<typeof filter.filterValues[number]>> =
        filter.filterValues;
      return values.includes(value);
    } else if (filter.type === DomainType.INTERVAL) {
      return (
        typeof value === 'number' &&
        filter.filterLowerValue <= value &&
        value <= filter.filterUpperValue
      );
    }
    return false;
  },

  filterRunItemsByHparamAndMetricFilter(
    runItems: RunTableItem[],
    hparamFilters: Map<string, IntervalFilter | DiscreteFilter>,
    metricFilters: Map<string, IntervalFilter>
  ) {
    return runItems.filter(({hparams, metrics}) => {
      const hparamMatches = [...hparamFilters.entries()].every(
        ([hparamName, filter]) => {
          const value = hparams.get(hparamName);
          return utils.matchFilter(filter, value);
        }
      );

      const metricMatches = [...metricFilters.entries()].every(
        ([metricTag, filter]) => {
          const value = metrics.get(metricTag);
          return utils.matchFilter(filter, value);
        }
      );

      return hparamMatches && metricMatches;
    });
  },
};

const getRenderableRuns = memoize((experimentIds: string[]) => {
  return createSelector(
    getRunsFromExperimentIds(experimentIds),
    getExperimentNames(experimentIds),
    getCurrentRouteRunSelection,
    getRunColorMap,
    getExperimentIdToExperimentAliasMap,
    (
      runs,
      experimentNames,
      selectionMap,
      colorMap,
      experimentIdToAlias
    ): Array<RunTableExperimentItem> => {
      return runs.map((run) => {
        const hparamMap: RunTableItem['hparams'] = new Map();
        (run.hparams || []).forEach((hparam) => {
          hparamMap.set(hparam.name, hparam.value);
        });
        const metricMap: RunTableItem['metrics'] = new Map();
        (run.metrics || []).forEach((metric) => {
          metricMap.set(metric.tag, metric.value);
        });
        return {
          run,
          experimentName: experimentNames[run.experimentId] || '',
          experimentAlias: experimentIdToAlias[run.experimentId],
          selected: Boolean(selectionMap && selectionMap.get(run.id)),
          runColor: colorMap[run.id],
          hparams: hparamMap,
          metrics: metricMap,
        };
      });
    }
  );
});

const getFilteredRenderableRuns = memoize((experimentIds: string[]) => {
  return createSelector(
    getRunSelectorRegexFilter,
    getRenderableRuns(experimentIds),
    getHparamFilterMapFromExperimentIds(experimentIds),
    getMetricFilterMapFromExperimentIds(experimentIds),
    getRouteKind,
    (regexFilter, runItems, hparamFilters, metricFilters, routeKind) => {
      const regexFilteredItems = utils.filterRunItemsByRegex(
        runItems,
        regexFilter,
        routeKind === RouteKind.COMPARE_EXPERIMENT
      );

      return utils.filterRunItemsByHparamAndMetricFilter(
        regexFilteredItems,
        hparamFilters,
        metricFilters
      );
    }
  );
});

export const getFilteredRenderableRunsFromRoute = createSelector(
  (state) => state,
  getExperimentIdsFromRoute,
  (state, experimentIds) => {
    return getFilteredRenderableRuns(experimentIds || [])(state);
  }
);

export const getFilteredRenderableRunsIdsFromRoute = createSelector(
  getFilteredRenderableRunsFromRoute,
  (filteredRenderableRuns) => {
    return new Set(filteredRenderableRuns.map(({run: {id}}) => id));
  }
);

export const getPotentialHparamColumns = createSelector(
  (state: State) => state,
  getExperimentIdsFromRoute,
  (state, experimentIds): ColumnHeader[] => {
    if (!experimentIds) {
      return [];
    }

    const {hparams} = getExperimentsHparamsAndMetricsSpecs(state, {
      experimentIds,
    });

    return hparams.map((spec) => ({
      type: ColumnHeaderType.HPARAM,
      name: spec.name,
      // According to the api spec when the displayName is empty, the name should
      // be displayed tensorboard/plugins/hparams/api.proto
      displayName: spec.displayName || spec.name,
      enabled: false,
    }));
  }
);

export const getAllPotentialColumnsForCard = memoize((cardId: string) => {
  return createSelector(
    getColumnHeadersForCard(cardId),
    getPotentialHparamColumns,
    (staticColumnHeaders, potentialHparamColumns) => {
      return [...staticColumnHeaders, ...potentialHparamColumns];
    }
  );
});

export const factories = {
  getRenderableRuns,
  getFilteredRenderableRuns,
};

export const TEST_ONLY = {
  getRenderableCardIdsWithMetadata,
  getScalarTagsForRunSelection,
  utils,
};
