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
import * as actions from './hparams_actions';
import {
  DiscreteFilter,
  DiscreteHparamValue,
  DomainType,
  IntervalFilter,
} from '../types';
import {ExperimentToHparams, HparamsState} from './hparams_types';

const initialState: HparamsState = {data: {}};

const reducer: ActionReducer<HparamsState, Action> = createReducer(
  initialState,
  on(actions.hparamsDiscreteHparamFilterChanged, (state, action) => {
    const {experimentId, hparamName, filterValues, includeUndefined} = action;
    const data = state.data[experimentId];

    // Unknown experimentId. Ignore.
    if (!data) return state;

    const defaultFilter = data.hparam.defaultFilters.get(hparamName);
    if (!defaultFilter) {
      throw new Error(`Unknown hparams: ${hparamName}`);
    }

    if (defaultFilter.type === DomainType.INTERVAL) {
      throw new Error(
        `Invariant error: Hparams filter is INTERVAL but got a DISCRETE change`
      );
    }
    const existingFilter = {
      ...defaultFilter,
      ...data.hparam.filters.get(hparamName),
    } as DiscreteFilter;

    const newHparamFilters = new Map(data.hparam.filters);
    newHparamFilters.set(hparamName, {
      ...existingFilter,
      includeUndefined,
      filterValues,
    });

    return {
      ...state,
      data: {
        ...state.data,
        [experimentId]: {
          ...data,
          hparam: {
            ...data.hparam,
            filters: newHparamFilters,
          },
        },
      },
    };
  }),
  on(actions.hparamsIntervalHparamFilterChanged, (state, action) => {
    const {
      experimentId,
      hparamName,
      filterLowerValue,
      filterUpperValue,
      includeUndefined,
    } = action;

    const data = state.data[experimentId];

    // Unknown experimentId. Ignore.
    if (!data) return state;

    const defaultFilter = data.hparam.defaultFilters.get(hparamName);

    if (!defaultFilter) {
      throw new Error(`Unknown hparams: ${hparamName}`);
    }

    if (defaultFilter.type === DomainType.DISCRETE) {
      throw new Error(
        `Invariant error: Hparams filter is DISCRETE but got an INTERVAL change`
      );
    }
    const existingFilter = {
      ...defaultFilter,
      ...data.hparam.filters.get(hparamName),
    } as IntervalFilter;

    const newHparamFilters = new Map(data.hparam.filters);
    newHparamFilters.set(hparamName, {
      ...existingFilter,
      includeUndefined,
      filterLowerValue,
      filterUpperValue,
    });

    return {
      ...state,
      data: {
        ...state.data,
        [experimentId]: {
          ...data,
          hparam: {
            ...data.hparam,
            filters: newHparamFilters,
          },
        },
      },
    };
  }),
  on(actions.hparamsMetricFilterChanged, (state, action) => {
    const {
      experimentId,
      metricTag,
      filterLowerValue,
      filterUpperValue,
      includeUndefined,
    } = action;

    const data = state.data[experimentId];

    // Unknown experimentId. Ignore.
    if (!data) return state;

    const defaultFilter = data.metric.defaultFilters.get(metricTag);
    if (!defaultFilter) {
      throw new Error(`Unknown metric: ${metricTag}`);
    }
    const existingFilter = {
      ...defaultFilter,
      ...data.metric.filters.get(metricTag),
    } as IntervalFilter;

    const newMetricFilters = new Map(data.metric.filters);
    newMetricFilters.set(metricTag, {
      ...existingFilter,
      includeUndefined,
      filterLowerValue,
      filterUpperValue,
    });

    return {
      ...state,
      data: {
        ...state.data,
        [experimentId]: {
          ...data,
          metric: {
            ...data.metric,
            filters: newMetricFilters,
          },
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

    const eidToHparams: ExperimentToHparams = {...state.data};

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
      data: eidToHparams,
    };
  })
);

export function reducers(state: HparamsState | undefined, action: Action) {
  return reducer(state, action);
}
