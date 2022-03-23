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
import {DataLoadState} from '../../types/data';
import {PluginType} from '../data_source';
import {
  buildMetricsState,
  buildTagMetadata,
  createCardMetadata,
} from '../testing';
import {
  buildOrReturnStateWithPinnedCopy,
  buildOrReturnStateWithUnresolvedImportedPins,
  canCreateNewPins,
  createPluginDataWithLoadable,
  createRunToLoadState,
  generateNextCardStepIndex,
  generateNextPinnedCardMappings,
  getCardId,
  getPinnedCardId,
  getRunIds,
  getTimeSeriesLoadable,
  TEST_ONLY,
} from './metrics_store_internal_utils';
import {
  ImageTimeSeriesData,
  TimeSeriesData,
  TimeSeriesLoadables,
} from './metrics_types';

const {getImageCardStepValues} = TEST_ONLY;

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

  describe('buildOrReturnStateWithUnresolvedImportedPins', () => {
    it('resolves imported pins', () => {
      const matchingInfo = {plugin: PluginType.SCALARS, tag: 'accuracy'};
      const nonMatchingInfo = {plugin: PluginType.SCALARS, tag: 'accuracy2'};
      const result = buildOrReturnStateWithUnresolvedImportedPins(
        [matchingInfo, nonMatchingInfo],
        ['card1'],
        {card1: {plugin: PluginType.SCALARS, tag: 'accuracy', runId: null}},
        new Map(),
        new Map(),
        {card1: 2}
      );

      const pinnedCardId = getPinnedCardId('card1');
      expect(result.unresolvedImportedPinnedCards).toEqual([nonMatchingInfo]);
      expect(result.cardToPinnedCopy).toEqual(
        new Map([['card1', pinnedCardId]])
      );
      expect(result.pinnedCardToOriginal).toEqual(
        new Map([[pinnedCardId, 'card1']])
      );
    });
  });

  describe('buildOrReturnStateWithPinnedCopy', () => {
    it('adds a pinned copy properly', () => {
      const {
        cardToPinnedCopy,
        pinnedCardToOriginal,
        cardStepIndex,
        cardMetadataMap,
      } = buildOrReturnStateWithPinnedCopy(
        'card1',
        new Map(),
        new Map(),
        {card1: 2},
        {card1: createCardMetadata()}
      );
      const pinnedCardId = getPinnedCardId('card1');

      expect(cardToPinnedCopy).toEqual(new Map([['card1', pinnedCardId]]));
      expect(pinnedCardToOriginal).toEqual(new Map([[pinnedCardId, 'card1']]));
      expect(cardStepIndex).toEqual({
        card1: 2,
        [pinnedCardId]: 2,
      });
      expect(cardMetadataMap).toEqual({
        card1: createCardMetadata(),
        [pinnedCardId]: createCardMetadata(),
      });
    });

    it('throws if the original card does not have metadata', () => {
      expect(() => {
        buildOrReturnStateWithPinnedCopy('card1', new Map(), new Map(), {}, {});
      }).toThrow();
    });

    it('no-ops if the card already has a pinned copy', () => {
      const cardToPinnedCopy = new Map([['card1', 'card-pin1']]);
      const pinnedCardToOriginal = new Map([['card-pin1', 'card1']]);
      const cardStepIndexMap = {};
      const cardMetadataMap = {card1: createCardMetadata()};
      const originals = {
        cardToPinnedCopy: new Map(cardToPinnedCopy),
        pinnedCardToOriginal: new Map(pinnedCardToOriginal),
        cardStepIndexMap: {...cardStepIndexMap},
        cardMetadataMap: {...cardMetadataMap},
      };

      const result = buildOrReturnStateWithPinnedCopy(
        'card1',
        cardToPinnedCopy,
        pinnedCardToOriginal,
        cardStepIndexMap,
        cardMetadataMap
      );

      expect(result.cardToPinnedCopy).toEqual(originals.cardToPinnedCopy);
      expect(result.pinnedCardToOriginal).toEqual(
        originals.pinnedCardToOriginal
      );
      expect(result.cardStepIndex).toEqual(originals.cardStepIndexMap);
      expect(result.cardMetadataMap).toEqual(originals.cardMetadataMap);
    });
  });

  describe('canCreateNewPins', () => {
    const originalMaxPinCount = TEST_ONLY.util.MAX_PIN_COUNT;

    afterEach(() => {
      TEST_ONLY.util.MAX_PIN_COUNT = originalMaxPinCount;
    });

    it('returns true when pins are under the limit', () => {
      TEST_ONLY.util.MAX_PIN_COUNT = 3;
      const state = buildMetricsState({
        pinnedCardToOriginal: new Map([['pinnedCard1', 'card1']]),
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.SCALARS, tag: 'loss'},
        ],
      });

      expect(canCreateNewPins(state)).toBe(true);
    });

    it('returns false when resolved pins reaches the limit', () => {
      TEST_ONLY.util.MAX_PIN_COUNT = 3;
      const state = buildMetricsState({
        pinnedCardToOriginal: new Map([
          ['pinnedCard1', 'card1'],
          ['pinnedCard2', 'card2'],
          ['pinnedCard3', 'card3'],
        ]),
        unresolvedImportedPinnedCards: [],
      });

      expect(canCreateNewPins(state)).toBe(false);
    });

    it('returns false when unresolved pins reaches the limit', () => {
      TEST_ONLY.util.MAX_PIN_COUNT = 3;
      const state = buildMetricsState({
        pinnedCardToOriginal: new Map(),
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.SCALARS, tag: 'loss1'},
          {plugin: PluginType.SCALARS, tag: 'loss2'},
          {plugin: PluginType.SCALARS, tag: 'loss3'},
        ],
      });

      expect(canCreateNewPins(state)).toBe(false);
    });

    it('returns false when pins + unresolved pins reaches the limit', () => {
      TEST_ONLY.util.MAX_PIN_COUNT = 3;
      const state = buildMetricsState({
        pinnedCardToOriginal: new Map([
          ['pinnedCard1', 'card1'],
          ['pinnedCard2', 'card2'],
        ]),
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.SCALARS, tag: 'loss1'},
        ],
      });

      expect(canCreateNewPins(state)).toBe(false);
    });
  });

  describe('generateNextPinnedCardMappings', () => {
    it(`keeps cardToPinnedCopy and pinnedCardToOriginal unchanged on all pinned cards included in cardlist`, () => {
      const cardToPinnedCopy = new Map([
        ['card1', 'card-pin1'],
        ['card2', 'card-pin2'],
      ]);
      const pinnedCardToOriginal = new Map([
        ['card-pin1', 'card1'],
        ['card-pin2', 'card2'],
      ]);
      const cardList = ['card1', 'card2'];
      const cardMetadataMap = {
        card1: createCardMetadata(),
        card2: createCardMetadata(),
      };

      const {nextCardToPinnedCopy, nextPinnedCardToOriginal} =
        generateNextPinnedCardMappings(
          cardToPinnedCopy,
          pinnedCardToOriginal,
          cardMetadataMap,
          cardList
        );

      expect(nextCardToPinnedCopy).toEqual(
        new Map([
          ['card1', 'card-pin1'],
          ['card2', 'card-pin2'],
        ])
      );
      expect(nextPinnedCardToOriginal).toEqual(
        new Map([
          ['card-pin1', 'card1'],
          ['card-pin2', 'card2'],
        ])
      );
    });

    it(`removes pinned cards from the maps on pinned cards not included in cardList`, () => {
      const cardToPinnedCopy = new Map([
        ['card1', 'card-pin1'],
        ['card2', 'card-pin2'],
      ]);
      const pinnedCardToOriginal = new Map([
        ['card-pin1', 'card1'],
        ['card-pin2', 'card2'],
      ]);
      const cardList = ['card1', 'card3'];
      const cardMetadataMap = {
        card1: createCardMetadata(),
        card3: createCardMetadata(),
      };

      const {
        nextCardToPinnedCopy,
        nextPinnedCardToOriginal,
        pinnedCardMetadataMap,
      } = generateNextPinnedCardMappings(
        cardToPinnedCopy,
        pinnedCardToOriginal,
        cardMetadataMap,
        cardList
      );

      expect(nextCardToPinnedCopy).toEqual(new Map([['card1', 'card-pin1']]));
      expect(nextPinnedCardToOriginal).toEqual(
        new Map([['card-pin1', 'card1']])
      );
    });

    it('preserves pinned cards mapping in cardMetadataMap', () => {
      const cardToPinnedCopy = new Map([['card1', 'card-pin1']]);
      const pinnedCardToOriginal = new Map([['card-pin1', 'card1']]);
      const cardMetadataMap = {card1: createCardMetadata()};
      const cardList = ['card1'];

      const {pinnedCardMetadataMap} = generateNextPinnedCardMappings(
        cardToPinnedCopy,
        pinnedCardToOriginal,
        cardMetadataMap,
        cardList
      );

      const expectedCardMetadataMap = {
        'card-pin1': createCardMetadata(),
      };
      expect(pinnedCardMetadataMap).toEqual(expectedCardMetadataMap);
    });
  });

  describe('generateNextCardStepIndex', () => {
    it(`keeps nextCardStepIndexMap unchanged on cards included in cardMetadataMap`, () => {
      const cardStepIndex = {card1: 1, card2: 2};
      const cardMetadataMap = {
        card1: createCardMetadata(),
        card2: createCardMetadata(),
      };

      const nextCardStepIndexMap = generateNextCardStepIndex(
        cardStepIndex,
        cardMetadataMap
      );

      expect(nextCardStepIndexMap).toEqual({card1: 1, card2: 2});
    });

    it(`removes card mapping from nextCardStepIndexMap on cards not in cardMetadataMap`, () => {
      const cardStepIndex = {card1: 1, card4: 2};
      const cardMetadataMap = {
        card1: createCardMetadata(),
        card2: createCardMetadata(),
      };

      const nextCardStepIndexMap = generateNextCardStepIndex(
        cardStepIndex,
        cardMetadataMap
      );

      expect(nextCardStepIndexMap).toEqual({card1: 1});
    });

    it(`keeps nextCardStepIndexMap unchanged on cards not in nextCardStepIndexMap but in cardMetadataMap`, () => {
      const cardStepIndex = {card1: 1};
      const cardMetadataMap = {
        card1: createCardMetadata(),
        card2: createCardMetadata(),
      };

      const nextCardStepIndexMap = generateNextCardStepIndex(
        cardStepIndex,
        cardMetadataMap
      );

      expect(nextCardStepIndexMap).toEqual({card1: 1});
    });
  });

  describe('getImageCardStepValues', () => {
    const cardId = 'test-card-id';
    const cardId2 = 'test-card-id-non-image';
    const cardMetadataMap = {
      [cardId]: {
        runId: 'test run Id',
        plugin: PluginType.IMAGES,
        tag: 'tagC',
        sample: 1111,
      },
      [cardId2]: {
        runId: 'test run Id2',
        plugin: PluginType.IMAGES,
        tag: 'tagA',
        sample: 0,
      },
    };
    let loadables: TimeSeriesLoadables = {
      scalars: {runToLoadState: {}, runToSeries: {}},
      histograms: {runToLoadState: {}, runToSeries: {}},
      images: {runToLoadState: {}, runToSeries: {}},
    };
    let timeSeriesData: TimeSeriesData = {
      scalars: {},
      histograms: {},
      images: {},
    };

    beforeEach(() => {
      timeSeriesData = {
        scalars: {},
        histograms: {},
        images: {tagC: {1111: {runToLoadState: {}, runToSeries: {}}}},
      };
    });

    it(`gets empty step value when no run id in time series data`, () => {
      expect(
        getImageCardStepValues(cardId, cardMetadataMap, timeSeriesData)
      ).toEqual([]);
    });

    it(`gets empty step value when no steps in image time series data`, () => {
      timeSeriesData.images = {
        tagC: {1111: {runToLoadState: {}, runToSeries: {'test run Id': []}}},
      };

      expect(
        getImageCardStepValues(cardId, cardMetadataMap, timeSeriesData)
      ).toEqual([]);
    });

    it(`gets empty step value when time series loadable returns null`, () => {
      expect(
        getImageCardStepValues(cardId2, cardMetadataMap, timeSeriesData)
      ).toEqual([]);
    });

    it(`gets single step value`, () => {
      timeSeriesData.images = {
        tagC: {
          1111: {
            runToLoadState: {},
            runToSeries: {
              'test run Id': [{step: 10, wallTime: 0, imageId: ''}],
            },
          },
        },
      };

      expect(
        getImageCardStepValues(cardId, cardMetadataMap, timeSeriesData)
      ).toEqual([10]);
    });

    it(`gets multi step value`, () => {
      timeSeriesData.images = {
        tagC: {
          1111: {
            runToLoadState: {},
            runToSeries: {
              'test run Id': [
                {step: 10, wallTime: 0, imageId: '1'},
                {step: 20, wallTime: 10, imageId: '2'},
                {step: 30, wallTime: 15, imageId: '3'},
              ],
            },
          },
        },
      };

      expect(
        getImageCardStepValues(cardId, cardMetadataMap, timeSeriesData)
      ).toEqual([10, 20, 30]);
    });

    it('gets empty step value if no card id exists in cardMetadataMap', () => {
      expect(
        getImageCardStepValues(
          'card id not in cardMetadataMap',
          cardMetadataMap,
          timeSeriesData
        )
      ).toEqual([]);
    });
  });
});
