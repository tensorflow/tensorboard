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
  getRunsFromExperimentIds,
} from '../../../selectors';
import {DeepReadonly} from '../../../util/types';
import {
  getHparamFilterMapFromExperimentIds,
  getMetricFilterMapFromExperimentIds,
} from '../../../hparams/_redux/hparams_selectors';
import {
  DiscreteFilter,
  DiscreteHparamValue,
  DomainType,
  IntervalFilter,
} from '../../../hparams/types';
import {RunTableItem} from '../../../runs/views/runs_table/types';
import {matchRunToRegex} from '../../../util/matcher';
import {isSingleRunPlugin, PluginType} from '../../data_source';
import {getNonEmptyCardIdsWithMetadata, TagMetadata} from '../../store';
import {compareTagNames} from '../../utils';
import {CardIdWithMetadata} from '../metrics_view_types';

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

export function getRenderableRuns(experimentIds: string[]) {
  return createSelector(
    getRunsFromExperimentIds(experimentIds),
    getExperimentNames(experimentIds),
    getCurrentRouteRunSelection,
    getRunColorMap,
    getExperimentIdToExperimentAliasMap,
    (runs, experimentNames, selectionMap, colorMap, experimentIdToAlias) => {
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
}

function filterRunItemsByRegex(runItems: RunTableItem[], regexString: string) {
  if (!regexString) {
    return runItems;
  }

  // DO_NOT_SUBMIT
  // const shouldIncludeExperimentName = this.columns.includes(
  //   RunsTableColumn.EXPERIMENT_NAME
  // );
  const shouldIncludeExperimentName = false;
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
}

function matchFilter(
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
    // Auto-added to unblock TS5.0 migration
    //  @ts-ignore(go/ts50upgrade): Operator '<=' cannot be applied to types
    //  'number' and 'string | number | boolean'.
    // Auto-added to unblock TS5.0 migration
    //  @ts-ignore(go/ts50upgrade): Operator '<=' cannot be applied to types
    //  'string | number | boolean' and 'number'.
    return filter.filterLowerValue <= value && value <= filter.filterUpperValue;
  }
  return false;
}

function filterRunItemsByHparamAndMetricFilter(
  runItems: RunTableItem[],
  hparamFilters: Map<string, IntervalFilter | DiscreteFilter>,
  metricFilters: Map<string, IntervalFilter>
) {
  return runItems.filter(({hparams, metrics}) => {
    const hparamMatches = [...hparamFilters.entries()].every(
      ([hparamName, filter]) => {
        const value = hparams.get(hparamName);
        return matchFilter(filter, value);
      }
    );

    return (
      hparamMatches &&
      [...metricFilters.entries()].every(([metricTag, filter]) => {
        const value = metrics.get(metricTag);
        return matchFilter(filter, value);
      })
    );
  });
}

export function getFilteredRenderableRuns(experimentIds: string[]) {
  return createSelector(
    getRunSelectorRegexFilter,
    getRenderableRuns(experimentIds),
    getHparamFilterMapFromExperimentIds(experimentIds),
    getMetricFilterMapFromExperimentIds(experimentIds),
    (regexFilter, runItems, hparamFilters, metricFilters) => {
      const regexFilteredItems = filterRunItemsByRegex(runItems, regexFilter);

      return filterRunItemsByHparamAndMetricFilter(
        regexFilteredItems,
        hparamFilters,
        metricFilters
      );
    }
  );
}

export const getFilteredRenderableRunsFromRoute = createSelector(
  (state) => state,
  getExperimentIdsFromRoute,
  (state, experimentIds) => {
    return getFilteredRenderableRuns(experimentIds || [])(state);
  }
);

export const TEST_ONLY = {
  getRenderableCardIdsWithMetadata,
  getScalarTagsForRunSelection,
};
