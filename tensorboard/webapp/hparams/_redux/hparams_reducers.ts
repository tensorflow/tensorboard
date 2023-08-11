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
import {Action, ActionReducer, createReducer, on} from '@ngrx/store';
import {fetchRunsSucceeded} from '../../runs/actions';
import {
  DiscreteFilter,
  DiscreteHparamValue,
  DiscreteHparamValues,
  DomainType,
  IntervalFilter,
} from '../_types';
import * as actions from './hparams_actions';
import {ExperimentToHparams, HparamsState} from './types';
import {
  combineDefaultHparamFilters,
  combineDefaultMetricFilters,
  getIdFromExperimentIds,
} from './utils';

const initialState: HparamsState = {
  specs: {},
  filters: {},
  dashboardSpecs: {
    hparams: [],
    metrics: [],
  },
  dashboardSessionGroups: [],
};

const reducer: ActionReducer<HparamsState, Action> = createReducer(
  initialState,
  on(actions.hparamsDiscreteHparamFilterChanged, (state, action) => {
    const {experimentIds, hparamName, filterValues, includeUndefined} = action;
    const id = getIdFromExperimentIds(experimentIds);
    const filter = state.filters[id] ?? {
      hparams: new Map<string, DiscreteFilter | IntervalFilter>(),
    };

    const existingFilter = filter.hparams.get(hparamName);
    if (existingFilter && existingFilter.type !== DomainType.DISCRETE) {
      throw new RangeError(
        `New discrete filter of ${hparamName} conflicts existing filter of ` +
          DomainType[existingFilter.type]
      );
    }

    const defaultFilter = combineDefaultHparamFilters(
      experimentIds
        .filter((eid) => {
          return Boolean(state.specs[eid]);
        })
        .map((eid) => {
          return state.specs[eid].hparam.defaultFilters;
        })
    ).get(hparamName);

    if (!defaultFilter) {
      throw new Error(
        `Cannot set hparam, ${hparamName}, when it is not known for ` +
          `experimentIds: ${experimentIds.join(', ')}`
      );
    }

    if (defaultFilter.type !== DomainType.DISCRETE) {
      throw new Error(
        `Cannot set ${hparamName} when default filter is not of discrete type.`
      );
    }

    const possibleValues = new Set<DiscreteHparamValue>(
      defaultFilter.possibleValues
    );
    const illegalValues = [...filterValues].filter(
      (value) => !possibleValues.has(value)
    );
    if (illegalValues.length) {
      throw new Error(
        `New filter for ${hparamName} has more than one value that is not ` +
          `present in the spec. Bad values: ${illegalValues.join(', ')}`
      );
    }

    const newHparamFilters = new Map(filter.hparams);
    newHparamFilters.set(hparamName, {
      ...(existingFilter as DiscreteFilter | undefined),
      type: DomainType.DISCRETE,
      includeUndefined,
      possibleValues: [...possibleValues] as DiscreteHparamValues,
      filterValues,
    });

    return {
      ...state,
      filters: {
        ...state.filters,
        [id]: {
          ...filter,
          hparams: newHparamFilters,
        },
      },
    };
  }),
  on(actions.hparamsIntervalHparamFilterChanged, (state, action) => {
    const {
      experimentIds,
      hparamName,
      filterLowerValue,
      filterUpperValue,
      includeUndefined,
    } = action;
    const id = getIdFromExperimentIds(experimentIds);
    const filter = state.filters[id] ?? {
      metrics: new Map(),
      hparams: new Map(),
    };

    const existingFilter = filter.hparams.get(hparamName);
    if (existingFilter && existingFilter.type !== DomainType.INTERVAL) {
      throw new RangeError(
        `New interval filter of ${hparamName} conflicts existing filter of ` +
          DomainType[existingFilter.type]
      );
    }

    const defaultFilter = combineDefaultHparamFilters(
      experimentIds
        .filter((eid) => {
          return Boolean(state.specs[eid]);
        })
        .map((eid) => {
          return state.specs[eid].hparam.defaultFilters;
        })
    ).get(hparamName);

    if (!defaultFilter) {
      throw new Error(
        `Cannot set hpara, ${hparamName}, when it is not known for ` +
          `experimentIds: ${experimentIds.join(', ')}`
      );
    }

    if (defaultFilter.type !== DomainType.INTERVAL) {
      throw new Error(
        `Cannot set ${hparamName} when default filter is not of interval type.`
      );
    }

    const newHparamFilters = new Map(filter.hparams);
    newHparamFilters.set(hparamName, {
      ...(existingFilter as IntervalFilter | undefined),
      type: DomainType.INTERVAL,
      includeUndefined,
      minValue: defaultFilter.minValue,
      maxValue: defaultFilter.maxValue,
      filterLowerValue,
      filterUpperValue,
    });

    return {
      ...state,
      filters: {
        ...state.filters,
        [id]: {
          ...filter,
          hparams: newHparamFilters,
        },
      },
    };
  }),
  on(actions.hparamsMetricFilterChanged, (state, action) => {
    const {
      experimentIds,
      metricTag,
      filterLowerValue,
      filterUpperValue,
      includeUndefined,
    } = action;
    const id = getIdFromExperimentIds(experimentIds);
    const filter = state.filters[id] ?? {
      metrics: new Map(),
      hparams: new Map(),
    };

    const defaultFilter = combineDefaultMetricFilters(
      experimentIds
        .filter((eid) => {
          return Boolean(state.specs[eid]);
        })
        .map((eid) => {
          return state.specs[eid].metric.defaultFilters;
        })
    ).get(metricTag);

    if (!defaultFilter) {
      throw new Error(
        `Cannot set metric, ${metricTag}, when it is not known for ` +
          `experimentIds: ${experimentIds.join(', ')}`
      );
    }

    const existingFilter = filter.metrics.get(metricTag);
    const newMetricFilters = new Map(filter.metrics);
    newMetricFilters.set(metricTag, {
      ...(existingFilter as IntervalFilter | undefined),
      type: DomainType.INTERVAL,
      includeUndefined,
      minValue: defaultFilter.minValue,
      maxValue: defaultFilter.maxValue,
      filterLowerValue,
      filterUpperValue,
    } as IntervalFilter);

    return {
      ...state,
      filters: {
        ...state.filters,
        [id]: {
          ...filter,
          metrics: newMetricFilters,
        },
      },
    };
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
  on(fetchRunsSucceeded, (state, action) => {
    if (Object.keys(action.newRunsAndMetadata).length === 0) {
      return state;
    }

    const eidToHparams: ExperimentToHparams = {...state.specs};

    // Arbitrary ordered collection of metric values collected across
    // experiments and runs to compute extents of metrics.
    const metricValueMinAndMax = new Map<string, {min: number; max: number}>();
    const metricTags = new Set<string>();
    for (const eid of Object.keys(action.newRunsAndMetadata)) {
      const newHparamFilters = new Map<
        string,
        DiscreteFilter | IntervalFilter
      >();
      const newMetricFilters = new Map<string, IntervalFilter>();
      const discreteHparams = new Map<string, Set<DiscreteHparamValue>>();
      const intervalHparams = new Map<
        string,
        {minValue: number; maxValue: number}
      >();

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
        });
      }
      for (const metricTag of metricTags) {
        const minAndMax = metricValueMinAndMax.get(metricTag);
        const min = minAndMax?.min ?? 0;
        const max = minAndMax?.max ?? 0;
        newMetricFilters.set(metricTag, {
          type: DomainType.INTERVAL,
          includeUndefined: true,
          minValue: min,
          maxValue: max,
          filterLowerValue: min,
          filterUpperValue: max,
        });
      }

      eidToHparams[eid] = {
        hparam: {
          ...eidToHparams[eid]?.hparam,
          specs: metadata.hparamSpecs,
          defaultFilters: newHparamFilters,
        },
        metric: {
          ...eidToHparams[eid]?.metric,
          specs: metadata.metricSpecs,
          defaultFilters: newMetricFilters,
        },
      };
    }

    return {
      ...state,
      specs: eidToHparams,
    };
  }),
  on(actions.hparamsFetchSessionGroupsSucceeded, (state, action) => {
    const nextDashboardSpecs = action.hparamsAndMetricsSpecs;
    const nextDashboardSessionGroups = action.sessionGroups;

    return {
      ...state,
      dashboardSpecs: nextDashboardSpecs,
      dashboardSessionGroups: nextDashboardSessionGroups,
    };
  })
);

export function reducers(state: HparamsState | undefined, action: Action) {
  return reducer(state, action);
}
