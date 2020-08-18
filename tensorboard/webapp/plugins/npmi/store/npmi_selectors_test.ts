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
import {
  getPluginDataLoaded,
  getAnnotationData,
  getRunToMetrics,
} from './npmi_selectors';
import {DataLoadState} from './npmi_types';
import {createNpmiState, createState} from '../testing';

describe('npmi selectors', () => {
  describe('getPluginDataLoadState', () => {
    it('return correct NOT_LOADED state', () => {
      const state = createState(createNpmiState());
      const annotationsLoaded = getPluginDataLoaded(state);
      expect(annotationsLoaded.state).toBe(DataLoadState.NOT_LOADED);
    });

    it('returns correct LOADING state', () => {
      const state = createState(
        createNpmiState({
          pluginDataLoaded: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
        })
      );
      const annotationsLoaded = getPluginDataLoaded(state);
      expect(annotationsLoaded.state).toBe(DataLoadState.LOADING);
      expect(annotationsLoaded.lastLoadedTimeInMs).toBe(null);
    });

    it('returns correct LOADED state', () => {
      const state = createState(
        createNpmiState({
          pluginDataLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1234,
          },
        })
      );
      const loaded = getPluginDataLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADED);
      expect(loaded.lastLoadedTimeInMs).toBe(1234);
    });
  });

  describe('getAnnotationData', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getAnnotationData(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          annotationData: {
            annotation_new_1: [
              {
                nPMIValue: 0.1687,
                countValue: 1671,
                annotation: 'annotation_1',
                metric: 'newtest1',
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
            ],
          },
        })
      );
      expect(getAnnotationData(state)).toEqual({
        annotation_new_1: [
          {
            nPMIValue: 0.1687,
            countValue: 1671,
            annotation: 'annotation_1',
            metric: 'newtest1',
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
        ],
      });
    });
  });

  describe('getRunToMetrics', () => {
    it('return correct empty object', () => {
      const state = createState(createNpmiState());
      expect(getRunToMetrics(state)).toEqual({});
    });

    it('return correct data', () => {
      const state = createState(
        createNpmiState({
          runToMetrics: {
            run_1: ['npmi_metric_1', 'npmi_metric_2'],
          },
        })
      );
      expect(getRunToMetrics(state)).toEqual({
        run_1: ['npmi_metric_1', 'npmi_metric_2'],
      });
    });
  });
});
