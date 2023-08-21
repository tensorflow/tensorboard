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

import {
  DiscreteFilter,
  DiscreteHparamValue,
  DiscreteHparamValues,
  DomainType,
  HparamSpec,
  IntervalFilter,
  MetricSpec,
} from '../types';
import {HparamFilter, MetricFilter} from './types';

export function getIdFromExperimentIds(experimentIds: string[]): string {
  return JSON.stringify([...experimentIds].sort());
}

export function combineDefaultHparamFilters(
  filterMaps: Array<Map<string, DiscreteFilter | IntervalFilter>>
): Map<string, DiscreteFilter | IntervalFilter> {
  const combinedHparams = new Map<string, DiscreteFilter | IntervalFilter>();
  const discreteHparamsVals = new Map<
    string,
    {
      possibleValues: Set<DiscreteHparamValue>;
      values: Set<DiscreteHparamValue>;
    }
  >();
  const intervalHparamsBounds = new Map<
    string,
    {
      minValue: number;
      maxValue: number;
      filterLowerValue: number;
      filterUpperValue: number;
    }
  >();

  for (const filterMap of filterMaps) {
    for (const [name, filter] of filterMap) {
      if (filter.type === DomainType.DISCRETE) {
        const {possibleValues, values} = discreteHparamsVals.get(name) || {
          possibleValues: new Set(),
          values: new Set(),
        };
        for (const value of filter.filterValues) {
          values.add(value);
        }
        for (const value of filter.possibleValues) {
          possibleValues.add(value);
        }
        discreteHparamsVals.set(name, {possibleValues, values});
      } else {
        const existing = intervalHparamsBounds.get(name);
        intervalHparamsBounds.set(name, {
          filterLowerValue: Math.min(
            filter.filterLowerValue,
            existing?.filterLowerValue ?? Infinity
          ),
          filterUpperValue: Math.max(
            filter.filterUpperValue,
            existing?.filterUpperValue ?? -Infinity
          ),
          minValue: Math.min(filter.minValue, existing?.minValue ?? Infinity),
          maxValue: Math.max(filter.maxValue, existing?.maxValue ?? -Infinity),
        });
      }
    }
  }

  for (const [name, {values, possibleValues}] of discreteHparamsVals) {
    combinedHparams.set(name, {
      type: DomainType.DISCRETE,
      includeUndefined: true,
      possibleValues: [...possibleValues] as DiscreteHparamValues,
      filterValues: [...values] as DiscreteHparamValues,
    });
  }

  for (const [
    name,
    {minValue, maxValue, filterLowerValue, filterUpperValue},
  ] of intervalHparamsBounds) {
    if (combinedHparams.has(name)) {
      const existingHparam = combinedHparams.get(name)!;
      // Reconcile incompatible filters if discrete one is empty or has
      // empty values.
      if (
        existingHparam.type === DomainType.DISCRETE &&
        existingHparam.possibleValues.some((value) => value)
      ) {
        throw new RangeError(
          `Cannot combine hparam, ${name}, as it is of mixed types.`
        );
      }
    }

    combinedHparams.set(name, {
      type: DomainType.INTERVAL,
      includeUndefined: true,
      minValue,
      maxValue,
      filterLowerValue,
      filterUpperValue,
    } as IntervalFilter);
  }

  return combinedHparams;
}

export function combineDefaultMetricFilters(
  filterMaps: Array<Map<string, IntervalFilter>>
): Map<string, IntervalFilter> {
  const intervalMetrics = new Map<string, IntervalFilter>();

  for (const filterMap of filterMaps) {
    for (const [name, filter] of filterMap) {
      const existing = intervalMetrics.get(name);

      intervalMetrics.set(name, {
        type: DomainType.INTERVAL,
        includeUndefined: true,
        ...existing,
        minValue: Math.min(filter.minValue, existing?.minValue ?? Infinity),
        maxValue: Math.max(filter.maxValue, existing?.maxValue ?? -Infinity),
        filterLowerValue: Math.min(
          filter.filterLowerValue,
          existing?.filterLowerValue ?? Infinity
        ),
        filterUpperValue: Math.max(
          filter.filterUpperValue,
          existing?.filterUpperValue ?? -Infinity
        ),
      });
    }
  }

  return intervalMetrics;
}

export function hparamSpecToDefaultFilter(spec: HparamSpec): HparamFilter {
  if (spec.domain.type === DomainType.DISCRETE) {
    return {
      type: DomainType.DISCRETE,
      includeUndefined: true,
      possibleValues: spec.domain.values,
      filterValues: spec.domain.values,
    };
  }

  return {
    type: DomainType.INTERVAL,
    includeUndefined: true,
    minValue: spec.domain.minValue,
    maxValue: spec.domain.maxValue,
    filterLowerValue: spec.domain.minValue,
    filterUpperValue: spec.domain.maxValue,
  };
}

export function metricSpecToDefaultFilter(spec: MetricSpec): MetricFilter {
  return {
    type: DomainType.INTERVAL,
    includeUndefined: true,
    minValue: -Infinity,
    maxValue: Infinity,
    filterLowerValue: -Infinity,
    filterUpperValue: Infinity,
  };
}
