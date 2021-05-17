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

import {TooltipSort} from '../../metrics/internal_types';
import {
  getGlobalTimeSeriesIgnoreOutliers,
  getGlobalTimeSeriesSmoothing,
  getGlobalTimeSeriesTooltipSort,
} from './settings_selectors';
import {
  buildSettingsState,
  buildState,
  buildTimeSeriesSettings,
} from './testing';

describe('setings selectors test', () => {
  describe('#getGlobalTimeSeriesSmoothing', () => {
    beforeEach(() => {
      getGlobalTimeSeriesSmoothing.release();
    });

    it('returns smoothing settings', () => {
      const state = buildState(
        buildSettingsState({
          timeSeries: buildTimeSeriesSettings({
            scalarSmoothing: 0.5,
          }),
        })
      );
      expect(getGlobalTimeSeriesSmoothing(state)).toBe(0.5);
    });
  });

  describe('#getGlobalTimeSeriesTooltipSort', () => {
    beforeEach(() => {
      getGlobalTimeSeriesTooltipSort.release();
    });

    it('returns smoothing settings', () => {
      const state = buildState(
        buildSettingsState({
          timeSeries: buildTimeSeriesSettings({
            tooltipSort: TooltipSort.NEAREST,
          }),
        })
      );
      expect(getGlobalTimeSeriesTooltipSort(state)).toBe(TooltipSort.NEAREST);
    });
  });

  describe('#getGlobalTimeSeriesIgnoreOutliers', () => {
    beforeEach(() => {
      getGlobalTimeSeriesIgnoreOutliers.release();
    });

    it('returns smoothing settings', () => {
      const state = buildState(
        buildSettingsState({
          timeSeries: buildTimeSeriesSettings({
            ignoreOutliers: true,
          }),
        })
      );
      expect(getGlobalTimeSeriesIgnoreOutliers(state)).toBe(true);
    });
  });
});
