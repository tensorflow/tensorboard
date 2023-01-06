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
import * as routingActions from '../../app_routing/actions';
import {buildNavigatedAction, buildRoute} from '../../app_routing/testing';
import {RouteKind} from '../../app_routing/types';
import * as coreActions from '../../core/actions';
import {globalSettingsLoaded} from '../../persistent_settings';
import {buildDeserializedState} from '../../routes/testing';
import {DataLoadState} from '../../types/data';
import {nextElementId} from '../../util/dom';
import * as actions from '../actions';
import {
  PluginType,
  ScalarStepDatum,
  TagMetadata as DataSourceTagMetadata,
} from '../data_source';
import {
  buildDataSourceTagMetadata,
  buildMetricsSettingsState,
  buildMetricsState,
  buildStepIndexMetadata,
  buildTagMetadata,
  buildTimeSeriesData,
  createCardMetadata,
  createHistogramStepData,
  createImageStepData,
  createScalarStepData,
  createTimeSeriesData,
} from '../testing';
import {
  CardId,
  CardMetadata,
  HistogramMode,
  TooltipSort,
  XAxisType,
} from '../types';
import {reducers} from './metrics_reducers';
import {getCardId, getPinnedCardId} from './metrics_store_internal_utils';
import {
  CardMetadataMap,
  MetricsState,
  RunToLoadState,
  TagMetadata,
} from './metrics_types';

function createScalarCardMetadata(): CardMetadata {
  return {plugin: PluginType.SCALARS, tag: 'tagA', runId: null};
}

/**
 * Creates a fake array of time series data of the desired length.
 */
function createScalarStepSeries(length: number): ScalarStepDatum[] {
  const series: Array<{step: number; wallTime: number; value: number}> = [];
  for (let i = 0; i < length; i++) {
    series.push({step: i, wallTime: i + 100, value: Math.random()});
  }
  return series;
}

describe('metrics reducers', () => {
  describe('loading tag metadata', () => {
    const tagMetadataSample: {
      backendForm: DataSourceTagMetadata;
      storeForm: TagMetadata;
    } = {
      backendForm: {
        scalars: {
          tagDescriptions: {tagA: 'Describing tagA'},
          runTagInfo: {
            test: ['tagB'],
            train: ['tagA', 'tagB'],
          },
        },
        histograms: {
          tagDescriptions: {histogramTagA: 'Describing histogram tagA'},
          runTagInfo: {
            test: ['histogramTagA'],
            train: ['histogramTagA'],
          },
        },
        images: {
          tagDescriptions: {imageTagA: 'Describing image tagA'},
          tagRunSampledInfo: {
            imageTagA: {
              test: {maxSamplesPerStep: 1},
              train: {maxSamplesPerStep: 2},
            },
            imageTagB: {test: {maxSamplesPerStep: 3}},
          },
        },
      },
      storeForm: {
        scalars: {
          tagDescriptions: {tagA: 'Describing tagA'},
          tagToRuns: {
            tagA: ['train'],
            tagB: ['test', 'train'],
          },
        },
        histograms: {
          tagDescriptions: {histogramTagA: 'Describing histogram tagA'},
          tagToRuns: {histogramTagA: ['test', 'train']},
        },
        images: {
          tagDescriptions: {imageTagA: 'Describing image tagA'},
          tagRunSampledInfo: {
            imageTagA: {
              test: {maxSamplesPerStep: 1},
              train: {maxSamplesPerStep: 2},
            },
            imageTagB: {test: {maxSamplesPerStep: 3}},
          },
        },
      },
    };

    [
      {
        action: actions.metricsTagMetadataRequested(),
        actionName: 'metricsTagMetadataRequested',
        beforeState: buildMetricsState({
          tagMetadataLoadState: {
            state: DataLoadState.NOT_LOADED,
            lastLoadedTimeInMs: null,
          },
        }),
        expectedState: buildMetricsState({
          tagMetadataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
          tagMetadata: buildTagMetadata(),
        }),
      },
      {
        action: actions.metricsTagMetadataFailed(),
        actionName: 'metricsTagMetadataFailed',
        beforeState: buildMetricsState({
          tagMetadataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
          tagMetadata: tagMetadataSample.storeForm,
        }),
        expectedState: buildMetricsState({
          tagMetadataLoadState: {
            state: DataLoadState.FAILED,
            lastLoadedTimeInMs: null,
          },
          tagMetadata: tagMetadataSample.storeForm,
        }),
      },
      {
        action: actions.metricsTagMetadataLoaded({
          tagMetadata: tagMetadataSample.backendForm,
        }),
        actionName: 'metricsTagMetadataLoaded',
        beforeState: buildMetricsState({
          tagMetadataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: null,
          },
        }),
        expectedState: buildMetricsState({
          tagMetadataLoadState: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 3,
          },
          tagMetadata: tagMetadataSample.storeForm,
        }),
      },
    ].forEach((metaSpec) => {
      describe(metaSpec.actionName, () => {
        beforeEach(() => {
          spyOn(Date, 'now').and.returnValue(3);
        });

        it(`sets the loadState on ${metaSpec.actionName}`, () => {
          const nextState = reducers(metaSpec.beforeState, metaSpec.action);
          expect(nextState.tagMetadataLoadState).toEqual(
            metaSpec.expectedState.tagMetadataLoadState
          );
          expect(nextState.tagMetadata).toEqual(
            metaSpec.expectedState.tagMetadata
          );
        });
      });
    });

    it('sets cardMetadataMap, cardList, and tagGroupExpanded on tag metadata loaded', () => {
      const beforeState = buildMetricsState();
      const tagMetadata: DataSourceTagMetadata = {
        scalars: {
          tagDescriptions: {},
          runTagInfo: {run1: ['tagA']},
        },
        histograms: {
          tagDescriptions: {},
          runTagInfo: {run2: ['tagB']},
        },
        images: {
          tagDescriptions: {},
          tagRunSampledInfo: {
            tagC: {run3: {maxSamplesPerStep: 3}},
          },
        },
      };

      const action = actions.metricsTagMetadataLoaded({tagMetadata});
      const nextState = reducers(beforeState, action);

      const expectedCardMetadataList = [
        {plugin: PluginType.SCALARS, tag: 'tagA', runId: null},
        {plugin: PluginType.HISTOGRAMS, tag: 'tagB', runId: 'run2'},
        {
          plugin: PluginType.IMAGES,
          tag: 'tagC',
          runId: 'run3',
          sample: 0,
          numSample: 3,
        },
        {
          plugin: PluginType.IMAGES,
          tag: 'tagC',
          runId: 'run3',
          sample: 1,
          numSample: 3,
        },
        {
          plugin: PluginType.IMAGES,
          tag: 'tagC',
          runId: 'run3',
          sample: 2,
          numSample: 3,
        },
      ];
      const expectedCardMetadataMap: CardMetadataMap = {};
      for (const cardMetadata of expectedCardMetadataList) {
        expectedCardMetadataMap[getCardId(cardMetadata)] = cardMetadata;
      }
      expect(nextState.cardMetadataMap).toEqual(expectedCardMetadataMap);
      expect(nextState.cardList).toEqual(Object.keys(expectedCardMetadataMap));
      expect(nextState.tagGroupExpanded).toEqual(
        new Map([
          ['tagA', true],
          ['tagB', true],
        ])
      );
    });

    it('does not add pinned copies to cardList on tag metadata loaded', () => {
      const cardMetadata = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagA',
        runId: 'run1',
      };
      const cardId = getCardId(cardMetadata);
      const pinnedCopyId = getPinnedCardId(cardId);
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          [cardId]: cardMetadata,
          [pinnedCopyId]: cardMetadata,
        },
        cardList: [cardId],
        cardToPinnedCopy: new Map([[cardId, pinnedCopyId]]),
        cardToPinnedCopyCache: new Map([[cardId, pinnedCopyId]]),
        pinnedCardToOriginal: new Map([[pinnedCopyId, cardId]]),
      });
      const action = actions.metricsTagMetadataLoaded({
        tagMetadata: {
          ...buildDataSourceTagMetadata(),
          [PluginType.HISTOGRAMS]: {
            tagDescriptions: {},
            runTagInfo: {run1: ['tagA']},
          },
        },
      });
      const nextState = reducers(beforeState, action);

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          [cardId]: cardMetadata,
          [pinnedCopyId]: cardMetadata,
        },
        cardList: [cardId],
        cardToPinnedCopy: new Map([[cardId, pinnedCopyId]]),
        cardToPinnedCopyCache: new Map([[cardId, pinnedCopyId]]),
      });
      expect(nextState.cardMetadataMap).toEqual(expectedState.cardMetadataMap);
      expect(nextState.cardList).toEqual(expectedState.cardList);
      expect(nextState.cardToPinnedCopy).toEqual(
        expectedState.cardToPinnedCopy
      );
      expect(nextState.cardToPinnedCopyCache).toEqual(
        expectedState.cardToPinnedCopyCache
      );
    });

    it('does not change pinned card order', () => {
      const cardMetadata1 = {
        plugin: PluginType.IMAGES,
        tag: 'tagA',
        runId: 'run1',
        sample: 1,
        numSample: 3,
      };
      const cardMetadata2 = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagB',
        runId: 'run2',
      };
      const cardId1 = getCardId(cardMetadata1);
      const cardId2 = getCardId(cardMetadata2);
      const pinnedCopyId1 = getPinnedCardId(cardId1);
      const pinnedCopyId2 = getPinnedCardId(cardId2);
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [cardId1]: cardMetadata2,
          [pinnedCopyId1]: cardMetadata1,
          [pinnedCopyId2]: cardMetadata2,
        },
        cardList: [cardId1, cardId2],
        cardToPinnedCopy: new Map([
          [cardId1, pinnedCopyId1],
          [cardId2, pinnedCopyId2],
        ]),
        cardToPinnedCopyCache: new Map([
          [cardId1, pinnedCopyId1],
          [cardId2, pinnedCopyId2],
        ]),
        pinnedCardToOriginal: new Map([
          [pinnedCopyId1, cardId1],
          [pinnedCopyId2, cardId2],
        ]),
      });
      const action = actions.metricsTagMetadataLoaded({
        tagMetadata: {
          ...buildDataSourceTagMetadata(),
          [PluginType.IMAGES]: {
            tagDescriptions: {},
            tagRunSampledInfo: {tagA: {run1: {maxSamplesPerStep: 1}}},
          },
          [PluginType.HISTOGRAMS]: {
            tagDescriptions: {},
            runTagInfo: {run1: ['tagB']},
          },
        },
      });

      const nextState = reducers(beforeState, action);

      expect(nextState.pinnedCardToOriginal.keys()).toEqual(
        new Map([
          [pinnedCopyId1, cardId1],
          [pinnedCopyId2, cardId2],
        ]).keys()
      );
    });

    it('updates pinned/original cards mapping on pinned cards removal', () => {
      const cardMetadata1 = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagA',
        runId: 'run1',
      };
      const cardMetadata2 = {
        plugin: PluginType.SCALARS,
        tag: 'tagB',
        runId: null,
      };
      const cardId1 = getCardId(cardMetadata1);
      const cardId2 = getCardId(cardMetadata2);
      const pinnedCopyId1 = getPinnedCardId(cardId1);
      const pinnedCopyId2 = getPinnedCardId(cardId2);
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [cardId2]: cardMetadata2,
          [pinnedCopyId1]: cardMetadata1,
          [pinnedCopyId2]: cardMetadata2,
        },
        cardList: [cardId1, cardId2],
        cardToPinnedCopy: new Map([
          [cardId1, pinnedCopyId1],
          [cardId2, pinnedCopyId2],
        ]),
        cardToPinnedCopyCache: new Map([
          [cardId1, pinnedCopyId1],
          [cardId2, pinnedCopyId2],
        ]),
        pinnedCardToOriginal: new Map([
          [pinnedCopyId1, cardId1],
          [pinnedCopyId2, cardId2],
        ]),
      });
      const action = actions.metricsTagMetadataLoaded({
        tagMetadata: {
          ...buildDataSourceTagMetadata(),
          [PluginType.HISTOGRAMS]: {
            tagDescriptions: {},
            runTagInfo: {run1: ['tagA']},
          },
        },
      });
      const nextState = reducers(beforeState, action);

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [pinnedCopyId1]: cardMetadata1,
        },
        cardList: [cardId1],
        cardToPinnedCopy: new Map([[cardId1, pinnedCopyId1]]),
        cardToPinnedCopyCache: new Map([
          [cardId1, pinnedCopyId1],
          [cardId2, pinnedCopyId2],
        ]),
        pinnedCardToOriginal: new Map([[pinnedCopyId1, cardId1]]),
      });
      expect(nextState.cardMetadataMap).toEqual(expectedState.cardMetadataMap);
      expect(nextState.cardList).toEqual(expectedState.cardList);
      expect(nextState.cardToPinnedCopy).toEqual(
        expectedState.cardToPinnedCopy
      );
      expect(nextState.cardToPinnedCopyCache).toEqual(
        expectedState.cardToPinnedCopyCache
      );
      expect(nextState.pinnedCardToOriginal).toEqual(
        expectedState.pinnedCardToOriginal
      );
    });

    it('updates cardMetadataMap and keeps pinned/original cards mapping unchanged on non-pinned cards removal', () => {
      const cardMetadata1 = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagA',
        runId: 'run1',
      };
      const cardMetadata2 = {
        plugin: PluginType.SCALARS,
        tag: 'tagB',
        runId: null,
      };
      const cardId1 = getCardId(cardMetadata1);
      const cardId2 = getCardId(cardMetadata2);
      const pinnedCopyId1 = getPinnedCardId(cardId1);
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [cardId2]: cardMetadata2,
          [pinnedCopyId1]: cardMetadata1,
        },
        cardList: [cardId1, cardId2],
        cardToPinnedCopy: new Map([[cardId1, pinnedCopyId1]]),
        cardToPinnedCopyCache: new Map([[cardId1, pinnedCopyId1]]),
        pinnedCardToOriginal: new Map([[pinnedCopyId1, cardId1]]),
      });
      const action = actions.metricsTagMetadataLoaded({
        tagMetadata: {
          ...buildDataSourceTagMetadata(),
          [PluginType.HISTOGRAMS]: {
            tagDescriptions: {},
            runTagInfo: {run1: ['tagA']},
          },
        },
      });
      const nextState = reducers(beforeState, action);

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [pinnedCopyId1]: cardMetadata1,
        },
        cardList: [cardId1],
        cardToPinnedCopy: new Map([[cardId1, pinnedCopyId1]]),
        cardToPinnedCopyCache: new Map([[cardId1, pinnedCopyId1]]),
        pinnedCardToOriginal: new Map([[pinnedCopyId1, cardId1]]),
      });
      expect(nextState.cardMetadataMap).toEqual(expectedState.cardMetadataMap);
      expect(nextState.cardList).toEqual(expectedState.cardList);
      expect(nextState.cardToPinnedCopy).toEqual(
        expectedState.cardToPinnedCopy
      );
      expect(nextState.cardToPinnedCopyCache).toEqual(
        expectedState.cardToPinnedCopyCache
      );
      expect(nextState.pinnedCardToOriginal).toEqual(
        expectedState.pinnedCardToOriginal
      );
    });

    it('updates cardMetadataMap and keeps pinned/original cards mapping unchanged on adding new cards', () => {
      const cardMetadata1 = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagA',
        runId: 'run1',
      };
      const cardMetadata2 = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagB',
        runId: 'run1',
      };
      const cardId1 = getCardId(cardMetadata1);
      const cardId2 = getCardId(cardMetadata2);
      const pinnedCopyId1 = getPinnedCardId(cardId1);
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [pinnedCopyId1]: cardMetadata1,
        },
        cardList: [cardId1],
        cardToPinnedCopy: new Map([[cardId1, pinnedCopyId1]]),
        cardToPinnedCopyCache: new Map([[cardId1, pinnedCopyId1]]),
        pinnedCardToOriginal: new Map([[pinnedCopyId1, cardId1]]),
      });
      const action = actions.metricsTagMetadataLoaded({
        tagMetadata: {
          ...buildDataSourceTagMetadata(),
          [PluginType.HISTOGRAMS]: {
            tagDescriptions: {},
            runTagInfo: {run1: ['tagA', 'tagB']},
          },
        },
      });
      const nextState = reducers(beforeState, action);

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [cardId2]: cardMetadata2,
          [pinnedCopyId1]: cardMetadata1,
        },
        cardList: [cardId1, cardId2],
        cardToPinnedCopy: new Map([[cardId1, pinnedCopyId1]]),
        cardToPinnedCopyCache: new Map([[cardId1, pinnedCopyId1]]),
        pinnedCardToOriginal: new Map([[pinnedCopyId1, cardId1]]),
      });
      expect(nextState.cardMetadataMap).toEqual(expectedState.cardMetadataMap);
      expect(nextState.cardList).toEqual(expectedState.cardList);
      expect(nextState.cardToPinnedCopy).toEqual(
        expectedState.cardToPinnedCopy
      );
      expect(nextState.cardToPinnedCopyCache).toEqual(
        expectedState.cardToPinnedCopyCache
      );
      expect(nextState.pinnedCardToOriginal).toEqual(
        expectedState.pinnedCardToOriginal
      );
    });

    it('removes cards from cardStepIndex mapping on cards removal', () => {
      const cardMetadata1 = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagA',
        runId: 'run1',
      };
      const cardMetadata2 = {
        plugin: PluginType.SCALARS,
        tag: 'tagB',
        runId: null,
      };
      const cardId1 = getCardId(cardMetadata1);
      const cardId2 = getCardId(cardMetadata2);
      const pinnedCopyId1 = getPinnedCardId(cardId1);
      const pinnedCopyId2 = getPinnedCardId(cardId2);
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [cardId2]: cardMetadata2,
          [pinnedCopyId1]: cardMetadata1,
          [pinnedCopyId2]: cardMetadata2,
        },
        cardStepIndex: {
          [pinnedCopyId1]: buildStepIndexMetadata({index: 1}),
          [pinnedCopyId2]: buildStepIndexMetadata({index: 2}),
          [cardId1]: buildStepIndexMetadata({index: 1}),
          [cardId2]: buildStepIndexMetadata({index: 2}),
        },
        cardToPinnedCopy: new Map([
          [cardId1, pinnedCopyId1],
          [cardId2, pinnedCopyId2],
        ]),
        cardToPinnedCopyCache: new Map([
          [cardId1, pinnedCopyId1],
          [cardId2, pinnedCopyId2],
        ]),
        pinnedCardToOriginal: new Map([
          [pinnedCopyId1, cardId1],
          [pinnedCopyId2, cardId2],
        ]),
      });
      const action = actions.metricsTagMetadataLoaded({
        tagMetadata: {
          ...buildDataSourceTagMetadata(),
          [PluginType.HISTOGRAMS]: {
            tagDescriptions: {},
            runTagInfo: {run1: ['tagA']},
          },
        },
      });
      const nextState = reducers(beforeState, action);

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [pinnedCopyId1]: cardMetadata1,
        },
        cardStepIndex: {
          [pinnedCopyId1]: buildStepIndexMetadata({index: 1}),
          [cardId1]: buildStepIndexMetadata({index: 1}),
        },
      });
      expect(nextState.cardMetadataMap).toEqual(expectedState.cardMetadataMap);
      expect(nextState.cardStepIndex).toEqual(expectedState.cardStepIndex);
    });

    it('keeps cardStepIndex unchanged on removing cards not in cardStepIndex', () => {
      const cardMetadata1 = {
        plugin: PluginType.HISTOGRAMS,
        tag: 'tagA',
        runId: 'run1',
      };
      const cardMetadata2 = {
        plugin: PluginType.SCALARS,
        tag: 'tagB',
        runId: null,
      };
      const cardId1 = getCardId(cardMetadata1);
      const cardId2 = getCardId(cardMetadata2);
      const pinnedCopyId1 = getPinnedCardId(cardId1);
      const pinnedCopyId2 = getPinnedCardId(cardId2);
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
          [cardId2]: cardMetadata2,
        },
        cardStepIndex: {
          [cardId1]: buildStepIndexMetadata({index: 1}),
        },
      });
      const action = actions.metricsTagMetadataLoaded({
        tagMetadata: {
          ...buildDataSourceTagMetadata(),
          [PluginType.HISTOGRAMS]: {
            tagDescriptions: {},
            runTagInfo: {run1: ['tagA']},
          },
        },
      });
      const nextState = reducers(beforeState, action);

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          [cardId1]: cardMetadata1,
        },
        cardStepIndex: {
          [cardId1]: buildStepIndexMetadata({index: 1}),
        },
      });
      expect(nextState.cardMetadataMap).toEqual(expectedState.cardMetadataMap);
      expect(nextState.cardStepIndex).toEqual(expectedState.cardStepIndex);
    });

    it('resolves imported pins by automatically creating pinned copies', () => {
      const fakeCardMetadata = {
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      };
      const stepCount = 10;
      const expectedCardId = getCardId(fakeCardMetadata);
      const expectedPinnedCopyId = getPinnedCardId(expectedCardId);
      const beforeState = buildMetricsState({
        cardMetadataMap: {},
        cardList: [],
        cardStepIndex: {
          [expectedCardId]: buildStepIndexMetadata({index: stepCount - 1}),
        },
        cardToPinnedCopy: new Map(),
        pinnedCardToOriginal: new Map(),
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.SCALARS, tag: 'tagA'},
          {plugin: PluginType.SCALARS, tag: 'tagB'},
        ],
      });
      const nextState = reducers(
        beforeState,
        actions.metricsTagMetadataLoaded({
          tagMetadata: {
            ...buildDataSourceTagMetadata(),
            [PluginType.SCALARS]: {
              tagDescriptions: {},
              runTagInfo: {run1: ['tagA']},
            },
          },
        })
      );

      const {
        cardMetadataMap,
        cardList,
        cardStepIndex,
        cardToPinnedCopy,
        cardToPinnedCopyCache,
        pinnedCardToOriginal,
        unresolvedImportedPinnedCards,
      } = nextState;
      expect({
        cardMetadataMap,
        cardList,
        cardStepIndex,
        cardToPinnedCopy,
        cardToPinnedCopyCache,
        pinnedCardToOriginal,
        unresolvedImportedPinnedCards,
      }).toEqual({
        cardMetadataMap: {
          [expectedCardId]: fakeCardMetadata,
          [expectedPinnedCopyId]: fakeCardMetadata,
        },
        cardList: [expectedCardId],
        cardStepIndex: {
          [expectedCardId]: buildStepIndexMetadata({index: stepCount - 1}),
          [expectedPinnedCopyId]: buildStepIndexMetadata({
            index: stepCount - 1,
          }),
        },
        cardToPinnedCopy: new Map([[expectedCardId, expectedPinnedCopyId]]),
        cardToPinnedCopyCache: new Map([
          [expectedCardId, expectedPinnedCopyId],
        ]),
        pinnedCardToOriginal: new Map([[expectedPinnedCopyId, expectedCardId]]),
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.SCALARS, tag: 'tagB'},
        ],
      });
    });

    it('does not resolve mismatching imported pins', () => {
      const beforeState = buildMetricsState({
        cardToPinnedCopy: new Map(),
        pinnedCardToOriginal: new Map(),
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.IMAGES, tag: 'tagA', runId: 'run1', sample: 5},
          {plugin: PluginType.IMAGES, tag: 'tagB', runId: 'run1', sample: 5},
        ],
      });
      const nextState = reducers(
        beforeState,
        actions.metricsTagMetadataLoaded({
          tagMetadata: {
            ...buildDataSourceTagMetadata(),
            [PluginType.IMAGES]: {
              tagDescriptions: {},
              tagRunSampledInfo: {
                tagA: {
                  // Matching run, but incorrect sample.
                  run1: {maxSamplesPerStep: 1},
                },
                tagB: {
                  // Matching tag, sample, but incorrect run.
                  run10: {maxSamplesPerStep: 10},
                },
              },
            },
          },
        })
      );

      expect(nextState.cardToPinnedCopy).toEqual(new Map());
      expect(nextState.pinnedCardToOriginal).toEqual(new Map());
      expect(nextState.unresolvedImportedPinnedCards).toEqual([
        {plugin: PluginType.IMAGES, tag: 'tagA', runId: 'run1', sample: 5},
        {plugin: PluginType.IMAGES, tag: 'tagB', runId: 'run1', sample: 5},
      ]);
    });

    it('resets existing data and replaces with new card set', () => {
      const beforeState = {
        ...buildMetricsState(),
        cardMetadataMap: {'<cardId>': createScalarCardMetadata()},
      };
      const origCardMetadata = beforeState.cardMetadataMap['<cardId>'];
      const tagMetadata: DataSourceTagMetadata = {
        ...buildDataSourceTagMetadata(),
        scalars: {
          tagDescriptions: {},
          runTagInfo: {run1: ['tagA']},
        },
      };

      const cardMetadata = {
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      };
      const cardId = getCardId(cardMetadata);

      const action = actions.metricsTagMetadataLoaded({tagMetadata});
      const nextState = reducers(beforeState, action);

      const expectedCardMetadataMap: CardMetadataMap = {};
      expectedCardMetadataMap[cardId] = cardMetadata;

      expect(nextState.cardMetadataMap.hasOwnProperty('<cardId>')).toBe(false);
      expect(nextState.cardMetadataMap[cardId]).toEqual(
        expectedCardMetadataMap[cardId]
      );
    });
  });

  describe('mark tags as stale', () => {
    const reloadSpecs = [
      {reloadAction: coreActions.manualReload, reloadName: 'manual reload'},
      {reloadAction: coreActions.reload, reloadName: 'auto reload'},
    ];
    for (const {reloadAction, reloadName} of reloadSpecs) {
      describe(`on ${reloadName}`, () => {
        it(`preserves existing data`, () => {
          const prevState = buildMetricsState({
            cardMetadataMap: {'<cardId>': createScalarCardMetadata()},
            tagMetadata: buildTagMetadata(),
            timeSeriesData: {
              ...createTimeSeriesData(),
              [PluginType.SCALARS]: {
                tagA: {
                  runToSeries: {run1: createScalarStepData()},
                  runToLoadState: {run1: DataLoadState.FAILED},
                },
              },
            },
          });
          const expectedData = {
            cardMetadataMap: {'<cardId>': createScalarCardMetadata()},
            tagMetadata: buildTagMetadata(),
            timeSeriesData: {
              ...createTimeSeriesData(),
              [PluginType.SCALARS]: {
                tagA: {
                  runToSeries: {run1: createScalarStepData()},
                  runToLoadState: {run1: DataLoadState.FAILED},
                },
              },
            },
          };

          const nextState = reducers(prevState, reloadAction);

          expect(nextState.cardMetadataMap).toBe(prevState.cardMetadataMap);
          expect(nextState.cardMetadataMap).toEqual(
            expectedData.cardMetadataMap
          );
          expect(nextState.tagMetadata).toBe(prevState.tagMetadata);
          expect(nextState.tagMetadata).toEqual(expectedData.tagMetadata);

          // For time series data, we expect the 'runToSeries' part to be the
          // same.
          expect(
            nextState.timeSeriesData[PluginType.SCALARS]['tagA'].runToSeries
          ).toBe(
            prevState.timeSeriesData[PluginType.SCALARS]['tagA'].runToSeries
          );
          expect(
            nextState.timeSeriesData[PluginType.SCALARS]['tagA'].runToSeries
          ).toEqual(
            expectedData.timeSeriesData[PluginType.SCALARS]['tagA'].runToSeries
          );
        });

        it(`marks loaded tag metadata as stale`, () => {
          const prevState = buildMetricsState({
            tagMetadataLoadState: {
              state: DataLoadState.LOADED,
              lastLoadedTimeInMs: 3,
            },
            tagMetadata: buildTagMetadata(),
          });

          const nextState = reducers(prevState, reloadAction);
          expect(nextState.tagMetadataLoadState).toEqual({
            state: DataLoadState.NOT_LOADED,
            lastLoadedTimeInMs: 3,
          });
        });

        it(`does not change tag load state if already loading`, () => {
          const prevState = buildMetricsState({
            tagMetadataLoadState: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: 3,
            },
            tagMetadata: buildTagMetadata(),
          });

          const nextState = reducers(prevState, reloadAction);
          expect(nextState.tagMetadataLoadState).toEqual({
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: 3,
          });
        });

        it(
          `marks loaded time series as stale unless already ` + `loading`,
          () => {
            const prevState = buildMetricsState({
              timeSeriesData: {
                ...createTimeSeriesData(),
                [PluginType.SCALARS]: {
                  tagA: {
                    runToSeries: {
                      run1: createScalarStepData(),
                      run2: createScalarStepData(),
                    },
                    runToLoadState: {
                      run1: DataLoadState.LOADED,
                      run2: DataLoadState.LOADING,
                    },
                  },
                },
              },
            });

            const nextState = reducers(prevState, reloadAction);
            const runToLoadState =
              nextState.timeSeriesData[PluginType.SCALARS]['tagA']
                .runToLoadState;
            expect(runToLoadState).toEqual({
              run1: DataLoadState.NOT_LOADED,
              run2: DataLoadState.LOADING,
            });
          }
        );
      });
    }
  });

  it('navigating to new set of experiments resets data', () => {
    const prevState = buildMetricsState({
      tagMetadataLoadState: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 3,
      },
      tagMetadata: {
        ...buildTagMetadata(),
        scalars: {
          tagDescriptions: {},
          tagToRuns: {tagA: ['exp1/run1', 'exp1/run2']},
        },
      },
      cardList: ['tagA'],
      cardMetadataMap: {
        tagA: createScalarCardMetadata(),
      },
      visibleCardMap: new Map([
        [nextElementId(), 'card1'],
        [nextElementId(), 'card2'],
      ]),
    });

    const navigate = buildNavigatedAction({
      before: buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentId: 'exp1'},
      }),
      after: buildRoute({
        routeKind: RouteKind.EXPERIMENT,
        params: {experimentId: 'exp2'},
      }),
    });
    let nextState = reducers(prevState, navigate);

    const expectedState = buildMetricsState({
      tagMetadataLoadState: {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      },
      tagMetadata: buildTagMetadata(),
      cardList: [],
      cardMetadataMap: {},
      visibleCardMap: new Map(),
    });
    expect(nextState).toEqual(expectedState);
  });

  describe('settings', () => {
    it('changes tooltipSort on metricsChangeTooltipSort', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          tooltipSort: TooltipSort.ALPHABETICAL,
        }),
        settingOverrides: buildMetricsSettingsState({
          tooltipSort: TooltipSort.ASCENDING,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeTooltipSort({sort: TooltipSort.NEAREST})
      );
      expect(nextState.settings.tooltipSort).toBe(TooltipSort.ALPHABETICAL);
      expect(nextState.settingOverrides.tooltipSort).toBe(TooltipSort.NEAREST);
    });

    it('changes ignoreOutliers on metricsToggleIgnoreOutliers', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          ignoreOutliers: true,
        }),
        settingOverrides: {},
      });
      const nextState = reducers(
        prevState,
        actions.metricsToggleIgnoreOutliers()
      );
      expect(nextState.settings.ignoreOutliers).toBe(true);
      expect(nextState.settingOverrides.ignoreOutliers).toBe(false);
    });

    it('changes xAxisType on metricsChangeXAxisType', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          xAxisType: XAxisType.STEP,
        }),
        settingOverrides: {},
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeXAxisType({xAxisType: XAxisType.WALL_TIME})
      );
      expect(nextState.settingOverrides.xAxisType).toBe(XAxisType.WALL_TIME);
    });

    it('changes scalarSmoothing on metricsChangeScalarSmoothing', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
        settingOverrides: {
          scalarSmoothing: 0.5,
        },
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeScalarSmoothing({smoothing: 0.1})
      );
      expect(nextState.settings.scalarSmoothing).toBe(0.3);
      expect(nextState.settingOverrides.scalarSmoothing).toBe(0.1);
    });

    it('toggles Partition X on metricsScalarPartitionNonMonotonicXToggled', () => {
      const state1 = buildMetricsState({
        settings: buildMetricsSettingsState({
          scalarPartitionNonMonotonicX: true,
        }),
        settingOverrides: {},
      });
      const state2 = reducers(
        state1,
        actions.metricsScalarPartitionNonMonotonicXToggled()
      );
      expect(state2.settingOverrides.scalarPartitionNonMonotonicX).toBe(false);

      const state3 = reducers(
        state2,
        actions.metricsScalarPartitionNonMonotonicXToggled()
      );
      expect(state3.settingOverrides.scalarPartitionNonMonotonicX).toBe(true);
    });

    it('changes imageBrightnessInMilli on metricsChangeImageBrightness', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageBrightnessInMilli: 300,
        }),
        settingOverrides: {},
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeImageBrightness({brightnessInMilli: 1000})
      );
      expect(nextState.settingOverrides.imageBrightnessInMilli).toBe(1000);
    });

    it('changes imageContrastInMilli on metricsChangeImageContrast', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageContrastInMilli: 200,
        }),
        settingOverrides: {},
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeImageContrast({contrastInMilli: 500})
      );
      expect(nextState.settingOverrides.imageContrastInMilli).toBe(500);
    });

    it('resets imageBrightnessInMilli', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageBrightnessInMilli: 300,
        }),
        settingOverrides: {
          imageBrightnessInMilli: 0,
        },
      });
      const nextState = reducers(
        prevState,
        actions.metricsResetImageBrightness()
      );
      expect(nextState.settings.imageBrightnessInMilli).toBe(300);
      expect(
        nextState.settingOverrides.hasOwnProperty('imageBrightnessInMilli')
      ).toBe(false);
    });

    it('resets imageContrastInMilli', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageContrastInMilli: 300,
        }),
        settingOverrides: {
          imageContrastInMilli: 5000,
        },
      });
      const nextState = reducers(
        prevState,
        actions.metricsResetImageContrast()
      );
      expect(nextState.settings.imageContrastInMilli).toBe(300);
      expect(
        nextState.settingOverrides.hasOwnProperty('imageContrastInMilli')
      ).toBe(false);
    });

    it('changes imageShowActualSize on metricsToggleImageShowActualSize', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageShowActualSize: true,
        }),
        settingOverrides: {},
      });
      const nextState = reducers(
        prevState,
        actions.metricsToggleImageShowActualSize()
      );
      expect(nextState.settingOverrides.imageShowActualSize).toBe(false);
    });

    it('changes histogramMode on metricsChangeHistogramMode', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          histogramMode: HistogramMode.OFFSET,
        }),
        settingOverrides: {},
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeHistogramMode({
          histogramMode: HistogramMode.OVERLAY,
        })
      );
      expect(nextState.settingOverrides.histogramMode).toBe(
        HistogramMode.OVERLAY
      );
    });

    it('changes cardMinWidth on metricsChangeCardWidth', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          cardMinWidth: 400,
        }),
        settingOverrides: {},
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeCardWidth({cardMinWidth: 500})
      );
      expect(nextState.settingOverrides.cardMinWidth).toBe(500);
    });

    it('resets cardMinWidth', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          cardMinWidth: 400,
        }),
        settingOverrides: {
          cardMinWidth: 500,
        },
      });
      const nextState = reducers(prevState, actions.metricsResetCardWidth());
      expect(nextState.settings.cardMinWidth).toBe(400);
      expect(nextState.settingOverrides.cardMinWidth).toBeNull();
    });
  });

  describe('loading time series data', () => {
    it('updates store on fetch requested', () => {
      const beforeState = buildMetricsState({
        tagMetadata: {
          ...buildTagMetadata(),
          scalars: {
            tagDescriptions: {},
            tagToRuns: {tagA: ['exp1/run1', 'exp1/run2']},
          },
        },
      });
      const action = actions.multipleTimeSeriesRequested({
        requests: [
          {plugin: PluginType.SCALARS, tag: 'tagA', experimentIds: ['exp1']},
        ],
      });
      const nextState = reducers(beforeState, action);
      expect(nextState.timeSeriesData).toEqual({
        scalars: {
          tagA: {
            runToSeries: {},
            runToLoadState: {
              'exp1/run1': DataLoadState.LOADING,
              'exp1/run2': DataLoadState.LOADING,
            },
          },
        },
        histograms: {},
        images: {},
      });
    });

    it('updates store on fetch failure', () => {
      const beforeState = buildMetricsState({
        tagMetadata: {
          scalars: {
            tagDescriptions: {},
            tagToRuns: {tagA: ['exp1/run1', 'exp1/run2']},
          },
          histograms: {
            tagDescriptions: {},
            tagToRuns: {tagB: ['exp1/run1', 'exp1/run2']},
          },
          images: {
            tagDescriptions: {},
            tagRunSampledInfo: {
              tagC: {
                'exp1/run1': {maxSamplesPerStep: 1},
                'exp1/run2': {maxSamplesPerStep: 2},
              },
            },
          },
        },
      });
      let nextState = reducers(
        beforeState,
        actions.fetchTimeSeriesFailed({
          request: {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            experimentIds: ['exp1'],
          },
        })
      );
      nextState = reducers(
        nextState,
        actions.fetchTimeSeriesFailed({
          request: {
            plugin: PluginType.HISTOGRAMS,
            tag: 'tagB',
            runId: 'exp1/run1',
          },
        })
      );
      nextState = reducers(
        nextState,
        actions.fetchTimeSeriesFailed({
          request: {
            plugin: PluginType.IMAGES,
            tag: 'tagC',
            runId: 'exp1/run1',
            sample: 0,
          },
        })
      );
      expect(nextState.timeSeriesData).toEqual({
        scalars: {
          tagA: {
            runToSeries: {},
            runToLoadState: {
              'exp1/run1': DataLoadState.FAILED,
              'exp1/run2': DataLoadState.FAILED,
            },
          },
        },
        histograms: {
          tagB: {
            runToSeries: {},
            runToLoadState: {
              'exp1/run1': DataLoadState.FAILED,
            },
          },
        },
        images: {
          tagC: {
            0: {
              runToSeries: {},
              runToLoadState: {
                'exp1/run1': DataLoadState.FAILED,
              },
            },
          },
        },
      });
    });

    it('updates store on fetch loaded successfully', () => {
      const beforeState = buildMetricsState({
        tagMetadata: {
          scalars: {
            tagDescriptions: {},
            tagToRuns: {tagA: ['run1', 'run2']},
          },
          histograms: {
            tagDescriptions: {},
            tagToRuns: {tagB: ['run1', 'run2']},
          },
          images: {
            tagDescriptions: {},
            tagRunSampledInfo: {
              tagC: {
                run1: {maxSamplesPerStep: 1},
                run2: {maxSamplesPerStep: 2},
              },
            },
          },
        },
      });

      const sample = 9;
      let nextState = reducers(
        beforeState,
        actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runToSeries: {run1: createScalarStepData()},
          },
        })
      );
      nextState = reducers(
        nextState,
        actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.HISTOGRAMS,
            tag: 'tagB',
            runId: 'run1',
            runToSeries: {run1: createHistogramStepData()},
          },
        })
      );
      nextState = reducers(
        nextState,
        actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.IMAGES,
            tag: 'tagC',
            runId: 'run1',
            sample,
            runToSeries: {run1: createImageStepData()},
          },
        })
      );
      expect(nextState.timeSeriesData).toEqual({
        scalars: {
          tagA: {
            runToSeries: {run1: createScalarStepData()},
            runToLoadState: {run1: DataLoadState.LOADED},
          },
        },
        histograms: {
          tagB: {
            runToSeries: {run1: createHistogramStepData()},
            runToLoadState: {run1: DataLoadState.LOADED},
          },
        },
        images: {
          tagC: {
            [sample]: {
              runToSeries: {run1: createImageStepData()},
              runToLoadState: {run1: DataLoadState.LOADED},
            },
          },
        },
      });
    });

    it('updates store on fetch loaded with some errors', () => {
      const beforeState = buildMetricsState({
        tagMetadata: {
          scalars: {
            tagDescriptions: {},
            tagToRuns: {tagA: ['run1', 'run2']},
          },
          histograms: {
            tagDescriptions: {},
            tagToRuns: {tagB: ['run1', 'run2']},
          },
          images: {
            tagDescriptions: {},
            tagRunSampledInfo: {tagC: {run1: {maxSamplesPerStep: 1}}},
          },
        },
      });
      const badSample = 9;
      const goodResponses = [
        {
          plugin: PluginType.HISTOGRAMS,
          tag: 'tagB',
          runId: 'run1',
          runToSeries: {run1: createHistogramStepData()},
        },
      ];
      const badResponses = [
        {plugin: PluginType.SCALARS, tag: 'tagA', error: 'No data found'},
        {
          plugin: PluginType.IMAGES,
          tag: 'tagC',
          runId: 'run1',
          sample: badSample,
          error: 'Invalid sample',
        },
      ];
      let nextState = beforeState;
      for (const response of [...goodResponses, ...badResponses]) {
        nextState = reducers(
          nextState,
          actions.fetchTimeSeriesLoaded({response})
        );
      }
      expect(nextState.timeSeriesData).toEqual({
        scalars: {
          tagA: {
            runToSeries: {},
            runToLoadState: {
              run1: DataLoadState.FAILED,
              run2: DataLoadState.FAILED,
            },
          },
        },
        histograms: {
          tagB: {
            runToSeries: {run1: createHistogramStepData()},
            runToLoadState: {run1: DataLoadState.LOADED},
          },
        },
        images: {
          tagC: {
            [badSample]: {
              runToSeries: {},
              runToLoadState: {run1: DataLoadState.FAILED},
            },
          },
        },
      });
    });

    it('preserves store when load actions have no effect', () => {
      const beforeState = buildMetricsState({
        timeSeriesData: createTimeSeriesData(),
      });
      const nextState = reducers(
        beforeState,
        actions.multipleTimeSeriesRequested({requests: []})
      );

      expect(nextState.timeSeriesData).toBe(beforeState.timeSeriesData);
      expect(nextState.timeSeriesData).toEqual(createTimeSeriesData());
    });
  });

  describe('card ui', () => {
    function createScalarCardLoadedState(
      cardId: CardId,
      runToSeries: {[runId: string]: ScalarStepDatum[]},
      tag?: string
    ) {
      tag = tag || 'tagA';
      const runToLoadState: RunToLoadState = {};
      for (const run of Object.keys(runToSeries)) {
        runToLoadState[run] = DataLoadState.LOADED;
      }

      return buildMetricsState({
        timeSeriesData: {
          scalars: {[tag]: {runToSeries, runToLoadState}},
          histograms: {},
          images: {},
        },
        cardMetadataMap: {
          [cardId]: {plugin: PluginType.SCALARS, tag, runId: null},
        },
      });
    }
    describe('step index changes via slider', () => {
      it('updates to new step slider value within max time series', () => {
        const shortLength = 3;
        const runToSeries = {
          shortRun: createScalarStepSeries(shortLength),
          longRun: createScalarStepSeries(shortLength + 10),
        };
        const beforeState = createScalarCardLoadedState('card1', runToSeries);

        const nextStepIndex = shortLength + 1;
        const action = actions.cardStepSliderChanged({
          cardId: 'card1',
          stepIndex: nextStepIndex,
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: {index: nextStepIndex, isClosest: false},
        });
      });

      it('slider value clamps to time series length', () => {
        const runToSeries = {
          run1: createScalarStepSeries(3),
        };
        const beforeState = createScalarCardLoadedState('card1', runToSeries);

        const action = actions.cardStepSliderChanged({
          cardId: 'card1',
          stepIndex: 100,
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: buildStepIndexMetadata({index: 2}),
        });
      });

      it('sets step index to null when there is no time series', () => {
        const runToSeries = {};
        const beforeState = createScalarCardLoadedState('card1', runToSeries);

        const action = actions.cardStepSliderChanged({
          cardId: 'card1',
          stepIndex: 100,
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: buildStepIndexMetadata({index: null}),
        });
      });
    });

    describe('time series updates affect steps (including pinned)', () => {
      function stateWithPinnedCopy(
        state: MetricsState,
        originalCardId: CardId,
        pinnedCardId: CardId
      ) {
        return {
          ...state,
          cardMetadataMap: {
            ...state.cardMetadataMap,
            [pinnedCardId]: state.cardMetadataMap[originalCardId],
          },
          cardToPinnedCopy: new Map([[originalCardId, pinnedCardId]]),
          pinnedCardToOriginal: new Map([[pinnedCardId, originalCardId]]),
        };
      }

      it('does not alter existing non-max step indices', () => {
        const runToSeries = {run1: createScalarStepSeries(5)};
        let beforeState = createScalarCardLoadedState(
          'card1',
          runToSeries,
          'tagA'
        );
        beforeState = {
          ...stateWithPinnedCopy(beforeState, 'card1', 'pinnedCopy1'),
          cardStepIndex: {
            card1: buildStepIndexMetadata({index: 2}),
            pinnedCopy1: buildStepIndexMetadata({index: 2}),
          },
        };

        const action = actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runToSeries: {run1: createScalarStepSeries(5)},
          },
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: buildStepIndexMetadata({index: 2}),
          pinnedCopy1: buildStepIndexMetadata({index: 2}),
        });
      });

      it('updates existing step indices that were at the max', () => {
        const stepCount = 5;
        const runToSeries = {run1: createScalarStepSeries(stepCount)};
        let beforeState = createScalarCardLoadedState(
          'card1',
          runToSeries,
          'tagA'
        );
        beforeState = {
          ...stateWithPinnedCopy(beforeState, 'card1', 'pinnedCopy1'),
          cardStepIndex: {
            card1: buildStepIndexMetadata({index: stepCount - 1}),
            pinnedCopy1: buildStepIndexMetadata({index: stepCount - 1}),
          },
        };

        const newStepCount = 10;
        const action = actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runToSeries: {run1: createScalarStepSeries(newStepCount)},
          },
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: buildStepIndexMetadata({index: newStepCount - 1}),
          pinnedCopy1: buildStepIndexMetadata({index: newStepCount - 1}),
        });
      });

      it('clamps step index to max time series length', () => {
        const runToSeries = {
          run1: createScalarStepSeries(5),
          run2: createScalarStepSeries(10),
        };
        let beforeState = createScalarCardLoadedState(
          'card1',
          runToSeries,
          'tagA'
        );
        beforeState = {
          ...stateWithPinnedCopy(beforeState, 'card1', 'pinnedCopy1'),
          cardStepIndex: {
            card1: buildStepIndexMetadata({index: 9}),
            pinnedCopy1: buildStepIndexMetadata({index: 9}),
          },
        };

        const action = actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runToSeries: {
              run1: createScalarStepSeries(1),
              run2: createScalarStepSeries(3),
            },
          },
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: buildStepIndexMetadata({index: 2}),
          pinnedCopy1: buildStepIndexMetadata({index: 2}),
        });
      });

      it('auto-selects step index if it was missing', () => {
        const runToSeries = {};
        let beforeState = createScalarCardLoadedState(
          'card1',
          runToSeries,
          'tagA'
        );
        beforeState = {
          ...stateWithPinnedCopy(beforeState, 'card1', 'pinnedCopy1'),
          cardStepIndex: {},
        };

        const action = actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runToSeries: {
              run1: createScalarStepSeries(1),
              run2: createScalarStepSeries(3),
            },
          },
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: buildStepIndexMetadata({index: 2}),
          pinnedCopy1: buildStepIndexMetadata({index: 2}),
        });
      });

      it('sets step index to null if time series is empty', () => {
        const runToSeries = {};
        let beforeState = createScalarCardLoadedState(
          'card1',
          runToSeries,
          'tagA'
        );
        beforeState = {
          ...stateWithPinnedCopy(beforeState, 'card1', 'pinnedCopy1'),
          cardStepIndex: {
            card1: buildStepIndexMetadata({index: 5}),
            pinnedCopy1: buildStepIndexMetadata({index: 5}),
          },
        };

        const action = actions.fetchTimeSeriesLoaded({
          response: {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runToSeries: {},
          },
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({
          card1: null,
          pinnedCopy1: null,
        });
      });
    });
  });

  describe('card visibility', () => {
    it('no-ops when nothing is changed', () => {
      const beforeState = buildMetricsState({
        visibleCardMap: new Map([[nextElementId(), 'card1']]),
      });

      const action = actions.cardVisibilityChanged({
        enteredCards: [],
        exitedCards: [],
      });
      const nextState = reducers(beforeState, action);
      expect(nextState.visibleCardMap).toEqual(
        new Map([[jasmine.any(Symbol), 'card1']])
      );
      expect(nextState).toBe(beforeState);
    });

    it('handles bad payloads', () => {
      const existingElementId = nextElementId();
      const beforeState = buildMetricsState({
        visibleCardMap: new Map([[existingElementId, 'card1']]),
      });

      const action = actions.cardVisibilityChanged({
        enteredCards: [{elementId: existingElementId, cardId: 'card2'}],
        exitedCards: [],
      });
      let nextState = beforeState;
      expect(() => {
        nextState = reducers(beforeState, action);
      }).toThrow();
      expect(nextState).toBe(beforeState);
    });

    it('handles adding and removing cards', () => {
      const existingElementIds = [nextElementId(), nextElementId()];
      const beforeState = buildMetricsState({
        visibleCardMap: new Map([
          [existingElementIds[0], 'existingCard1'],
          [existingElementIds[1], 'existingCard2'],
        ]),
      });

      const newCard1ElementId = nextElementId();
      const action = actions.cardVisibilityChanged({
        enteredCards: [
          {elementId: existingElementIds[0], cardId: 'existingCard1'},
          {elementId: newCard1ElementId, cardId: 'newCard1'},
        ],
        exitedCards: [
          {elementId: existingElementIds[1], cardId: 'existingCard2'},
          {elementId: nextElementId(), cardId: 'newCard2'},
        ],
      });
      const nextState = reducers(beforeState, action);
      expect(nextState.visibleCardMap).toEqual(
        new Map([
          [existingElementIds[0], 'existingCard1'],
          [newCard1ElementId, 'newCard1'],
        ])
      );
    });

    it(
      'marks a card as visible when it enters and exits on different ' +
        'elements',
      () => {
        const existingElementIds = [nextElementId(), nextElementId()];
        const beforeState = buildMetricsState({
          visibleCardMap: new Map(),
        });

        const action = actions.cardVisibilityChanged({
          enteredCards: [
            {elementId: existingElementIds[0], cardId: 'duplicateCard'},
          ],
          exitedCards: [
            {elementId: existingElementIds[1], cardId: 'duplicateCard'},
          ],
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.visibleCardMap).toEqual(
          new Map([[existingElementIds[0], 'duplicateCard']])
        );
      }
    );
  });

  describe('cardPinStateToggled', () => {
    it('unpins a pinned copy', () => {
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          card1: createScalarCardMetadata(),
          pinnedCopy1: createScalarCardMetadata(),
        },
        cardList: ['card1'],
        cardStepIndex: {
          card1: buildStepIndexMetadata({index: 10}),
          pinnedCopy1: buildStepIndexMetadata({index: 20}),
        },
        cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
        cardToPinnedCopyCache: new Map([['card1', 'pinnedCopy1']]),
        pinnedCardToOriginal: new Map([['pinnedCopy1', 'card1']]),
      });
      const nextState = reducers(
        beforeState,
        actions.cardPinStateToggled({
          cardId: 'pinnedCopy1',
          canCreateNewPins: true,
          wasPinned: true,
        })
      );

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          card1: createScalarCardMetadata(),
        },
        cardList: ['card1'],
        cardStepIndex: {
          card1: buildStepIndexMetadata({index: 10}),
        },
        cardToPinnedCopy: new Map(),
        cardToPinnedCopyCache: new Map(),
        pinnedCardToOriginal: new Map(),
      });
      expect(nextState).toEqual(expectedState);
    });

    it('unpins a card, removing its pinned copy', () => {
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          card1: createScalarCardMetadata(),
          pinnedCopy1: createScalarCardMetadata(),
        },
        cardList: ['card1'],
        cardStepIndex: {
          card1: buildStepIndexMetadata({index: 10}),
          pinnedCopy1: buildStepIndexMetadata({index: 20}),
        },
        cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
        cardToPinnedCopyCache: new Map([['card1', 'pinnedCopy1']]),
        pinnedCardToOriginal: new Map([['pinnedCopy1', 'card1']]),
      });
      const nextState = reducers(
        beforeState,
        actions.cardPinStateToggled({
          cardId: 'card1',
          canCreateNewPins: true,
          wasPinned: true,
        })
      );

      const expectedState = buildMetricsState({
        cardMetadataMap: {
          card1: createScalarCardMetadata(),
        },
        cardList: ['card1'],
        cardStepIndex: {
          card1: buildStepIndexMetadata({index: 10}),
        },
        cardToPinnedCopy: new Map(),
        cardToPinnedCopyCache: new Map(),
        pinnedCardToOriginal: new Map(),
      });
      expect(nextState).toEqual(expectedState);
    });

    it('creates a pinned copy with the same metadata, step index', () => {
      const cardMetadata = {
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      };
      const stepCount = 10;
      const timeSeriesData = {
        ...buildTimeSeriesData(),
        scalars: {
          tagA: {
            runToSeries: {run1: createScalarStepSeries(stepCount)},
            runToLoadState: {run1: DataLoadState.LOADED},
          },
        },
      };
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          card1: cardMetadata,
        },
        cardList: ['card1'],
        cardStepIndex: {
          card1: buildStepIndexMetadata({index: stepCount - 1}),
        },
        cardToPinnedCopy: new Map(),
        cardToPinnedCopyCache: new Map(),
        pinnedCardToOriginal: new Map(),
        timeSeriesData,
      });
      const nextState = reducers(
        beforeState,
        actions.cardPinStateToggled({
          cardId: 'card1',
          canCreateNewPins: true,
          wasPinned: false,
        })
      );

      const expectedPinnedCopyId = getPinnedCardId('card1');
      const expectedState = buildMetricsState({
        cardMetadataMap: {
          card1: cardMetadata,
          [expectedPinnedCopyId]: cardMetadata,
        },
        cardList: ['card1'],
        cardStepIndex: {
          card1: buildStepIndexMetadata({index: stepCount - 1}),
          [expectedPinnedCopyId]: buildStepIndexMetadata({
            index: stepCount - 1,
          }),
        },
        cardToPinnedCopy: new Map([['card1', expectedPinnedCopyId]]),
        cardToPinnedCopyCache: new Map([['card1', expectedPinnedCopyId]]),
        pinnedCardToOriginal: new Map([[expectedPinnedCopyId, 'card1']]),
        timeSeriesData,
      });
      expect(nextState).toEqual(expectedState);
    });

    it('throws an error when pinning a card without metadata', () => {
      const beforeState = buildMetricsState({
        cardMetadataMap: {},
        cardList: ['card1'],
        cardToPinnedCopy: new Map(),
        pinnedCardToOriginal: new Map(),
      });
      const action = actions.cardPinStateToggled({
        cardId: 'card1',
        canCreateNewPins: true,
        wasPinned: false,
      });

      expect(() => {
        return reducers(beforeState, action);
      }).toThrow();
    });

    it('throws an error when pinning an unknown card', () => {
      const beforeState = buildMetricsState({
        cardMetadataMap: {},
        cardList: ['card1'],
        cardToPinnedCopy: new Map(),
        pinnedCardToOriginal: new Map(),
      });
      const action = actions.cardPinStateToggled({
        cardId: 'cardUnknown',
        canCreateNewPins: true,
        wasPinned: false,
      });

      expect(() => {
        return reducers(beforeState, action);
      }).toThrow();
    });
  });

  describe('metricsTagFilterChanged', () => {
    it('sets the tagFilter state', () => {
      const state = buildMetricsState({tagFilter: 'foo'});
      const action = actions.metricsTagFilterChanged({tagFilter: 'foobar'});
      const nextState = reducers(state, action);
      expect(nextState.tagFilter).toBe('foobar');
    });
  });

  describe('metricsTagGroupExpansionChanged', () => {
    it('toggles tagGroup expansion state', () => {
      const state1 = buildMetricsState({
        tagGroupExpanded: new Map([['foo', true]]),
      });

      const state2 = reducers(
        state1,
        actions.metricsTagGroupExpansionChanged({tagGroup: 'foo'})
      );
      expect(state2.tagGroupExpanded).toEqual(new Map([['foo', false]]));

      const state3 = reducers(
        state2,
        actions.metricsTagGroupExpansionChanged({tagGroup: 'foo'})
      );
      expect(state3.tagGroupExpanded).toEqual(new Map([['foo', true]]));
    });

    it('expands new tagGroup', () => {
      const state = buildMetricsState({
        tagGroupExpanded: new Map(),
      });

      const nextState = reducers(
        state,
        actions.metricsTagGroupExpansionChanged({tagGroup: 'foo'})
      );
      expect(nextState.tagGroupExpanded).toEqual(new Map([['foo', true]]));
    });
  });

  describe('pinned card hydration', () => {
    it('ignores RouteKind EXPERIMENTS', () => {
      const beforeState = buildMetricsState({
        unresolvedImportedPinnedCards: [],
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENTS,
        partialState: {
          metrics: {
            pinnedCards: [{plugin: PluginType.SCALARS, tag: 'accuracy'}],
          },
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.unresolvedImportedPinnedCards).toEqual([]);
    });

    it('populates ngrx store with unresolved imported pins', () => {
      const beforeState = buildMetricsState({
        unresolvedImportedPinnedCards: [],
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {
            pinnedCards: [{plugin: PluginType.SCALARS, tag: 'accuracy'}],
          },
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.unresolvedImportedPinnedCards).toEqual([
        {plugin: PluginType.SCALARS, tag: 'accuracy'},
      ]);
    });

    it('resolves imported pins', () => {
      const fakeMetadata = {
        ...createCardMetadata(PluginType.SCALARS),
        tag: 'accuracy',
      };
      const beforeState = buildMetricsState({
        cardList: ['card1'],
        cardMetadataMap: {
          card1: fakeMetadata,
        },
        tagMetadataLoadState: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 1,
        },
        tagMetadata: {
          ...buildTagMetadata(),
          [PluginType.SCALARS]: {
            tagDescriptions: {},
            tagToRuns: {accuracy: ['run1']},
          },
        },
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {
            pinnedCards: [{plugin: PluginType.SCALARS, tag: 'accuracy'}],
          },
        },
      });
      const nextState = reducers(beforeState, action);

      const pinnedCopyId = getPinnedCardId('card1');
      expect(nextState.pinnedCardToOriginal).toEqual(
        new Map([[pinnedCopyId, 'card1']])
      );
      expect(nextState.cardToPinnedCopy).toEqual(
        new Map([['card1', pinnedCopyId]])
      );
      expect(nextState.cardToPinnedCopyCache).toEqual(
        new Map([['card1', pinnedCopyId]])
      );
      expect(nextState.unresolvedImportedPinnedCards).toEqual([]);
    });

    it('does not add resolved pins to the unresolved imported pins', () => {
      const fakeMetadata = {...createCardMetadata(), tag: 'accuracy'};
      const beforeState = buildMetricsState({
        cardMetadataMap: {
          'card-pin1': fakeMetadata,
          card1: fakeMetadata,
        },
        pinnedCardToOriginal: new Map([['card-pin1', 'card1']]),
        unresolvedImportedPinnedCards: [],
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {
            pinnedCards: [{plugin: PluginType.SCALARS, tag: 'accuracy'}],
          },
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.unresolvedImportedPinnedCards).toEqual([]);
    });

    it('does not create duplicate unresolved imported pins', () => {
      const beforeState = buildMetricsState({
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.SCALARS, tag: 'accuracy'},
        ],
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {
            pinnedCards: [{plugin: PluginType.SCALARS, tag: 'accuracy'}],
          },
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.unresolvedImportedPinnedCards).toEqual([
        {plugin: PluginType.SCALARS, tag: 'accuracy'},
      ]);
    });

    it('does not create duplicates if URL contained duplicates', () => {
      const beforeState = buildMetricsState();
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {
            pinnedCards: [
              {plugin: PluginType.SCALARS, tag: 'accuracyAgain'},
              {plugin: PluginType.SCALARS, tag: 'accuracyAgain'},
            ],
          },
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.unresolvedImportedPinnedCards).toEqual([
        {plugin: PluginType.SCALARS, tag: 'accuracyAgain'},
      ]);
    });

    it('does not clear unresolved imported pins if hydration is empty', () => {
      const beforeState = buildMetricsState({
        unresolvedImportedPinnedCards: [
          {plugin: PluginType.SCALARS, tag: 'accuracy'},
        ],
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {
            pinnedCards: [],
          },
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.unresolvedImportedPinnedCards).toEqual([
        {plugin: PluginType.SCALARS, tag: 'accuracy'},
      ]);
    });
  });

  describe('smoothing hydration', () => {
    it('rehydrates the smoothing state', () => {
      const beforeState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 1}),
        settingOverrides: {scalarSmoothing: 0.5},
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: 0.1}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settings.scalarSmoothing).toBe(1);
      expect(nextState.settingOverrides.scalarSmoothing).toBe(0.1);
    });

    it('keeps old state when the rehydrated state is null', () => {
      const beforeState = buildMetricsState({
        settingOverrides: {scalarSmoothing: 0.5},
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: null}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settingOverrides.scalarSmoothing).toBe(0.5);
    });

    it('keeps old state when the rehydrated state is null (empty override)', () => {
      const beforeState = buildMetricsState({
        settingOverrides: {},
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: null}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settingOverrides.scalarSmoothing).toBe(undefined);
    });

    it('keeps old state when the rehydrated state is NaN', () => {
      const beforeState = buildMetricsState({
        settingOverrides: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: NaN}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settingOverrides.scalarSmoothing).toBe(0.3);
    });

    it('clips value to 0', () => {
      const beforeState = buildMetricsState({
        settingOverrides: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: -0.1}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settingOverrides.scalarSmoothing).toBe(0);
    });

    it('clips value to 0.999', () => {
      const beforeState = buildMetricsState({
        settingOverrides: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: 100}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settingOverrides.scalarSmoothing).toBe(0.999);
    });

    it('rounds to the 3 significant digits to prevent weird numbers', () => {
      const beforeState = buildMetricsState({
        settingOverrides: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: 0.2318421}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settingOverrides.scalarSmoothing).toBe(0.232);
    });
  });

  describe('tag filter hydration', () => {
    it('rehydrates the value', () => {
      const beforeState = buildMetricsState({tagFilter: 'foo'});
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {...buildDeserializedState().metrics, tagFilter: 'bar'},
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.tagFilter).toBe('bar');
    });

    it('rehydrates an empty string value', () => {
      const beforeState = buildMetricsState({tagFilter: 'foo'});
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {...buildDeserializedState().metrics, tagFilter: ''},
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.tagFilter).toBe('');
    });

    it('does not hydrate when the value is null', () => {
      const beforeState = buildMetricsState({tagFilter: 'foo'});
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {
          metrics: {...buildDeserializedState().metrics, tagFilter: null},
        },
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.tagFilter).toBe('foo');
    });
  });

  describe('#globalSettingsLoaded', () => {
    it('adds partial state from loading the settings to the (alphabetical) settings', () => {
      const beforeState = buildMetricsState({
        settings: buildMetricsSettingsState({
          scalarSmoothing: 0.3,
          ignoreOutliers: false,
          tooltipSort: TooltipSort.ASCENDING,
        }),
        settingOverrides: {
          scalarSmoothing: 0.5,
          tooltipSort: TooltipSort.ALPHABETICAL,
        },
      });

      const nextState = reducers(
        beforeState,
        globalSettingsLoaded({
          partialSettings: {
            ignoreOutliers: true,
            tooltipSort: 'descending' as TooltipSort,
          },
        })
      );

      expect(nextState.settings.scalarSmoothing).toBe(0.3);
      expect(nextState.settings.ignoreOutliers).toBe(true);
      expect(nextState.settings.tooltipSort).toBe(TooltipSort.DESCENDING);
      expect(nextState.settingOverrides.scalarSmoothing).toBe(0.5);
      expect(nextState.settingOverrides.tooltipSort).toBe(
        TooltipSort.ALPHABETICAL
      );
    });

    it(
      'converts stringified tooltip sort into enum and discard the value when it ' +
        'is not known',
      () => {
        const beforeState = buildMetricsState({
          settings: buildMetricsSettingsState({
            tooltipSort: TooltipSort.ASCENDING,
          }),
        });

        const nextState = reducers(
          beforeState,
          globalSettingsLoaded({
            partialSettings: {
              tooltipSort: 'yo' as TooltipSort,
            },
          })
        );

        expect(nextState.settings.tooltipSort).toBe(TooltipSort.ASCENDING);
      }
    );

    it('loads settings pane state from the storage', () => {
      const beforeState = buildMetricsState({
        isSettingsPaneOpen: true,
      });

      const nextState = reducers(
        beforeState,
        globalSettingsLoaded({
          partialSettings: {
            timeSeriesSettingsPaneOpened: false,
          },
        })
      );

      expect(nextState.isSettingsPaneOpen).toBe(false);
    });
  });

  it('loads Step Selector Setting into the next state', () => {
    const beforeState = buildMetricsState({
      stepSelectorEnabled: false,
      rangeSelectionEnabled: false,
      linkedTimeEnabled: false,
    });

    const nextState = reducers(
      beforeState,
      globalSettingsLoaded({
        partialSettings: {
          stepSelectorEnabled: true,
        },
      })
    );

    expect(nextState.stepSelectorEnabled).toBe(true);
    expect(nextState.rangeSelectionEnabled).toBe(false);
    expect(nextState.linkedTimeEnabled).toBe(false);
  });

  it('loads Step Selector Setting into the next state', () => {
    const beforeState = buildMetricsState({
      stepSelectorEnabled: false,
      rangeSelectionEnabled: false,
      linkedTimeEnabled: false,
    });

    const nextState = reducers(
      beforeState,
      globalSettingsLoaded({
        partialSettings: {
          rangeSelectionEnabled: true,
        },
      })
    );

    expect(nextState.stepSelectorEnabled).toBe(false);
    expect(nextState.rangeSelectionEnabled).toBe(true);
    expect(nextState.linkedTimeEnabled).toBe(false);
  });

  it('loads Step Selector Setting into the next state', () => {
    const beforeState = buildMetricsState({
      stepSelectorEnabled: false,
      rangeSelectionEnabled: false,
      linkedTimeEnabled: false,
    });

    const nextState = reducers(
      beforeState,
      globalSettingsLoaded({
        partialSettings: {
          linkedTimeEnabled: true,
        },
      })
    );

    expect(nextState.stepSelectorEnabled).toBe(false);
    expect(nextState.rangeSelectionEnabled).toBe(false);
    expect(nextState.linkedTimeEnabled).toBe(true);
  });

  describe('linked time features', () => {
    describe('#timeSelectionChanged', () => {
      const imageCardId = 'test image card id "plugin":"images"';
      const cardMetadataMap = {
        [imageCardId]: {
          runId: 'test run Id',
          plugin: PluginType.IMAGES,
          tag: 'tagC',
          sample: 111,
        },
      };

      it('sets the linked time selection value', () => {
        const beforeState = buildMetricsState({
          linkedTimeSelection: null,
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 2},
              end: {step: 5},
            },
          })
        );

        expect(nextState.linkedTimeSelection).toEqual({
          start: {step: 2},
          end: {step: 5},
        });
      });

      it('sets `end` to null from data when `endStep` is not present', () => {
        const before = buildMetricsState({
          linkedTimeSelection: null,
          stepMinMax: {min: 0, max: 100},
        });

        const after = reducers(
          before,
          actions.timeSelectionChanged({
            timeSelection: {start: {step: 2}, end: null},
          })
        );

        expect(after.linkedTimeSelection).toEqual({
          start: {step: 2},
          end: null,
        });
      });

      it('sets `end` when `endStep` is present', () => {
        const before = buildMetricsState({
          linkedTimeSelection: null,
          stepMinMax: {min: 0, max: 100},
        });

        const after = reducers(
          before,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 2},
              end: {step: 50},
            },
          })
        );

        expect(after.linkedTimeSelection).toEqual({
          start: {step: 2},
          end: {step: 50},
        });
      });

      it('keeps linkedTimeEnabled disabled if previously disabled', () => {
        const beforeState = buildMetricsState({
          linkedTimeEnabled: false,
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {start: {step: 2}, end: null},
          })
        );

        expect(nextState.linkedTimeEnabled).toBe(false);
      });

      it('flips `end` to `start` if new start is greater than new end', () => {
        const beforeState = buildMetricsState({
          linkedTimeSelection: null,
          stepMinMax: {min: 0, max: 100},
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 150},
              end: {step: 0},
            },
          })
        );

        expect(nextState.linkedTimeSelection).toEqual({
          start: {step: 150},
          end: {step: 150},
        });
      });

      it('sets `rangeSelectionEnabled` to true when `endStep` is present and linked time selection is null', () => {
        const beforeState = buildMetricsState({
          rangeSelectionEnabled: false,
          linkedTimeSelection: null,
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 2},
              end: {step: 5},
            },
          })
        );

        expect(nextState.rangeSelectionEnabled).toEqual(true);
      });

      // This test case represents <tb-range-input> renders range slider from single slider.
      it('sets `rangeSelectionEnabled` to true when `endStep` is present linked time selection is not null', () => {
        const beforeState = buildMetricsState({
          rangeSelectionEnabled: false,
          linkedTimeSelection: {
            start: {step: 0},
            // When single slider is rendered, the end step is set to step max.
            // Here set it as an arbitrary number.
            end: {step: 100},
          },
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 2},
              end: {step: 5},
            },
          })
        );

        expect(nextState.rangeSelectionEnabled).toEqual(true);
      });

      it('sets `rangeSelectionEnabled` to true when `endStep` is 0', () => {
        const beforeState = buildMetricsState({
          rangeSelectionEnabled: false,
          linkedTimeSelection: {
            start: {step: 2},
            end: {step: 100},
          },
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 2},
              end: {step: 0},
            },
          })
        );

        expect(nextState.rangeSelectionEnabled).toEqual(true);
      });

      it('keeps `rangeSelectionEnabled` to be false when only sets `startStep`', () => {
        const beforeState1 = buildMetricsState({
          rangeSelectionEnabled: false,
          linkedTimeSelection: null,
        });

        const nextState1 = reducers(
          beforeState1,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 2},
              end: null,
            },
          })
        );

        expect(nextState1.rangeSelectionEnabled).toEqual(false);
      });

      it('sets `cardStepIndex` when step matches linked time selection', () => {
        const beforeState = buildMetricsState({
          linkedTimeEnabled: false,
          cardMetadataMap,
          timeSeriesData: {
            ...buildTimeSeriesData(),
            images: {
              tagC: {
                111: {
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
            },
          },
          cardStepIndex: {[imageCardId]: buildStepIndexMetadata({index: 2})},
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 10},
              end: null,
            },
          })
        );

        expect(nextState.cardStepIndex).toEqual({
          [imageCardId]: buildStepIndexMetadata({index: 0}),
        });
      });

      it('does not set `cardStepIndex` when steps do not match linked time selection', () => {
        const beforeState = buildMetricsState({
          linkedTimeEnabled: false,
          cardMetadataMap,
          stepMinMax: {min: Infinity, max: -Infinity},
          timeSeriesData: {
            ...buildTimeSeriesData(),
            images: {
              tagC: {
                111: {
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
            },
          },
          cardStepIndex: {[imageCardId]: buildStepIndexMetadata({index: 2})},
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 15},
              end: null,
            },
          })
        );

        expect(nextState.cardStepIndex).toEqual({
          [imageCardId]: buildStepIndexMetadata({index: 2}),
        });
      });
    });

    it('sets `rangeSelectionEnabled` to false when `endStep` is undefined', () => {
      const beforeState = buildMetricsState({
        rangeSelectionEnabled: true,
        linkedTimeSelection: {
          start: {step: 2},
          end: {step: 100},
        },
      });

      const nextState = reducers(
        beforeState,
        actions.timeSelectionChanged({
          timeSelection: {
            start: {step: 3},
            end: null,
          },
        })
      );

      expect(nextState.rangeSelectionEnabled).toEqual(false);
    });

    describe('#timeSelectionCleared', () => {
      it('clears linked time selection', () => {
        const beforeState = buildMetricsState({
          linkedTimeSelection: {start: {step: 4}, end: {step: 4}},
        });

        const nextState = reducers(beforeState, actions.timeSelectionCleared());

        expect(nextState.linkedTimeSelection).toBeNull();
      });
    });

    describe('#rangeSelectionToggled', () => {
      it('toggles whether stepSelectorRange is enabled or not', () => {
        const state1 = buildMetricsState({
          rangeSelectionEnabled: false,
        });

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.rangeSelectionEnabled).toBe(true);

        const state3 = reducers(state2, actions.rangeSelectionToggled({}));
        expect(state3.rangeSelectionEnabled).toBe(false);
      });

      it('enables stepSelector if disabled when enabling stepSelectorRange', () => {
        const state1 = buildMetricsState({
          stepSelectorEnabled: false,
          rangeSelectionEnabled: false,
        });

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.stepSelectorEnabled).toBe(true);
        expect(state2.rangeSelectionEnabled).toBe(true);
      });

      it('keeps stepSelector enabled when disabling stepSelectorRange', () => {
        const state1 = buildMetricsState({
          stepSelectorEnabled: true,
          rangeSelectionEnabled: true,
        });

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.stepSelectorEnabled).toBe(true);
        expect(state2.rangeSelectionEnabled).toBe(false);
      });

      it('generates a value for linkedTimeSelection when needed', () => {
        const state1 = buildMetricsState();

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.linkedTimeSelection).toEqual({
          start: {step: Infinity},
          end: {step: -Infinity},
        });
      });
    });

    describe('#linkedTimeEnabled', () => {
      const imageCardId = 'test image card id "plugin":"images"';
      const cardMetadataMap = {
        [imageCardId]: {
          runId: 'test run Id',
          plugin: PluginType.IMAGES,
          tag: 'tagC',
          sample: 111,
        },
      };

      it('toggles whether linkedTime is enabled or not', () => {
        const state1 = buildMetricsState({
          linkedTimeEnabled: false,
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.linkedTimeEnabled).toBe(true);

        const state3 = reducers(state2, actions.linkedTimeToggled({}));
        expect(state3.linkedTimeEnabled).toBe(false);
      });

      it('enables stepSelector when linkedTime is enabled', () => {
        const state1 = buildMetricsState({
          stepSelectorEnabled: false,
          linkedTimeEnabled: false,
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.stepSelectorEnabled).toBe(true);
        expect(state2.linkedTimeEnabled).toBe(true);
      });

      it('keeps stepSelector enabled when linkedTime is disabled', () => {
        const state1 = buildMetricsState({
          stepSelectorEnabled: true,
          linkedTimeEnabled: true,
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.stepSelectorEnabled).toBe(true);
        expect(state2.linkedTimeEnabled).toBe(false);
      });

      it('sets cardStepIndex to step 0 when linkedTimeSelection is null before toggling', () => {
        const state1 = buildMetricsState({
          linkedTimeEnabled: false,
          cardMetadataMap,
          stepMinMax: {min: Infinity, max: -Infinity},
          timeSeriesData: {
            ...buildTimeSeriesData(),
            images: {
              tagC: {
                111: {
                  runToLoadState: {},
                  runToSeries: {
                    'test run Id': [
                      {step: 0, wallTime: 0, imageId: '1'},
                      {step: 10, wallTime: 0, imageId: '1'},
                      {step: 20, wallTime: 10, imageId: '2'},
                      {step: 30, wallTime: 15, imageId: '3'},
                    ],
                  },
                },
              },
            },
          },
          cardStepIndex: {[imageCardId]: buildStepIndexMetadata({index: 2})},
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));

        expect(state2.cardStepIndex).toEqual({
          [imageCardId]: buildStepIndexMetadata({index: 0}),
        });
      });

      it('updates step index using pre-existing linkedTimeSelection', () => {
        const state1 = buildMetricsState({
          linkedTimeEnabled: false,
          cardMetadataMap,
          timeSeriesData: {
            ...buildTimeSeriesData(),
            images: {
              tagC: {
                111: {
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
            },
          },
          linkedTimeSelection: {start: {step: 20}, end: null},
          cardStepIndex: {[imageCardId]: buildStepIndexMetadata({index: 2})},
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.cardStepIndex).toEqual({
          [imageCardId]: buildStepIndexMetadata({index: 1}),
        });
      });

      it('does not update step index when toggle to disable linkedTimeSelection', () => {
        const state1 = buildMetricsState({
          linkedTimeEnabled: true,
          cardMetadataMap: {
            [imageCardId]: {
              runId: 'test run Id',
              plugin: PluginType.IMAGES,
              tag: 'tagC',
              sample: 111,
            },
          },
          timeSeriesData: {
            ...buildTimeSeriesData(),
            images: {
              tagC: {
                111: {
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
            },
          },
          linkedTimeSelection: {start: {step: 20}, end: null},
          cardStepIndex: {[imageCardId]: buildStepIndexMetadata({index: 2})},
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.cardStepIndex).toEqual({
          [imageCardId]: buildStepIndexMetadata({index: 2}),
        });
      });

      it('sets linkedTimeSelection to step 0 when linkedTimeSelection is null before toggling', () => {
        const state1 = buildMetricsState({
          stepMinMax: {min: Infinity, max: -Infinity},
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));

        expect(state2.linkedTimeSelection).toEqual({
          start: {step: 0},
          end: null,
        });
      });

      it('sets linkedTimeSelection to min step when linkedTimeSelection is null before toggling', () => {
        const state1 = buildMetricsState({
          stepMinMax: {min: 10, max: 100},
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));

        expect(state2.linkedTimeSelection).toEqual({
          start: {step: 10},
          end: null,
        });
      });

      it('dose not update linkedTimeSelection on toggling when it is pre-existed', () => {
        const state1 = buildMetricsState({
          linkedTimeSelection: {start: {step: 20}, end: null},
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.linkedTimeSelection).toEqual({
          start: {step: 20},
          end: null,
        });
      });
    });
  });

  describe('step selector features', () => {
    it('toggles whether stepSelector is enabled or not', () => {
      const state1 = buildMetricsState({
        stepSelectorEnabled: false,
      });

      const state2 = reducers(state1, actions.stepSelectorToggled({}));
      expect(state2.stepSelectorEnabled).toBe(true);

      const state3 = reducers(state2, actions.stepSelectorToggled({}));
      expect(state3.stepSelectorEnabled).toBe(false);
    });

    it('disables linkedTime when stepSelector is disabled', () => {
      const state1 = buildMetricsState({
        stepSelectorEnabled: false,
        linkedTimeEnabled: false,
      });

      const state2 = reducers(state1, actions.stepSelectorToggled({}));
      expect(state2.stepSelectorEnabled).toBe(true);
      expect(state2.linkedTimeEnabled).toBe(false);

      const state3 = buildMetricsState({
        stepSelectorEnabled: true,
        linkedTimeEnabled: true,
      });
      const state4 = reducers(state3, actions.stepSelectorToggled({}));
      expect(state4.stepSelectorEnabled).toBe(false);
      expect(state2.linkedTimeEnabled).toBe(false);
    });

    it('disables rangeSelection when stepSelector is disabled', () => {
      const state1 = buildMetricsState({
        stepSelectorEnabled: false,
        rangeSelectionEnabled: true,
      });
      const state2 = reducers(state1, actions.stepSelectorToggled({}));
      expect(state2.stepSelectorEnabled).toBe(true);
      expect(state2.rangeSelectionEnabled).toBe(true);

      const state3 = buildMetricsState({
        stepSelectorEnabled: true,
        rangeSelectionEnabled: true,
      });
      const state4 = reducers(state3, actions.stepSelectorToggled({}));
      expect(state4.stepSelectorEnabled).toBe(false);
      expect(state4.rangeSelectionEnabled).toBe(false);
    });
  });

  describe('plugin filtering feature', () => {
    describe('#metricsToggleVisiblePlugin', () => {
      it('toggles plugin types', () => {
        const state1 = buildMetricsState({
          filteredPluginTypes: new Set([PluginType.IMAGES]),
        });

        const state2 = reducers(
          state1,
          actions.metricsToggleVisiblePlugin({
            plugin: PluginType.SCALARS,
          })
        );
        expect(state2.filteredPluginTypes).toEqual(
          new Set([PluginType.SCALARS, PluginType.IMAGES])
        );

        const state3 = reducers(
          state2,
          actions.metricsToggleVisiblePlugin({
            plugin: PluginType.IMAGES,
          })
        );
        expect(state3.filteredPluginTypes).toEqual(
          new Set([PluginType.SCALARS])
        );
      });

      it('empties the plugin filter set when filteredPluginTypes contains all plugins', () => {
        const before = buildMetricsState({
          filteredPluginTypes: new Set([
            PluginType.IMAGES,
            PluginType.HISTOGRAMS,
          ]),
        });

        const after = reducers(
          before,
          actions.metricsToggleVisiblePlugin({
            plugin: PluginType.SCALARS,
          })
        );
        expect(after.filteredPluginTypes).toEqual(new Set([]));
      });
    });

    describe('#metricsShowAllPlugins', () => {
      it('clears all filtered plugin types', () => {
        const before = buildMetricsState({
          filteredPluginTypes: new Set([PluginType.IMAGES]),
        });

        const after = reducers(before, actions.metricsShowAllPlugins());
        expect(after.filteredPluginTypes).toEqual(new Set());
      });
    });
  });

  describe('#metricsSettingsPaneToggled', () => {
    it('toggles the settings pane opened state', () => {
      const state1 = buildMetricsState({
        isSettingsPaneOpen: false,
      });

      const state2 = reducers(state1, actions.metricsSettingsPaneToggled());
      expect(state2.isSettingsPaneOpen).toBe(true);

      const state3 = reducers(state2, actions.metricsSettingsPaneToggled());
      expect(state3.isSettingsPaneOpen).toBe(false);
    });
  });

  describe('#metricsSettingsPaneClosed', () => {
    it('sets false to the settings pane opened state', () => {
      const state1 = buildMetricsState({
        isSettingsPaneOpen: true,
      });

      const state2 = reducers(state1, actions.metricsSettingsPaneClosed());
      expect(state2.isSettingsPaneOpen).toBe(false);

      const state3 = reducers(state2, actions.metricsSettingsPaneClosed());
      expect(state3.isSettingsPaneOpen).toBe(false);
    });
  });
});
