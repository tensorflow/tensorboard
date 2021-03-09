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
import {
  Action,
  ActionReducer,
  combineReducers,
  createReducer,
  on,
} from '@ngrx/store';

import {createRouteContextedState} from '../../app_routing/route_contexted_reducer_helper';
import {DataLoadState} from '../../types/data';
import {SortDirection} from '../../types/ui';
import * as colorUtils from '../../util/colors';
import {composeReducers} from '../../util/ngrx';
import * as runsActions from '../actions';
import {
  DiscreteFilter,
  DiscreteHparamValue,
  DomainType,
  IntervalFilter,
} from '../types';
import {
  MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT,
  RunsDataState,
  RunsState,
  RunsUiRoutefulState,
  RunsUiRoutelessState,
  RunsUiState,
} from './runs_types';
import {serializeExperimentIds} from './utils';

const dataInitialState: RunsDataState = {
  runIds: {},
  runIdToExpId: {},
  runMetadata: {},
  runsLoadState: {},
  hparamAndMetricSpec: {},
  selectionState: new Map<string, Map<string, boolean>>(),
};

const dataReducer: ActionReducer<RunsDataState, Action> = createReducer(
  dataInitialState,
  on(runsActions.fetchRunsRequested, (state, action) => {
    const nextRunsLoadState = {...state.runsLoadState};
    for (const eid of action.requestedExperimentIds) {
      nextRunsLoadState[eid] = {
        lastLoadedTimeInMs: null,
        ...nextRunsLoadState[eid],
        state: DataLoadState.LOADING,
      };
    }

    return {...state, runsLoadState: nextRunsLoadState};
  }),
  on(runsActions.fetchRunsSucceeded, (state, action) => {
    const nextRunIds = {...state.runIds};
    const nextRunMetadata = {...state.runMetadata};
    const nextRunIdToExpId = {...state.runIdToExpId};
    const nextRunsLoadState = {...state.runsLoadState};
    const nextHparamAndMetricSpec = {...state.hparamAndMetricSpec};
    const nextSelectionState = new Map(state.selectionState);

    for (const eid of Object.keys(action.newRunsAndMetadata)) {
      const {runs, metadata} = action.newRunsAndMetadata[eid];
      nextRunIds[eid] = runs.map(({id}) => id);
      nextRunsLoadState[eid] = {
        ...nextRunsLoadState[eid],
        lastLoadedTimeInMs: Date.now(),
        state: DataLoadState.LOADED,
      };

      for (const run of runs) {
        const hparamAndMetrics = metadata.runToHparamsAndMetrics[run.id];
        nextRunMetadata[run.id] = {
          ...run,
          hparams: hparamAndMetrics ? hparamAndMetrics.hparams : null,
          metrics: hparamAndMetrics ? hparamAndMetrics.metrics : null,
        };
        nextRunIdToExpId[run.id] = eid;
      }

      nextHparamAndMetricSpec[eid] = {
        hparams: metadata.hparamSpecs,
        metrics: metadata.metricSpecs,
      };
    }

    const eidsBasedKey = serializeExperimentIds(action.experimentIds);
    if (!nextSelectionState.has(eidsBasedKey)) {
      const selectionMap = new Map<string, boolean>();
      const runSelected =
        action.runsForAllExperiments.length <=
        MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT;
      for (const run of action.runsForAllExperiments) {
        selectionMap.set(run.id, runSelected);
      }
      nextSelectionState.set(eidsBasedKey, selectionMap);
    } else {
      // There could be new runs that were previously unseen.
      // Populate their selection states.
      const selectionMap = new Map(nextSelectionState.get(eidsBasedKey)!);
      for (const run of action.runsForAllExperiments) {
        if (!selectionMap.has(run.id)) {
          selectionMap.set(run.id, false);
        }
      }
      nextSelectionState.set(eidsBasedKey, selectionMap);
    }

    return {
      ...state,
      runIds: nextRunIds,
      runIdToExpId: nextRunIdToExpId,
      runMetadata: nextRunMetadata,
      runsLoadState: nextRunsLoadState,
      hparamAndMetricSpec: nextHparamAndMetricSpec,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.fetchRunsFailed, (state, action) => {
    const nextRunsLoadState = {...state.runsLoadState};
    for (const eid of action.requestedExperimentIds) {
      nextRunsLoadState[eid] = {
        lastLoadedTimeInMs: null,
        ...nextRunsLoadState[eid],
        state: DataLoadState.FAILED,
      };
    }
    return {...state, runsLoadState: nextRunsLoadState};
  }),
  on(runsActions.runSelectionToggled, (state, {experimentIds, runId}) => {
    const stateKey = serializeExperimentIds(experimentIds);
    const nextSelectionState = new Map(state.selectionState);
    const subSelectionState = new Map(nextSelectionState.get(stateKey) ?? []);

    subSelectionState.set(runId, !Boolean(subSelectionState.get(runId)));
    nextSelectionState.set(stateKey, subSelectionState);

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.runPageSelectionToggled, (state, {experimentIds, runIds}) => {
    const stateKey = serializeExperimentIds(experimentIds);
    const nextSelectionState = new Map(state.selectionState);
    const subSelectionState = new Map(nextSelectionState.get(stateKey) ?? []);

    const nextValue = !runIds.every((runId) => {
      return Boolean(subSelectionState.get(runId));
    });
    for (const runId of runIds) {
      subSelectionState.set(runId, nextValue);
    }

    nextSelectionState.set(stateKey, subSelectionState);

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  }),
  on(runsActions.runsSelectAll, (state, {experimentIds}) => {
    const stateKey = serializeExperimentIds(experimentIds);
    const nextSelectionState = new Map(state.selectionState);
    const subSelectionState = new Map(nextSelectionState.get(stateKey) ?? []);

    for (const experimentId of experimentIds) {
      for (const runId of state.runIds[experimentId]) {
        subSelectionState.set(runId, true);
      }
    }

    nextSelectionState.set(stateKey, subSelectionState);

    return {
      ...state,
      selectionState: nextSelectionState,
    };
  })
);

const {
  initialState: uiInitialState,
  reducers: uiRouteContextReducers,
} = createRouteContextedState(
  {
    paginationOption: {
      pageIndex: 0,
      pageSize: 10,
    },
    regexFilter: '',
    sort: {
      key: null,
      direction: SortDirection.UNSET,
    },
    hparamFilters: new Map(),
    metricFilters: new Map(),
    runColorOverride: new Map(),
  } as RunsUiRoutefulState,
  {
    hparamDefaultFilters: new Map(),
    metricDefaultFilters: new Map(),
    defaultRunColor: new Map(),
  } as RunsUiRoutelessState
);

const uiReducer: ActionReducer<RunsUiState, Action> = createReducer(
  uiInitialState,
  on(
    runsActions.runSelectorPaginationOptionChanged,
    (state, {pageSize, pageIndex}) => {
      return {
        ...state,
        paginationOption: {
          pageSize,
          pageIndex,
        },
      };
    }
  ),
  on(runsActions.runSelectorRegexFilterChanged, (state, action) => {
    return {
      ...state,
      regexFilter: action.regexString,
      paginationOption: {
        ...state.paginationOption,
        // Reset the page index to 0 to emulate mat-table behavior.
        pageIndex: 0,
      },
    };
  }),
  on(runsActions.runSelectorSortChanged, (state, action) => {
    return {
      ...state,
      sort: {
        key: action.key,
        direction: action.direction,
      },
    };
  }),
  on(runsActions.fetchRunsSucceeded, (state, action) => {
    const nextDefaultRunColor = new Map(state.defaultRunColor);

    action.runsForAllExperiments
      .filter((run) => !Boolean(nextDefaultRunColor.get(run.id)))
      .forEach((run) => {
        nextDefaultRunColor.set(run.id, colorUtils.getNextChartColor());
      });

    return {
      ...state,
      defaultRunColor: nextDefaultRunColor,
    };
  }),
  on(runsActions.runColorChanged, (state, {runId, newColor}) => {
    const nextRunColorOverride = new Map(state.runColorOverride);

    nextRunColorOverride.set(runId, newColor);

    return {...state, runColorOverride: nextRunColorOverride};
  }),
  on(
    runsActions.runDiscreteHparamFilterChanged,
    (state, {hparamName, filterValues, includeUndefined}) => {
      const defaultFilter = state.hparamDefaultFilters.get(hparamName);
      if (!defaultFilter) {
        throw new Error(`Unknown hparams: ${hparamName}`);
      }
      if (defaultFilter.type === DomainType.INTERVAL) {
        throw new Error(
          `Invariant error: Hparams filter is INTERVAL but got a ' +
               'DISCRETE change`
        );
      }

      const existingFilter = {
        ...defaultFilter,
        ...state.hparamFilters.get(hparamName),
      } as DiscreteFilter;
      const newHparamFilters = new Map(state.hparamFilters);
      newHparamFilters.set(hparamName, {
        ...existingFilter,
        includeUndefined,
        filterValues,
      });
      return {...state, hparamFilters: newHparamFilters};
    }
  ),
  on(runsActions.runIntervalHparamFilterChanged, (state, action) => {
    const {
      hparamName,
      filterLowerValue,
      filterUpperValue,
      includeUndefined,
    } = action;
    const defaultFilter = state.hparamDefaultFilters.get(hparamName);
    if (!defaultFilter) {
      throw new Error(`Unknown hparams: ${hparamName}`);
    }
    if (defaultFilter.type === DomainType.DISCRETE) {
      throw new Error(
        `Invariant error: Hparams filter is DISCRETE but got a ' +
               'INTERVAL change`
      );
    }

    const existingFilter = {
      ...defaultFilter,
      ...state.hparamFilters.get(hparamName),
    } as IntervalFilter;
    const newHparamFilters = new Map(state.hparamFilters);
    newHparamFilters.set(hparamName, {
      ...existingFilter,
      includeUndefined,
      filterLowerValue,
      filterUpperValue,
    });
    return {...state, hparamFilters: newHparamFilters};
  }),
  on(runsActions.runMetricFilterChanged, (state, change) => {
    const {
      metricTag,
      filterLowerValue,
      filterUpperValue,
      includeUndefined,
    } = change;
    const defaultFilter = state.metricDefaultFilters.get(metricTag);
    if (!defaultFilter) {
      throw new Error(`Unknown metric: ${metricTag}`);
    }

    const existingFilter = {
      ...defaultFilter,
      ...state.metricFilters.get(metricTag),
    } as IntervalFilter;
    const newMetricFilters = new Map(state.metricFilters);
    newMetricFilters.set(metricTag, {
      ...existingFilter,
      filterLowerValue,
      filterUpperValue,
      includeUndefined,
    });
    return {...state, metricFilters: newMetricFilters};
  }),
  /**
   * Sets default filter values.
   *
   * Implementation note: hparam values are defined as part of the spec but
   * metrics are defined with the `runToHparamsAndMetrics`. We need to collect
   * all the values for metrics, then compute the bound to create the default
   * filter value. When the metric values are missing, we set the bound to (0,
   * 1).
   */
  on(runsActions.fetchRunsSucceeded, (state, action) => {
    if (Object.keys(action.newRunsAndMetadata).length === 0) {
      return state;
    }

    const newHparamFilters = new Map<string, DiscreteFilter | IntervalFilter>();
    const newMetricFilters = new Map<string, IntervalFilter>();

    const discreteHparams = new Map<string, Set<DiscreteHparamValue>>();
    const intervalHparams = new Map<
      string,
      {minValue: number; maxValue: number}
    >();
    // Arbitrary ordered collection of metric values collected across
    // experiments and runs to compute extents of metrics.
    const metricValueMinAndMax = new Map<string, {min: number; max: number}>();
    const metricTags = new Set<string>();

    for (const eid of Object.keys(action.newRunsAndMetadata)) {
      const {runs, metadata} = action.newRunsAndMetadata[eid];
      // Tabulate all the metric values from runs.
      for (const run of runs) {
        const hparamAndMetrics = metadata.runToHparamsAndMetrics[run.id];
        if (!hparamAndMetrics) {
          continue;
        }
        for (const metric of hparamAndMetrics.metrics) {
          const minAndMax = metricValueMinAndMax.get(metric.tag);
          metricValueMinAndMax.set(metric.tag, {
            min: minAndMax
              ? Math.min(minAndMax.min, metric.value)
              : metric.value,
            max: minAndMax
              ? Math.max(minAndMax.max, metric.value)
              : metric.value,
          });
        }
      }

      // Record and combine all hparam specs (multiple experiments can
      // have hparams of same name but disjoint set of domain).
      for (const {name, domain} of metadata.hparamSpecs) {
        if (domain.type === DomainType.DISCRETE) {
          const values = discreteHparams.get(name) || new Set();
          for (const value of domain.values) {
            values.add(value);
          }
          discreteHparams.set(name, values);
        } else {
          const existing = intervalHparams.get(name);
          intervalHparams.set(name, {
            minValue: existing
              ? Math.min(domain.minValue, existing.minValue)
              : domain.minValue,
            maxValue: existing
              ? Math.max(domain.maxValue, existing.maxValue)
              : domain.maxValue,
          });
        }
      }

      for (const metricSpec of metadata.metricSpecs) {
        metricTags.add(metricSpec.tag);
      }
    }

    for (const [name, values] of discreteHparams) {
      newHparamFilters.set(name, {
        type: DomainType.DISCRETE,
        includeUndefined: true,
        possibleValues: [...values],
        filterValues: [...values],
      } as DiscreteFilter);
    }

    for (const [name, {minValue, maxValue}] of intervalHparams) {
      newHparamFilters.set(name, {
        type: DomainType.INTERVAL,
        includeUndefined: true,
        minValue,
        maxValue,
        filterLowerValue: minValue,
        filterUpperValue: maxValue,
      } as IntervalFilter);
    }

    for (const metricTag of metricTags) {
      const minAndMax = metricValueMinAndMax.get(metricTag);

      newMetricFilters.set(metricTag, {
        type: DomainType.INTERVAL,
        includeUndefined: true,
        minValue: minAndMax?.min ?? 0,
        maxValue: minAndMax?.max ?? 0,
        filterLowerValue: minAndMax?.min ?? 0,
        filterUpperValue: minAndMax?.max ?? 0,
      });
    }

    return {
      ...state,
      hparamDefaultFilters: newHparamFilters,
      metricDefaultFilters: newMetricFilters,
    };
  })
);

const routeStatefulUiReducers = composeReducers(
  uiReducer,
  uiRouteContextReducers
);

/**
 * Reducers for the experiments.
 */
export function reducers(state: RunsState, action: Action) {
  return combineReducers({
    data: dataReducer,
    ui: routeStatefulUiReducers,
  })(state, action);
}
