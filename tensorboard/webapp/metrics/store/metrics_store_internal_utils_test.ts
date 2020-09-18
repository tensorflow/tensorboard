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
import 'jasmine';

import {DataLoadState} from '../../types/data';

import {PluginType} from '../data_source';
import {buildTagMetadata} from '../testing';

import {
  createPluginDataWithLoadable,
  createRunToLoadState,
  getCardId,
  getRunIds,
  getTimeSeriesLoadable,
} from './metrics_store_internal_utils';
import {ImageTimeSeriesData} from './metrics_types';

describe('metrics store utils', () => {
  it('getTimeSeriesLoadable properly gets loadables', () => {
    const loadables = {
      scalars: {runToLoadState: {}, runToSeries: {}},
      histograms: {runToLoadState: {}, runToSeries: {}},
      images: {runToLoadState: {}, runToSeries: {}},
    };
    const timeSeriesData = {
      scalars: {tagA: loadables.scalars},
      histograms: {tagB: loadables.histograms},
      images: {tagC: {0: loadables.images}},
    };

    const foundCases = [
      {
        actual: getTimeSeriesLoadable(
          timeSeriesData,
          PluginType.SCALARS,
          'tagA'
        ),
        expected: loadables.scalars,
      },
      {
        actual: getTimeSeriesLoadable(
          timeSeriesData,
          PluginType.HISTOGRAMS,
          'tagB'
        ),
        expected: loadables.histograms,
      },
      {
        actual: getTimeSeriesLoadable(
          timeSeriesData,
          PluginType.IMAGES,
          'tagC',
          0
        ),
        expected: loadables.images,
      },
    ];

    const nullCases = [
      {
        actual: getTimeSeriesLoadable(
          timeSeriesData,
          PluginType.SCALARS,
          'tagB'
        ),
        expected: null,
      },
      {
        actual: getTimeSeriesLoadable(
          timeSeriesData,
          PluginType.IMAGES,
          'tagC',
          9
        ),
        expected: null,
      },
    ];

    const cases = [...foundCases, ...nullCases];
    for (const testCase of cases) {
      expect(testCase.actual).toBe(testCase.expected);
    }
  });

  describe('createPluginDataWithLoadable', () => {
    function createSampleTimeSeriesData() {
      const loadables = {
        scalars: {runToLoadState: {}, runToSeries: {}},
        histograms: {runToLoadState: {}, runToSeries: {}},
        images: {runToLoadState: {}, runToSeries: {}},
      };
      return {
        scalars: {tagA: loadables.scalars},
        histograms: {tagB: loadables.histograms},
        images: {tagC: {0: loadables.images}},
      };
    }

    it('creates a copy of an existing loadable', () => {
      const prevTimeSeriesData = createSampleTimeSeriesData();
      const pluginData = createPluginDataWithLoadable(
        prevTimeSeriesData,
        PluginType.SCALARS,
        'tagA'
      );

      const origPluginData = createSampleTimeSeriesData()[PluginType.SCALARS];
      const prevPluginData = prevTimeSeriesData[PluginType.SCALARS];
      expect(pluginData).toEqual(origPluginData);
      expect(prevPluginData).toEqual(origPluginData);
      expect(pluginData).not.toBe(prevPluginData);
      expect(pluginData['tagA']).not.toBe(prevPluginData['tagA']);
    });

    it('creates a new loadable if needed', () => {
      const prevTimeSeriesData = createSampleTimeSeriesData();
      const pluginData = createPluginDataWithLoadable(
        prevTimeSeriesData,
        PluginType.SCALARS,
        'tagUnknown'
      );

      const prevPluginData = prevTimeSeriesData[PluginType.SCALARS];
      expect(pluginData).not.toBe(prevPluginData);
      expect(pluginData['tagA']).toBe(prevPluginData['tagA']);
      expect(pluginData['tagUnknown']).toEqual({
        runToSeries: {},
        runToLoadState: {},
      });
    });

    it('creates a copy of an existing image loadable', () => {
      const prevTimeSeriesData = createSampleTimeSeriesData();
      const existingSample = 0;
      const pluginData = createPluginDataWithLoadable(
        prevTimeSeriesData,
        PluginType.IMAGES,
        'tagC',
        existingSample
      ) as ImageTimeSeriesData;

      const origPluginData = createSampleTimeSeriesData()[PluginType.IMAGES];
      const prevPluginData = prevTimeSeriesData[PluginType.IMAGES];
      expect(pluginData).toEqual(origPluginData);
      expect(prevPluginData).toEqual(origPluginData);
      expect(pluginData).not.toBe(prevPluginData);
      expect(pluginData['tagC']).not.toBe(prevPluginData['tagC']);
      expect(pluginData['tagC'][existingSample]).not.toBe(
        prevPluginData['tagC'][existingSample]
      );
    });

    it('creates a new image loadable if needed', () => {
      const prevTimeSeriesData = createSampleTimeSeriesData();
      const newSample = 999;
      const pluginData = createPluginDataWithLoadable(
        prevTimeSeriesData,
        PluginType.IMAGES,
        'tagC',
        newSample
      ) as ImageTimeSeriesData;

      const existingSample = 0;
      const prevPluginData = prevTimeSeriesData[PluginType.IMAGES];
      expect(pluginData).not.toBe(prevPluginData);
      expect(pluginData['tagC'][existingSample]).toBe(
        prevPluginData['tagC'][existingSample]
      );
      expect(pluginData['tagC'][newSample]).toEqual({
        runToSeries: {},
        runToLoadState: {},
      });
    });
  });

  describe('getCardId', () => {
    it('creates the same id only when metadata match', () => {
      const sameId1 = getCardId({
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      });
      const sameId2 = getCardId({
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      });
      const id3 = getCardId({
        plugin: PluginType.SCALARS,
        tag: 'tag-different',
        runId: null,
      });
      expect(sameId1).toBe(sameId2);
      expect(sameId1).not.toBe(id3);
    });
  });

  describe('createRunToLoadState', () => {
    it('creates an empty object', () => {
      expect(createRunToLoadState(DataLoadState.LOADING, [])).toEqual({});
    });

    it('creates a new object from runs', () => {
      expect(
        createRunToLoadState(DataLoadState.LOADING, ['run1', 'run2'])
      ).toEqual({
        run1: DataLoadState.LOADING,
        run2: DataLoadState.LOADING,
      });
    });

    it('partially reuses previous load state', () => {
      const result = createRunToLoadState(
        DataLoadState.NOT_LOADED,
        ['run2', 'run3'],
        {
          run1: DataLoadState.LOADED,
          run2: DataLoadState.LOADED,
        }
      );
      expect(result).toEqual({
        run1: DataLoadState.LOADED,
        run2: DataLoadState.NOT_LOADED,
        run3: DataLoadState.NOT_LOADED,
      });
    });
  });

  describe('getRunIds', () => {
    it('returns empty when no run ids exist', () => {
      expect(
        getRunIds(
          {
            ...buildTagMetadata(),
            [PluginType.SCALARS]: {
              tagDescriptions: {},
              tagToRuns: {tagA: []},
            },
          },
          PluginType.SCALARS,
          'tagA'
        )
      ).toEqual([]);
    });

    it('returns empty when arguments do not match store structure', () => {
      expect(
        getRunIds(
          {
            ...buildTagMetadata(),
            [PluginType.SCALARS]: {
              tagDescriptions: {},
              tagToRuns: {tagA: []},
            },
          },
          PluginType.SCALARS,
          'unknown tag'
        )
      ).toEqual([]);

      // Mismatched plugin type.
      expect(
        getRunIds(
          {
            ...buildTagMetadata(),
            [PluginType.SCALARS]: {
              tagDescriptions: {},
              tagToRuns: {tagA: []},
            },
          },
          PluginType.IMAGES,
          'tagA'
        )
      ).toEqual([]);

      // Mismatched sample.
      expect(
        getRunIds(
          {
            ...buildTagMetadata(),
            [PluginType.IMAGES]: {
              tagDescriptions: {},
              tagRunSampledInfo: {tagA: {run1: {maxSamplesPerStep: 5}}},
            },
          },
          PluginType.IMAGES,
          'tagA',
          10 /* sample */
        )
      ).toEqual([]);
    });

    it('gets run ids for non-sampled plugin type', () => {
      expect(
        getRunIds(
          {
            ...buildTagMetadata(),
            [PluginType.SCALARS]: {
              tagDescriptions: {},
              tagToRuns: {tagA: ['run1', 'run2']},
            },
          },
          PluginType.SCALARS,
          'tagA'
        )
      ).toEqual(['run1', 'run2']);
    });

    it('gets run ids for sampled plugin type', () => {
      expect(
        getRunIds(
          {
            ...buildTagMetadata(),
            [PluginType.IMAGES]: {
              tagDescriptions: {},
              tagRunSampledInfo: {
                tagA: {
                  run1: {maxSamplesPerStep: 5},
                  run2: {maxSamplesPerStep: 1},
                  run3: {maxSamplesPerStep: 5},
                },
                tagB: {
                  run4: {maxSamplesPerStep: 5},
                },
              },
            },
          },
          PluginType.IMAGES,
          'tagA',
          4 /* sample */
        )
      ).toEqual(['run1', 'run3']);
    });
  });
});
