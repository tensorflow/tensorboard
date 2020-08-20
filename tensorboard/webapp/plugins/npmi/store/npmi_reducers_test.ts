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
          annotationData: {
            annotation_1: [
              {
                nPMIValue: 0.16871,
                countValue: 16719,
                annotation: 'annotation_1',
                metric: 'test1',
                run: 'run_1',
              },
              {
                nPMIValue: -0.37206,
                countValue: 513767,
                annotation: 'annotation_1',
                metric: 'test2',
                run: 'run_1',
              },
            ],
            annotation_2: [
              {
                nPMIValue: 0.687616,
                countValue: 1896,
                annotation: 'annotation_1',
                metric: 'test1',
                run: 'run_1',
              },
              {
                nPMIValue: 0.68116,
                countValue: 638967,
                annotation: 'annotation_1',
                metric: 'test2',
                run: 'run_1',
              },
            ],
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
        })
      );
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADED);
      expect(
        nextState.pluginDataLoaded.lastLoadedTimeInMs
      ).toBeGreaterThanOrEqual(t0);
      expect(nextState.annotationData).toEqual({
        annotation_1: [
          {
            nPMIValue: 0.16871,
            countValue: 16719,
            annotation: 'annotation_1',
            metric: 'test1',
            run: 'run_1',
          },
          {
            nPMIValue: -0.37206,
            countValue: 513767,
            annotation: 'annotation_1',
            metric: 'test2',
            run: 'run_1',
          },
        ],
        annotation_2: [
          {
            nPMIValue: 0.687616,
            countValue: 1896,
            annotation: 'annotation_1',
            metric: 'test1',
            run: 'run_1',
          },
          {
            nPMIValue: 0.68116,
            countValue: 638967,
            annotation: 'annotation_1',
            metric: 'test2',
            run: 'run_1',
          },
        ],
      });
      expect(nextState.runToMetrics).toEqual({
        run_1: ['nPMI@test1', 'nPMI@test2'],
      });
    });

    it('overrides existing annotations on successful annotations loading', () => {
      const state = createNpmiState({
        pluginDataLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 0,
        },
        annotationData: {
          annotation_1: [
            {
              nPMIValue: 0.16871,
              countValue: 16719,
              annotation: 'annotation_1',
              metric: 'test1',
              run: 'run_1',
            },
            {
              nPMIValue: -0.37206,
              countValue: 513767,
              annotation: 'annotation_1',
              metric: 'test2',
              run: 'run_1',
            },
          ],
          annotation_2: [
            {
              nPMIValue: 0.687616,
              countValue: 1896,
              annotation: 'annotation_1',
              metric: 'test1',
              run: 'run_1',
            },
            {
              nPMIValue: 0.68116,
              countValue: 638967,
              annotation: 'annotation_1',
              metric: 'test2',
              run: 'run_1',
            },
          ],
        },
        runToMetrics: {
          run_1: ['nPMI@test1', 'nPMI@test2'],
        },
      });
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.npmiPluginDataLoaded({
          annotationData: {
            annotation_new_1: [
              {
                nPMIValue: 0.1687,
                countValue: 1671,
                annotation: 'annotation_1',
                metric: 'newtest1',
                run: 'run_1',
              },
              {
                nPMIValue: -0.372,
                countValue: 51376,
                annotation: 'annotation_1',
                metric: 'newtest2',
                run: 'run_1',
              },
            ],
            annotation_new_2: [
              {
                nPMIValue: 0.68761,
                countValue: 189,
                annotation: 'annotation_1',
                metric: 'newtest1',
                run: 'run_1',
              },
              {
                nPMIValue: 0.6811,
                countValue: 63896,
                annotation: 'annotation_1',
                metric: 'newtest2',
                run: 'run_1',
              },
            ],
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
        })
      );
      expect(nextState.pluginDataLoaded.state).toBe(DataLoadState.LOADED);
      expect(
        nextState.pluginDataLoaded.lastLoadedTimeInMs
      ).toBeGreaterThanOrEqual(t0);
      expect(nextState.annotationData).toEqual({
        annotation_new_1: [
          {
            nPMIValue: 0.1687,
            countValue: 1671,
            annotation: 'annotation_1',
            metric: 'newtest1',
            run: 'run_1',
          },
          {
            nPMIValue: -0.372,
            countValue: 51376,
            annotation: 'annotation_1',
            metric: 'newtest2',
            run: 'run_1',
          },
        ],
        annotation_new_2: [
          {
            nPMIValue: 0.68761,
            countValue: 189,
            annotation: 'annotation_1',
            metric: 'newtest1',
            run: 'run_1',
          },
          {
            nPMIValue: 0.6811,
            countValue: 63896,
            annotation: 'annotation_1',
            metric: 'newtest2',
            run: 'run_1',
          },
        ],
      });
      expect(nextState.runToMetrics).toEqual({
        run_1: ['nPMI@newtest1', 'nPMI@newtest2'],
      });
    });
  });
});
