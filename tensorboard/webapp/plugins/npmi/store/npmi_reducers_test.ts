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
import * as actions from '../actions';
import {reducers} from './npmi_reducers';
import {DataLoadState} from './npmi_types';
import {createNpmiState} from '../testing';

describe('npmi_reducers', () => {
  describe('Data loading', () => {
    it('sets pluginDataLoaded to loading on requesting Data', () => {
      const state = createNpmiState();
      const nextState = reducers(state, actions.npmiPluginDataRequested());
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADING);
      expect(nextState.pluginDataLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('set pluginDataLoaded to failed on request failure', () => {
      const state = createNpmiState({
        pluginDataLoaded: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        },
      });
      const nextState = reducers(state, actions.npmiPluginDataRequestFailed());
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.FAILED);
      expect(nextState.pluginDataLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('sets pluginDataLoaded & plugin Data on successful load', () => {
      const state = createNpmiState();
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.npmiPluginDataLoaded({
          annotations: {
            run_1: ['annotation_1', 'annotation_2'],
          },
          metrics: {
            run_1: [
              'count@test2',
              'count',
              'nPMI@test1',
              'count@test1',
              'nPMI@test2',
            ],
          },
          values: {
            run_1: [
              [513767, 3510517, 0.16871, 16719, -0.37206],
              [638967, 1396813, 0.687616, 1896, 0.68116],
            ],
          },
        })
      );
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADED);
      expect(
        nextState.pluginDataLoaded.lastLoadedTimeInMs
      ).toBeGreaterThanOrEqual(t0);
      expect(nextState.annotationsData).toEqual({
        run_1: ['annotation_1', 'annotation_2'],
      });
      expect(nextState.countMetricsData).toEqual({
        run_1: ['count@test2', 'count@test1'],
      });
      expect(nextState.npmiMetricsData).toEqual({
        run_1: ['nPMI@test1', 'nPMI@test2'],
      });
      expect(nextState.countValuesData).toEqual({
        run_1: [[513767, 16719], [638967, 1896]],
      });
      expect(nextState.npmiValuesData).toEqual({
        run_1: [[0.16871, -0.37206], [0.687616, 0.68116]],
      });
      expect(nextState.countData).toEqual({
        run_1: [3510517, 1396813],
      });
    });

    it('overrides existing annotations on successful annotations loading', () => {
      const state = createNpmiState({
        pluginDataLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 0,
        },
        annotationsData: {
          run_1: ['annotation_1', 'annotation_2'],
        },
        npmiMetricsData: {
          run_1: ['nPMI@test1', 'nPMI@test2'],
        },
        countMetricsData: {
          run_1: ['count@test1', 'count@test2'],
        },

        npmiValuesData: {
          run_1: [[0.16871, -0.37206], [0.687616, 0.68116]],
        },
        countValuesData: {
          run_1: [[16719, 513767], [1896, 638967]],
        },
        countData: {
          run_1: [3510517, 1396813],
        },
      });
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.npmiPluginDataLoaded({
          annotations: {
            run_1: ['annotation_new_1', 'annotation_new_2'],
          },
          metrics: {
            run_1: [
              'count',
              'count@newtest1',
              'count@newtest2',
              'nPMI@newtest1',
              'nPMI@newtest2',
            ],
          },
          values: {
            run_1: [
              [351051, 1671, 51376, 0.1687, -0.372],
              [139681, 189, 63896, 0.68761, 0.6811],
            ],
          },
        })
      );
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADED);
      expect(
        nextState.pluginDataLoaded.lastLoadedTimeInMs
      ).toBeGreaterThanOrEqual(t0);
      expect(nextState.annotationsData).toEqual({
        run_1: ['annotation_new_1', 'annotation_new_2'],
      });
      expect(nextState.countMetricsData).toEqual({
        run_1: ['count@newtest1', 'count@newtest2'],
      });
      expect(nextState.npmiMetricsData).toEqual({
        run_1: ['nPMI@newtest1', 'nPMI@newtest2'],
      });
      expect(nextState.countValuesData).toEqual({
        run_1: [[1671, 51376], [189, 63896]],
      });
      expect(nextState.npmiValuesData).toEqual({
        run_1: [[0.1687, -0.372], [0.68761, 0.6811]],
      });
      expect(nextState.countData).toEqual({
        run_1: [351051, 139681],
      });
    });
  });
});
