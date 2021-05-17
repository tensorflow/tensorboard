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
  ignoreOutliersToggled,
  scalarSmoothingChanged,
  tooltipSortChanged,
} from './settings_actions';
import {reducers} from './settings_reducers';
import {buildSettingsState, buildTimeSeriesSettings} from './testing';

describe('setings reducers test', () => {
  describe('#tooltipSortChanged', () => {
    it('changes the setting', () => {
      const state = buildSettingsState({
        timeSeries: buildTimeSeriesSettings({
          tooltipSort: TooltipSort.ASCENDING,
        }),
      });

      const nextState = reducers(
        state,
        tooltipSortChanged({
          sort: TooltipSort.DEFAULT,
        })
      );

      expect(nextState.timeSeries.tooltipSort).toBe(TooltipSort.DEFAULT);
    });
  });

  describe('#scalarSmoothingChanged', () => {
    it('changes the setting', () => {
      const state = buildSettingsState({
        timeSeries: buildTimeSeriesSettings({
          scalarSmoothing: 0.1,
        }),
      });

      const nextState = reducers(
        state,
        scalarSmoothingChanged({
          smoothing: 0.4,
        })
      );

      expect(nextState.timeSeries.scalarSmoothing).toBe(0.4);
    });
  });

  describe('#ignoreOutliersToggled', () => {
    it('changes the setting', () => {
      const state = buildSettingsState({
        timeSeries: buildTimeSeriesSettings({
          ignoreOutliers: true,
        }),
      });

      const nextState = reducers(state, ignoreOutliersToggled());

      expect(nextState.timeSeries.ignoreOutliers).toBe(false);
    });
  });
});
