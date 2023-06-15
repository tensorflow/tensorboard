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
import {persistentSettingsLoaded} from '../../persistent_settings';
import {buildDeserializedState} from '../../routes/testing';
import {DataLoadState} from '../../types/data';
import {nextElementId} from '../../util/dom';
import {TimeSelectionToggleAffordance} from '../../widgets/card_fob/card_fob_types';
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
  MinMaxStep,
  NonPinnedCardId,
  TooltipSort,
  XAxisType,
} from '../types';
import {ColumnHeaderType, DataTableMode} from '../../widgets/data_table/types';
import {reducers} from './metrics_reducers';
import {getCardId, getPinnedCardId} from './metrics_store_internal_utils';
import {
  CardFeatureOverride,
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

    it('updates hideEmptyCards', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          hideEmptyCards: false,
        }),
        settingOverrides: {},
      });

      const secondState = reducers(
        prevState,
        actions.metricsHideEmptyCardsToggled()
      );

      expect(secondState.settings.hideEmptyCards).toBe(false);
      expect(secondState.settingOverrides.hideEmptyCards).toBe(true);

      const thirdState = reducers(
        secondState,
        actions.metricsHideEmptyCardsToggled()
      );
      expect(thirdState.settings.hideEmptyCards).toBe(false);
      expect(thirdState.settingOverrides.hideEmptyCards).toBe(false);
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
        cardToPinnedCopy: new Map([
          [
            '{"plugin":"scalars","tag":"tagA","runId":null}',
            'somePinnedCardId',
          ],
        ]),
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

      const expectedCardStateMap = {
        '{"plugin":"scalars","tag":"tagA","runId":null}': {
          dataMinMax: {
            minStep: 0,
            maxStep: 99,
          },
        },
        somePinnedCardId: {
          dataMinMax: {
            minStep: 0,
            maxStep: 99,
          },
        },
      };
      expect(nextState.cardStateMap).toEqual(expectedCardStateMap);
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

    describe('dataTableColumnEdited', () => {
      it('edits range selection when dataTableMode is range', () => {
        const beforeState = buildMetricsState({
          rangeSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.START_VALUE,
              name: 'startValue',
              displayName: 'Start Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.END_VALUE,
              name: 'endValue',
              displayName: 'End Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.MIN_VALUE,
              name: 'minValue',
              displayName: 'Min',
              enabled: false,
            },
            {
              type: ColumnHeaderType.MAX_VALUE,
              name: 'maxValue',
              displayName: 'Max',
              enabled: false,
            },
          ],
          singleSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.VALUE,
              name: 'value',
              displayName: 'Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.STEP,
              name: 'step',
              displayName: 'Step',
              enabled: true,
            },
            {
              type: ColumnHeaderType.RELATIVE_TIME,
              name: 'relativeTime',
              displayName: 'Relative',
              enabled: false,
            },
          ],
        });

        const nextState = reducers(
          beforeState,
          actions.dataTableColumnEdited({
            dataTableMode: DataTableMode.RANGE,
            headers: [
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.END_VALUE,
                name: 'endValue',
                displayName: 'End Value',
                enabled: true,
              },
              {
                type: ColumnHeaderType.START_VALUE,
                name: 'startValue',
                displayName: 'Start Value',
                enabled: true,
              },
              {
                type: ColumnHeaderType.MIN_VALUE,
                name: 'minValue',
                displayName: 'Min',
                enabled: false,
              },
              {
                type: ColumnHeaderType.MAX_VALUE,
                name: 'maxValue',
                displayName: 'Max',
                enabled: false,
              },
            ],
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: false,
          },
        ]);
        expect(nextState.singleSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.VALUE,
            name: 'value',
            displayName: 'Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.STEP,
            name: 'step',
            displayName: 'Step',
            enabled: true,
          },
          {
            type: ColumnHeaderType.RELATIVE_TIME,
            name: 'relativeTime',
            displayName: 'Relative',
            enabled: false,
          },
        ]);
      });

      it('edits single selection when dataTableMode is single', () => {
        const beforeState = buildMetricsState({
          rangeSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.START_VALUE,
              name: 'startValue',
              displayName: 'Start Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.END_VALUE,
              name: 'endValue',
              displayName: 'End Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.MIN_VALUE,
              name: 'minValue',
              displayName: 'Min',
              enabled: false,
            },
            {
              type: ColumnHeaderType.MAX_VALUE,
              name: 'maxValue',
              displayName: 'Max',
              enabled: false,
            },
          ],
          singleSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.VALUE,
              name: 'value',
              displayName: 'Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.STEP,
              name: 'step',
              displayName: 'Step',
              enabled: true,
            },
            {
              type: ColumnHeaderType.RELATIVE_TIME,
              name: 'relativeTime',
              displayName: 'Relative',
              enabled: false,
            },
          ],
        });

        const nextState = reducers(
          beforeState,
          actions.dataTableColumnEdited({
            dataTableMode: DataTableMode.SINGLE,
            headers: [
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.STEP,
                name: 'step',
                displayName: 'Step',
                enabled: true,
              },
              {
                type: ColumnHeaderType.VALUE,
                name: 'value',
                displayName: 'Value',
                enabled: true,
              },
              {
                type: ColumnHeaderType.RELATIVE_TIME,
                name: 'relativeTime',
                displayName: 'Relative',
                enabled: false,
              },
            ],
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: false,
          },
        ]);
        expect(nextState.singleSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.STEP,
            name: 'step',
            displayName: 'Step',
            enabled: true,
          },
          {
            type: ColumnHeaderType.VALUE,
            name: 'value',
            displayName: 'Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.RELATIVE_TIME,
            name: 'relativeTime',
            displayName: 'Relative',
            enabled: false,
          },
        ]);
      });

      it('ensures ordering keeps enabled headers first', () => {
        const beforeState = buildMetricsState({
          rangeSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.START_VALUE,
              name: 'startValue',
              displayName: 'Start Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.END_VALUE,
              name: 'endValue',
              displayName: 'End Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.MIN_VALUE,
              name: 'minValue',
              displayName: 'Min',
              enabled: false,
            },
            {
              type: ColumnHeaderType.MAX_VALUE,
              name: 'maxValue',
              displayName: 'Max',
              enabled: false,
            },
          ],
        });

        const nextState = reducers(
          beforeState,
          actions.dataTableColumnEdited({
            dataTableMode: DataTableMode.RANGE,
            headers: [
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.MAX_VALUE,
                name: 'maxValue',
                displayName: 'Max',
                enabled: false,
              },
              {
                type: ColumnHeaderType.START_VALUE,
                name: 'startValue',
                displayName: 'Start Value',
                enabled: true,
              },
              {
                type: ColumnHeaderType.END_VALUE,
                name: 'endValue',
                displayName: 'End Value',
                enabled: true,
              },
              {
                type: ColumnHeaderType.MIN_VALUE,
                name: 'minValue',
                displayName: 'Min',
                enabled: false,
              },
            ],
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: false,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
        ]);
      });
    });

    describe('dataTableColumnToggled', () => {
      let beforeState: MetricsState;

      beforeEach(() => {
        beforeState = buildMetricsState({
          rangeSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.START_VALUE,
              name: 'startValue',
              displayName: 'Start Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.END_VALUE,
              name: 'endValue',
              displayName: 'End Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.MIN_VALUE,
              name: 'minValue',
              displayName: 'Min',
              enabled: false,
            },
            {
              type: ColumnHeaderType.MAX_VALUE,
              name: 'maxValue',
              displayName: 'Max',
              enabled: false,
            },
          ],
          singleSelectionHeaders: [
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.VALUE,
              name: 'value',
              displayName: 'Value',
              enabled: true,
            },
            {
              type: ColumnHeaderType.STEP,
              name: 'step',
              displayName: 'Step',
              enabled: true,
            },
            {
              type: ColumnHeaderType.RELATIVE_TIME,
              name: 'relativeTime',
              displayName: 'Relative',
              enabled: false,
            },
          ],
        });
      });

      it('moves header down to the disabled headers when toggling to disabled with data table mode input', () => {
        const nextState = reducers(
          beforeState,
          actions.dataTableColumnToggled({
            dataTableMode: DataTableMode.RANGE,
            headerType: ColumnHeaderType.RUN,
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: false,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: false,
          },
        ]);
      });

      it('moves header up to the enabled headers when toggling to enabled with data table mode input', () => {
        const nextState = reducers(
          beforeState,
          actions.dataTableColumnToggled({
            dataTableMode: DataTableMode.RANGE,
            headerType: ColumnHeaderType.MAX_VALUE,
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
        ]);
      });

      it('only changes range selection headers when dataTableMode is RANGE', () => {
        const nextState = reducers(
          beforeState,
          actions.dataTableColumnToggled({
            dataTableMode: DataTableMode.RANGE,
            headerType: ColumnHeaderType.MAX_VALUE,
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
        ]);

        expect(nextState.singleSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.VALUE,
            name: 'value',
            displayName: 'Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.STEP,
            name: 'step',
            displayName: 'Step',
            enabled: true,
          },
          {
            type: ColumnHeaderType.RELATIVE_TIME,
            name: 'relativeTime',
            displayName: 'Relative',
            enabled: false,
          },
        ]);
      });

      it('only changes single selection headers when dataTableMode is SINGLE', () => {
        const nextState = reducers(
          beforeState,
          actions.dataTableColumnToggled({
            dataTableMode: DataTableMode.SINGLE,
            headerType: ColumnHeaderType.STEP,
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: false,
          },
        ]);

        expect(nextState.singleSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.VALUE,
            name: 'value',
            displayName: 'Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.STEP,
            name: 'step',
            displayName: 'Step',
            enabled: false,
          },
          {
            type: ColumnHeaderType.RELATIVE_TIME,
            name: 'relativeTime',
            displayName: 'Relative',
            enabled: false,
          },
        ]);
      });

      it('moves header down to the disabled headers when column is removed with card id input', () => {
        beforeState = {
          ...beforeState,
          cardStateMap: {
            card1: {
              rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
            },
          },
        };

        const nextState = reducers(
          beforeState,
          actions.dataTableColumnToggled({
            cardId: 'card1',
            headerType: ColumnHeaderType.RUN,
          })
        );

        expect(
          nextState.rangeSelectionHeaders.map((header) => header.enabled)
        ).toEqual([true, true, false, false, false]);
      });

      it('only changes range selection headers when given card has rangeSelectionOverride ENABLED', () => {
        beforeState = {
          ...beforeState,
          cardStateMap: {
            card1: {
              rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
            },
          },
        };

        const nextState = reducers(
          beforeState,
          actions.dataTableColumnToggled({
            cardId: 'card1',
            headerType: ColumnHeaderType.MAX_VALUE,
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
        ]);

        expect(nextState.singleSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.VALUE,
            name: 'value',
            displayName: 'Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.STEP,
            name: 'step',
            displayName: 'Step',
            enabled: true,
          },
          {
            type: ColumnHeaderType.RELATIVE_TIME,
            name: 'relativeTime',
            displayName: 'Relative',
            enabled: false,
          },
        ]);
      });

      it('only changes single selection headers when given card has rangeSelectionOverride DISABLED', () => {
        beforeState = {
          ...beforeState,
          cardStateMap: {
            card1: {
              rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_DISABLED,
            },
          },
        };

        const nextState = reducers(
          beforeState,
          actions.dataTableColumnToggled({
            cardId: 'card1',
            headerType: ColumnHeaderType.STEP,
          })
        );

        expect(nextState.rangeSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.START_VALUE,
            name: 'startValue',
            displayName: 'Start Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.END_VALUE,
            name: 'endValue',
            displayName: 'End Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: false,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: false,
          },
        ]);

        expect(nextState.singleSelectionHeaders).toEqual([
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.VALUE,
            name: 'value',
            displayName: 'Value',
            enabled: true,
          },
          {
            type: ColumnHeaderType.STEP,
            name: 'step',
            displayName: 'Step',
            enabled: false,
          },
          {
            type: ColumnHeaderType.RELATIVE_TIME,
            name: 'relativeTime',
            displayName: 'Relative',
            enabled: false,
          },
        ]);
      });
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
        cardStateMap: {
          card1: {},
        },
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
        cardStateMap: {
          card1: {},
          [expectedPinnedCopyId]: {},
        },
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
        cardInteractions: {
          pins: [
            {
              cardId: 'card1',
              plugin: PluginType.SCALARS,
              runId: null,
              tag: 'tagA',
            },
          ],
          clicks: [],
          tagFilters: [],
        },
        previousCardInteractions: {
          pins: [],
          clicks: [],
          tagFilters: [],
        },
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

  describe('metricsCardStateUpdated', () => {
    it('adds new cardId', () => {
      const state = buildMetricsState();
      const action = actions.metricsCardStateUpdated({
        cardId: 'card1',
        settings: {},
      });
      const nextState = reducers(state, action);
      expect(nextState.cardStateMap).toEqual({
        card1: {},
      });
    });

    it('updates existing card settings', () => {
      const state = buildMetricsState({
        cardStateMap: {
          card1: {
            timeSelection: {
              start: {step: 5},
              end: null,
            },
            tableExpanded: true,
          },
        },
      });
      const action = actions.metricsCardStateUpdated({
        cardId: 'card1',
        settings: {
          tableExpanded: false,
        },
      });
      const nextState = reducers(state, action);
      expect(nextState.cardStateMap).toEqual({
        card1: {
          timeSelection: {
            start: {step: 5},
            end: null,
          },
          tableExpanded: false,
        },
      });
    });
  });

  describe('metricsCardFullSizeToggled', () => {
    it('expands card', () => {
      const state = buildMetricsState();
      const action = actions.metricsCardFullSizeToggled({
        cardId: 'card1',
      });
      const nextState = reducers(state, action);
      expect(nextState.cardStateMap).toEqual({
        card1: {fullWidth: true, tableExpanded: true},
      });
    });

    it('expands card when table is already expanded', () => {
      const state = buildMetricsState({
        cardStateMap: {card1: {tableExpanded: true}},
      });
      const action = actions.metricsCardFullSizeToggled({
        cardId: 'card1',
      });
      const nextState = reducers(state, action);
      expect(nextState.cardStateMap).toEqual({
        card1: {fullWidth: true, tableExpanded: true},
      });
    });

    it('collapse card', () => {
      const state = buildMetricsState({
        cardStateMap: {card1: {fullWidth: true}},
      });
      const action = actions.metricsCardFullSizeToggled({
        cardId: 'card1',
      });
      const nextState = reducers(state, action);
      expect(nextState.cardStateMap).toEqual({
        card1: {fullWidth: false, tableExpanded: false},
      });
    });

    it('collapses card when table is already expanded', () => {
      const state = buildMetricsState({
        cardStateMap: {card1: {fullWidth: true, tableExpanded: true}},
      });
      const action = actions.metricsCardFullSizeToggled({
        cardId: 'card1',
      });
      const nextState = reducers(state, action);
      expect(nextState.cardStateMap).toEqual({
        card1: {fullWidth: false, tableExpanded: false},
      });
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

  describe('#persistentSettingsLoaded', () => {
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
        persistentSettingsLoaded({
          partialSettings: {
            ignoreOutliers: true,
            tooltipSort: TooltipSort.DESCENDING,
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
          persistentSettingsLoaded({
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
        persistentSettingsLoaded({
          partialSettings: {
            timeSeriesSettingsPaneOpened: false,
          },
        })
      );

      expect(nextState.isSettingsPaneOpen).toBe(false);
    });

    it('loads singleSelectionHeaders setting into the next state', () => {
      const beforeState = buildMetricsState({
        singleSelectionHeaders: [
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.SMOOTHED,
            name: 'smoothed',
            displayName: 'Smoothed',
            enabled: true,
          },
          {
            type: ColumnHeaderType.VALUE,
            name: 'value',
            displayName: 'Value',
            enabled: true,
          },
        ],
      });

      const nextState = reducers(
        beforeState,
        persistentSettingsLoaded({
          partialSettings: {
            singleSelectionHeaders: [
              {
                type: ColumnHeaderType.SMOOTHED,
                name: 'smoothed',
                displayName: 'Smoothed',
                enabled: true,
              },
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.VALUE,
                name: 'value',
                displayName: 'Value',
                enabled: false,
              },
            ],
          },
        })
      );

      expect(nextState.singleSelectionHeaders).toEqual([
        {
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: false,
        },
      ]);
    });

    it('loads rangeSelectionHeaders setting into the next state', () => {
      const beforeState = buildMetricsState({
        rangeSelectionHeaders: [
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MIN_VALUE,
            name: 'minValue',
            displayName: 'Min',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: true,
          },
          {
            type: ColumnHeaderType.MEAN,
            name: 'mean',
            displayName: 'Mean',
            enabled: false,
          },
        ],
      });

      const nextState = reducers(
        beforeState,
        persistentSettingsLoaded({
          partialSettings: {
            rangeSelectionHeaders: [
              {
                type: ColumnHeaderType.RUN,
                name: 'run',
                displayName: 'Run',
                enabled: true,
              },
              {
                type: ColumnHeaderType.MEAN,
                name: 'mean',
                displayName: 'Mean',
                enabled: true,
              },
              {
                type: ColumnHeaderType.MAX_VALUE,
                name: 'maxValue',
                displayName: 'Max',
                enabled: true,
              },
              {
                type: ColumnHeaderType.MIN_VALUE,
                name: 'minValue',
                displayName: 'Min',
                enabled: false,
              },
            ],
          },
        })
      );

      expect(nextState.rangeSelectionHeaders).toEqual([
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MEAN,
          name: 'mean',
          displayName: 'Mean',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MAX_VALUE,
          name: 'maxValue',
          displayName: 'Max',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MIN_VALUE,
          name: 'minValue',
          displayName: 'Min',
          enabled: false,
        },
      ]);
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
      persistentSettingsLoaded({
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
      persistentSettingsLoaded({
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
      persistentSettingsLoaded({
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

      it('sets `rangeSelectionEnabled` to true when `endStep` is present', () => {
        const beforeState = buildMetricsState({
          rangeSelectionEnabled: false,
          linkedTimeEnabled: true,
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
          linkedTimeEnabled: true,
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

      it('sets `rangeSelectionEnabled` to false when only sets `startStep`', () => {
        const beforeState1 = buildMetricsState({
          rangeSelectionEnabled: true,
          linkedTimeEnabled: true,
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

      it('keeps `rangeSelectionEnabled` to false when linked time disabled', () => {
        const beforeState = buildMetricsState({
          rangeSelectionEnabled: false,
          linkedTimeEnabled: false,
        });

        const nextState = reducers(
          beforeState,
          actions.timeSelectionChanged({
            timeSelection: {
              start: {step: 2},
              end: {step: 10},
            },
          })
        );

        expect(nextState.rangeSelectionEnabled).toEqual(false);
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

      it('adds a new value to an existing cardStateMap', () => {
        const state1 = buildMetricsState({
          cardStateMap: {
            card1: {},
          },
        });
        const state2 = reducers(
          state1,
          actions.timeSelectionChanged({
            cardId: 'card2',
            timeSelection: {
              start: {step: 1},
              end: null,
            },
          })
        );

        expect(state2.cardStateMap).toEqual({
          card1: {},
          card2: {
            timeSelection: {
              start: {step: 1},
              end: null,
            },
            stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
            rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_DISABLED,
          },
        });
      });

      it('overrides an existing cardStateMap timeSelection', () => {
        const state1 = buildMetricsState({
          cardStateMap: {
            card1: {
              dataMinMax: {
                minStep: 0,
                maxStep: 1000,
              },
              timeSelection: {
                start: {step: 0},
                end: {step: 100},
              },
            },
          },
        });

        const state2 = reducers(
          state1,
          actions.timeSelectionChanged({
            cardId: 'card1',
            timeSelection: {
              start: {step: 1},
              end: {step: 5},
            },
          })
        );

        expect(state2.cardStateMap).toEqual({
          card1: {
            dataMinMax: {
              minStep: 0,
              maxStep: 1000,
            },
            timeSelection: {
              start: {step: 1},
              end: {step: 5},
            },
            stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
            rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
          },
        });
      });

      it('enables card specific range selection if an end value is provided', () => {
        const state1 = buildMetricsState({
          cardStateMap: {
            card1: {},
          },
        });
        const state2 = reducers(
          state1,
          actions.timeSelectionChanged({
            cardId: 'card2',
            timeSelection: {
              start: {step: 1},
              end: {step: 5},
            },
          })
        );

        expect(state2.cardStateMap).toEqual({
          card1: {},
          card2: {
            timeSelection: {
              start: {step: 1},
              end: {step: 5},
            },
            stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
            rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
          },
        });
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

      it('ignores linkedTimeSelection when toggled on, if not needed', () => {
        const state1 = buildMetricsState({
          linkedTimeSelection: {
            start: {step: 100},
            end: {step: 1000},
          },
          rangeSelectionEnabled: false,
        });

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.linkedTimeSelection).toEqual({
          start: {step: 100},
          end: {step: 1000},
        });
      });

      it('generates linkedTimeSelection when toggled on, if needed', () => {
        const state1 = buildMetricsState({
          linkedTimeSelection: null,
          rangeSelectionEnabled: false,
        });

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.linkedTimeSelection).toEqual({
          start: {step: Infinity},
          end: {step: -Infinity},
        });
      });

      it('adds linkedTimeSelection.end when toggled on, if needed', () => {
        const state1 = buildMetricsState({
          linkedTimeSelection: {
            start: {step: 100},
            end: null,
          },
          rangeSelectionEnabled: false,
        });

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.linkedTimeSelection).toEqual({
          start: {step: Infinity},
          end: {step: 100},
        });
      });

      it('removes linkedTimeSelection.end when toggled off, if needed', () => {
        const state1 = buildMetricsState({
          linkedTimeSelection: {
            start: {step: 100},
            end: {step: 1000},
          },
          rangeSelectionEnabled: true,
        });

        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.linkedTimeSelection).toEqual({
          start: {step: 1000},
          end: null,
        });
      });

      it('sets all card specific overrides to default', () => {
        const state1 = buildMetricsState({
          linkedTimeSelection: {
            start: {step: 100},
            end: {step: 1000},
          },
          rangeSelectionEnabled: false,
          cardStateMap: {
            card1: {
              rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
              stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
            },
            card2: {
              rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_DISABLED,
              stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_DISABLED,
            },
            card3: {},
          },
        });
        const state2 = reducers(state1, actions.rangeSelectionToggled({}));
        expect(state2.cardStateMap).toEqual({
          card1: {
            rangeSelectionOverride: CardFeatureOverride.NONE,
            stepSelectionOverride: CardFeatureOverride.NONE,
          },
          card2: {
            rangeSelectionOverride: CardFeatureOverride.NONE,
            stepSelectionOverride: CardFeatureOverride.NONE,
          },
          card3: {
            rangeSelectionOverride: CardFeatureOverride.NONE,
            stepSelectionOverride: CardFeatureOverride.NONE,
          },
        });
      });
    });

    describe('#cardViewBoxChanged', () => {
      it('adds a new value to an existing cardState map', () => {
        const state1 = buildMetricsState({
          cardStateMap: {
            card1: {},
          },
        });
        const state2 = reducers(
          state1,
          actions.cardViewBoxChanged({
            cardId: 'card2',
            userViewBox: {
              x: [0, 1],
              y: [2, 5],
            },
          })
        );

        expect(state2.cardStateMap).toEqual({
          card1: {},
          card2: {
            userViewBox: {
              x: [0, 1],
              y: [2, 5],
            },
          },
        });
      });

      it('overrides an existing card viewBox', () => {
        const state1 = buildMetricsState({
          cardStateMap: {
            card1: {
              userViewBox: {
                x: [0, 100],
                y: [2, 5],
              },
              timeSelection: {
                start: {step: 0},
                end: {step: 5},
              },
            },
          },
        });

        const state2 = reducers(
          state1,
          actions.cardViewBoxChanged({
            cardId: 'card1',
            userViewBox: {
              x: [1, 5],
              y: [2, 5],
            },
          })
        );

        expect(state2.cardStateMap).toEqual({
          card1: {
            userViewBox: {
              x: [1, 5],
              y: [2, 5],
            },
            timeSelection: {
              start: {step: 0},
              end: {step: 5},
            },
          },
        });
      });
    });

    describe('#linkedTimeToggled', () => {
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

      it('keeps rangeSelection when linkedTime is disabled', () => {
        const state1 = buildMetricsState({
          rangeSelectionEnabled: true,
          stepSelectorEnabled: true,
          linkedTimeEnabled: true,
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.rangeSelectionEnabled).toBe(true);
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

      it('sets linkedTimeSelection to max step when linkedTimeSelection is null before toggling', () => {
        const state1 = buildMetricsState({
          stepMinMax: {min: 10, max: 100},
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));

        expect(state2.linkedTimeSelection).toEqual({
          start: {step: 100},
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

      it('enables rangeSelection if linkedTimeSelection has an end step', () => {
        const state1 = buildMetricsState({
          stepSelectorEnabled: true,
          rangeSelectionEnabled: false,
          linkedTimeEnabled: false,
          linkedTimeSelection: {
            start: {step: 5},
            end: {step: 10},
          },
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.rangeSelectionEnabled).toBeTrue();
        expect(state2.linkedTimeEnabled).toBeTrue();
      });

      it('does not enable rangeSelection if linkedTimeSelection does not have an end step', () => {
        const state1 = buildMetricsState({
          stepSelectorEnabled: true,
          rangeSelectionEnabled: false,
          linkedTimeEnabled: false,
          linkedTimeSelection: {
            start: {step: 5},
            end: null,
          },
        });

        const state2 = reducers(state1, actions.linkedTimeToggled({}));
        expect(state2.linkedTimeEnabled).toBeTrue();
        expect(state2.rangeSelectionEnabled).toBeFalse();
      });
    });
  });

  describe('step selector features', () => {
    it('does not enable and disable stepSelection when toggled by fobs', () => {
      const state1 = buildMetricsState({
        stepSelectorEnabled: false,
        linkedTimeEnabled: false,
      });

      const state2 = reducers(
        state1,
        actions.stepSelectorToggled({
          affordance: TimeSelectionToggleAffordance.FOB_DESELECT,
        })
      );
      expect(state2.stepSelectorEnabled).toBe(false);
    });

    it('enables and disables stepSelection when toggled by check box', () => {
      const state1 = buildMetricsState({
        stepSelectorEnabled: false,
        linkedTimeEnabled: false,
      });

      const state2 = reducers(
        state1,
        actions.stepSelectorToggled({
          affordance: TimeSelectionToggleAffordance.CHECK_BOX,
        })
      );
      expect(state2.stepSelectorEnabled).toBe(true);

      const state3 = reducers(
        state2,
        actions.stepSelectorToggled({
          affordance: TimeSelectionToggleAffordance.CHECK_BOX,
        })
      );
      expect(state3.stepSelectorEnabled).toBe(false);
    });

    it('disables linkedTime and rangeSelection when stepSelector is toggled off', () => {
      const state1 = buildMetricsState({
        stepSelectorEnabled: true,
        linkedTimeEnabled: true,
        rangeSelectionEnabled: true,
      });

      const state2 = reducers(state1, actions.stepSelectorToggled({}));
      expect(state2.stepSelectorEnabled).toBe(false);
      expect(state2.linkedTimeEnabled).toBe(false);
      expect(state2.rangeSelectionEnabled).toBe(false);
    });

    it('disables card specific step selection when cardId is provided', () => {
      const prevState = buildMetricsState();
      const nextState = reducers(
        prevState,
        actions.stepSelectorToggled({cardId: 'card1'})
      );
      expect(nextState.cardStateMap['card1'].stepSelectionOverride).toEqual(
        CardFeatureOverride.OVERRIDE_AS_DISABLED
      );
    });

    it('removes all card specific overrides when no card id is provided', () => {
      const prevState = buildMetricsState({
        cardStateMap: {
          card1: {
            stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
          },
          card2: {
            stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_DISABLED,
          },
          card3: {},
        },
      });
      const nextState = reducers(prevState, actions.stepSelectorToggled({}));
      expect(nextState.cardStateMap).toEqual({
        card1: {
          stepSelectionOverride: CardFeatureOverride.NONE,
        },
        card2: {
          stepSelectionOverride: CardFeatureOverride.NONE,
        },
        card3: {
          stepSelectionOverride: CardFeatureOverride.NONE,
        },
      });
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

  describe('Metrics Slideout Menu', () => {
    describe('#metricsSlideoutMenuToggled', () => {
      it('toggles the isSlideoutMenuOpen state', () => {
        const state1 = buildMetricsState({
          isSlideoutMenuOpen: false,
        });

        const state2 = reducers(state1, actions.metricsSlideoutMenuToggled());
        expect(state2.isSlideoutMenuOpen).toBe(true);

        const state3 = reducers(state2, actions.metricsSlideoutMenuToggled());
        expect(state3.isSlideoutMenuOpen).toBe(false);
      });
    });

    describe('#metricsSlideoutMenuOpened', () => {
      it('sets the isSlideoutMenuOpen and isSettingsPaneOpen to true and always updates tableEditorSelectedTab', () => {
        const state1 = buildMetricsState({
          isSlideoutMenuOpen: false,
          isSettingsPaneOpen: false,
        });

        const state2 = reducers(
          state1,
          actions.metricsSlideoutMenuOpened({mode: DataTableMode.RANGE})
        );
        expect(state2.isSlideoutMenuOpen).toBe(true);
        expect(state2.isSettingsPaneOpen).toBe(true);
        expect(state2.tableEditorSelectedTab).toBe(DataTableMode.RANGE);

        const state3 = reducers(
          state2,
          actions.metricsSlideoutMenuOpened({mode: DataTableMode.SINGLE})
        );
        expect(state3.isSlideoutMenuOpen).toBe(true);
        expect(state3.isSettingsPaneOpen).toBe(true);
        expect(state3.tableEditorSelectedTab).toBe(DataTableMode.SINGLE);
      });

      it('leaves isSettingsPaneOpen as true when it is already set', () => {
        const state1 = buildMetricsState({
          isSlideoutMenuOpen: false,
          isSettingsPaneOpen: true,
        });

        const state2 = reducers(
          state1,
          actions.metricsSlideoutMenuOpened({mode: DataTableMode.SINGLE})
        );
        expect(state2.isSlideoutMenuOpen).toBe(true);
        expect(state2.isSettingsPaneOpen).toBe(true);
      });
    });

    describe('#metricsSlideoutMenuClosed', () => {
      it('sets the isSlideoutMenuOpen to false', () => {
        const state1 = buildMetricsState({
          isSlideoutMenuOpen: true,
        });

        const state2 = reducers(state1, actions.metricsSlideoutMenuClosed());
        expect(state2.isSlideoutMenuOpen).toBe(false);

        const state3 = reducers(state1, actions.metricsSlideoutMenuClosed());
        expect(state3.isSlideoutMenuOpen).toBe(false);
      });
    });
  });
});
