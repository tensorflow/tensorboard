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
import {TooltipSort} from '../../metrics/types';

export const SETTINGS_FEATURE_KEY = 'globlalSettings';

export interface SettingsState {
  /**
   * Design consideration
   * Following states are closely related to timeSeries/metrics feature and can
   * be moved to that feature accordingly. However, because settings is shared
   * by TensorBoard variants and not all versions has dependency on metrics
   * feature, without DI to programmatically inject templates, we added
   * inter-experiment global settings here, instead.
   */
  timeSeries: {
    tooltipSort: TooltipSort;
    ignoreOutliers: boolean;
    scalarSmoothing: number;
  };
}

export interface State {
  [SETTINGS_FEATURE_KEY]?: SettingsState;
}

export const DEFAULT_TIMESERIES_SETTINGS: SettingsState['timeSeries'] = {
  tooltipSort: TooltipSort.DESCENDING,
  ignoreOutliers: false,
  scalarSmoothing: 0,
};
