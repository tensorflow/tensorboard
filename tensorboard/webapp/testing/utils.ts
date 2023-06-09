/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {provideMockStore} from '@ngrx/store/testing';
import {createState as createDebuggerState} from '../../plugins/debugger_v2/tf_debugger_v2_plugin/testing';
import {
  buildAlertState,
  buildStateFromAlertState,
} from '../alert/store/testing';
import {APP_ROUTING_FEATURE_KEY} from '../app_routing/store/app_routing_types';
import {
  buildAppRoutingState,
  buildStateFromAppRoutingState,
} from '../app_routing/store/testing';
import {State} from '../app_state';
import {createState as createCoreState} from '../core/testing';
import {EXPERIMENTS_FEATURE_KEY} from '../experiments/store/experiments_types';
import {
  buildExperimentState,
  buildStateFromExperimentsState,
} from '../experiments/store/testing';
import {FEATURE_FLAG_FEATURE_KEY} from '../feature_flag/store/feature_flag_types';
import {
  buildFeatureFlagState,
  buildState as buildStateFromFeatureFlagsState,
} from '../feature_flag/store/testing';
import {
  buildHparamsState,
  buildStateFromHparamsState,
} from '../hparams/_redux/testing';
import {METRICS_FEATURE_KEY} from '../metrics/store';
import {appStateFromMetricsState, buildMetricsState} from '../metrics/testing';
import {NOTIFICATION_FEATURE_KEY} from '../notification_center/_redux/notification_center_types';
import {
  buildNotificationState,
  buildStateFromNotificationState,
} from '../notification_center/_redux/testing';
import {
  buildPersistentSettingsState,
  buildStateFromPersistentSettingsState,
} from '../persistent_settings/_redux/testing';
import {RUNS_FEATURE_KEY} from '../runs/store/runs_types';
import {buildRunsState, buildStateFromRunsState} from '../runs/store/testing';
import {
  createState as createSettings,
  createSettingsState,
} from '../settings/testing';
import {HPARAMS_FEATURE_KEY} from '../hparams/_redux/types';

export function buildMockState(overrides: Partial<State> = {}): State {
  return {
    ...createDebuggerState(),
    ...buildFeatureFlagState(overrides[FEATURE_FLAG_FEATURE_KEY]),
    ...buildStateFromAlertState(buildAlertState({})),
    ...buildStateFromPersistentSettingsState(buildPersistentSettingsState({})),
    ...createCoreState(),
    ...appStateFromMetricsState(
      buildMetricsState(overrides[METRICS_FEATURE_KEY])
    ),
    ...createSettings(createSettingsState()),
    ...buildStateFromRunsState(
      buildRunsState(
        overrides[RUNS_FEATURE_KEY]?.data,
        overrides[RUNS_FEATURE_KEY]?.ui
      )
    ),
    ...buildStateFromExperimentsState(
      buildExperimentState(overrides[EXPERIMENTS_FEATURE_KEY]?.data)
    ),
    ...buildStateFromAppRoutingState(
      buildAppRoutingState(overrides[APP_ROUTING_FEATURE_KEY])
    ),
    ...buildStateFromFeatureFlagsState(buildFeatureFlagState()),
    ...buildStateFromHparamsState(
      buildHparamsState(
        overrides[HPARAMS_FEATURE_KEY]?.specs,
        overrides[HPARAMS_FEATURE_KEY]?.filters
      )
    ),
    ...buildStateFromNotificationState(
      buildNotificationState(overrides[NOTIFICATION_FEATURE_KEY] || {})
    ),
  };
}

export function provideMockTbStore() {
  return provideMockStore({
    initialState: buildMockState(),
  });
}
