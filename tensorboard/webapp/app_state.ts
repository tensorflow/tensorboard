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

import {State as AlertState} from './alert/store/alert_types';
import {State as AppRoutingState} from './app_routing/store/app_routing_types';
import {State as CoreState} from './core/store/core_types';
import {State as ExperimentsState} from './experiments/store/experiments_types';
import {State as FeatureFlagState} from './feature_flag/store/feature_flag_types';
import {State as HparamsState} from './hparams/types';
import {State as MetricsState} from './metrics/store/metrics_types';
import {State as NotificationState} from './notification_center/_redux/notification_center_types';
import {State as PersistentSettingsState} from './persistent_settings/_redux/persistent_settings_types';
import {State as RunsState} from './runs/store/runs_types';
import {State as SettingsState} from './settings';

export type State = AppRoutingState &
  CoreState &
  ExperimentsState &
  FeatureFlagState &
  HparamsState &
  MetricsState &
  RunsState &
  SettingsState &
  NotificationState &
  AlertState &
  PersistentSettingsState;
