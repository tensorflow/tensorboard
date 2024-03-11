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

import {DeepPartial} from '../../util/types';
import {
  DatasetType,
  DomainType,
  HparamSpec,
  HparamValue,
  HparamsValueType,
  MetricsValue,
  RunStatus,
  Session,
  SessionGroup,
} from '../_types';
import {HparamsState, HPARAMS_FEATURE_KEY, State} from './types';

export function buildHparamsState(
  overrides: DeepPartial<HparamsState> = {}
): HparamsState {
  return {
    dashboardHparamSpecs: overrides.dashboardHparamSpecs ?? [],
    dashboardSessionGroups: overrides.dashboardSessionGroups ?? [],
    dashboardFilters: {
      hparams: overrides.dashboardFilters?.hparams ?? new Map(),
      metrics: overrides.dashboardFilters?.metrics ?? new Map(),
    },
    dashboardDisplayedHparamColumns:
      overrides.dashboardDisplayedHparamColumns ?? [],
    numDashboardHparamsLoaded: overrides.numDashboardHparamsLoaded ?? 0,
    numDashboardHparamsToLoad: overrides.numDashboardHparamsToLoad ?? 0,
  } as HparamsState;
}

export function buildStateFromHparamsState(hparamsState: HparamsState): State {
  return {[HPARAMS_FEATURE_KEY]: hparamsState};
}

export function buildHparamSpec(
  override: Partial<HparamSpec> = {}
): HparamSpec {
  return {
    description: '',
    displayName: 'Sample Param',
    domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
    name: 'sample_param',
    type: HparamsValueType.DATA_TYPE_FLOAT64,
    differs: false,
    ...override,
  };
}

export function buildMetricsValue(
  override: DeepPartial<MetricsValue> = {}
): MetricsValue {
  return {
    trainingStep: 0,
    value: 1,
    wallTimeSecs: 123,
    ...override,
    name: {
      tag: override.name?.tag ?? 'someTag',
      group: override.name?.group ?? 'someGroup',
    },
  };
}

export function buildHparamValue(override: Partial<HparamValue>): HparamValue {
  return {
    name: 'some_hparam',
    value: 4,
    ...override,
  };
}

export function buildSession(override: DeepPartial<Session> = {}): Session {
  return {
    name: 'someExperiment/someRun',
    modelUri: '',
    monitorUrl: '',
    startTimeSecs: 123,
    endTimeSecs: 456,
    status: RunStatus.STATUS_UNKNOWN,
    ...override,
    metricValues: [...(override.metricValues ?? [])].map(buildMetricsValue),
  };
}

export function buildSessionGroup(
  override: DeepPartial<SessionGroup>
): SessionGroup {
  return {
    name: 'some_session_group',
    ...override,
    hparams: {
      ...override.hparams,
    } as any,
    sessions: (override.sessions ?? []).map(buildSession),
  };
}
