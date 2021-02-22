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
import {buildRoute} from '../../app_routing/testing';
import {RouteKind} from '../../app_routing/types';
import * as coreActions from '../../core/actions';
import {DataLoadState} from '../../types/data';
import * as actions from '../actions';
import {
  PluginType,
  ScalarStepDatum,
  TagMetadata as DataSourceTagMetadata,
} from '../data_source';
import {
  CardId,
  CardMetadata,
  HistogramMode,
  TooltipSort,
  XAxisType,
} from '../internal_types';
import {
  buildDataSourceTagMetadata,
  buildMetricsSettingsState,
  buildMetricsState,
  buildTagMetadata,
  buildTimeSeriesData,
  createCardMetadata,
  createHistogramStepData,
  createImageStepData,
  createScalarStepData,
  createTimeSeriesData,
} from '../testing';
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
  const series = [];
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
          tagMetadataLoaded: DataLoadState.NOT_LOADED,
        }),
        expectedState: buildMetricsState({
          tagMetadataLoaded: DataLoadState.LOADING,
          tagMetadata: buildTagMetadata(),
        }),
      },
      {
        action: actions.metricsTagMetadataFailed(),
        actionName: 'metricsTagMetadataFailed',
        beforeState: buildMetricsState({
          tagMetadataLoaded: DataLoadState.LOADING,
          tagMetadata: tagMetadataSample.storeForm,
        }),
        expectedState: buildMetricsState({
          tagMetadataLoaded: DataLoadState.FAILED,
          tagMetadata: tagMetadataSample.storeForm,
        }),
      },
      {
        action: actions.metricsTagMetadataLoaded({
          tagMetadata: tagMetadataSample.backendForm,
        }),
        actionName: 'metricsTagMetadataLoaded',
        beforeState: buildMetricsState({
          tagMetadataLoaded: DataLoadState.LOADING,
        }),
        expectedState: buildMetricsState({
          tagMetadataLoaded: DataLoadState.LOADED,
          tagMetadata: tagMetadataSample.storeForm,
        }),
      },
    ].forEach((metaSpec) => {
      describe(metaSpec.actionName, () => {
        it(`sets the loadState on ${metaSpec.actionName}`, () => {
          const nextState = reducers(metaSpec.beforeState, metaSpec.action);
          expect(nextState.tagMetadataLoaded).toEqual(
            metaSpec.expectedState.tagMetadataLoaded
          );
          expect(nextState.tagMetadata).toEqual(
            metaSpec.expectedState.tagMetadata
          );
        });
      });
    });

    it('sets cardMetadataMap and cardList on tag metadata loaded', () => {
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
        {plugin: PluginType.IMAGES, tag: 'tagC', runId: 'run3', sample: 0},
        {plugin: PluginType.IMAGES, tag: 'tagC', runId: 'run3', sample: 1},
        {plugin: PluginType.IMAGES, tag: 'tagC', runId: 'run3', sample: 2},
      ];
      const expectedCardMetadataMap: CardMetadataMap = {};
      for (const cardMetadata of expectedCardMetadataList) {
        expectedCardMetadataMap[getCardId(cardMetadata)] = cardMetadata;
      }
      expect(nextState.cardMetadataMap).toEqual(expectedCardMetadataMap);
      expect(nextState.cardList).toEqual(Object.keys(expectedCardMetadataMap));
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
      });
      expect(nextState.cardMetadataMap).toEqual(expectedState.cardMetadataMap);
      expect(nextState.cardList).toEqual(expectedState.cardList);
      expect(nextState.cardToPinnedCopy).toEqual(
        expectedState.cardToPinnedCopy
      );
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
          [expectedCardId]: stepCount - 1,
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
        pinnedCardToOriginal,
        unresolvedImportedPinnedCards,
      } = nextState;
      expect({
        cardMetadataMap,
        cardList,
        cardStepIndex,
        cardToPinnedCopy,
        pinnedCardToOriginal,
        unresolvedImportedPinnedCards,
      }).toEqual({
        cardMetadataMap: {
          [expectedCardId]: fakeCardMetadata,
          [expectedPinnedCopyId]: fakeCardMetadata,
        },
        cardList: [expectedCardId],
        cardStepIndex: {
          [expectedCardId]: stepCount - 1,
          [expectedPinnedCopyId]: stepCount - 1,
        },
        cardToPinnedCopy: new Map([[expectedCardId, expectedPinnedCopyId]]),
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

    it('does not drop existing data', () => {
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

      const action = actions.metricsTagMetadataLoaded({tagMetadata});
      const nextState = reducers(beforeState, action);

      expect(nextState.cardMetadataMap['<cardId>']).toEqual(
        createScalarCardMetadata()
      );
      expect(nextState.cardMetadataMap['<cardId>']).toBe(origCardMetadata);
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
            tagMetadataLoaded: DataLoadState.LOADED,
            tagMetadata: buildTagMetadata(),
          });

          const nextState = reducers(prevState, reloadAction);
          expect(nextState.tagMetadataLoaded).toBe(DataLoadState.NOT_LOADED);
        });

        it(`does not change tag load state if already loading`, () => {
          const prevState = buildMetricsState({
            tagMetadataLoaded: DataLoadState.LOADING,
            tagMetadata: buildTagMetadata(),
          });

          const nextState = reducers(prevState, reloadAction);
          expect(nextState.tagMetadataLoaded).toBe(DataLoadState.LOADING);
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

  describe('route id changes', () => {
    it('resets data when mounting a new route', () => {
      const prevState = buildMetricsState({
        visibleCards: new Set(['card1', 'card2']),
      });

      const navigateFrom1to2 = routingActions.navigated({
        before: buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: 'exp1'},
        }),
        after: buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: 'exp2'},
        }),
      });
      const navigateFrom2to1 = routingActions.navigated({
        before: buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: 'exp2'},
        }),
        after: buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: 'exp1'},
        }),
      });

      let nextState = reducers(prevState, navigateFrom1to2);
      nextState = reducers(nextState, navigateFrom2to1);

      const expectedState = buildMetricsState({
        visibleCards: new Set(),
      });
      expect(nextState.visibleCards).toEqual(expectedState.visibleCards);
    });
  });

  describe('settings', () => {
    it('changes tooltipSort on metricsChangeTooltipSort', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          tooltipSort: TooltipSort.ASCENDING,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeTooltipSort({sort: TooltipSort.NEAREST})
      );
      expect(nextState.settings.tooltipSort).toBe(TooltipSort.NEAREST);
    });

    it('changes ignoreOutliers on metricsToggleIgnoreOutliers', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          ignoreOutliers: true,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsToggleIgnoreOutliers()
      );
      expect(nextState.settings.ignoreOutliers).toBe(false);
    });

    it('changes xAxisType on metricsChangeXAxisType', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          xAxisType: XAxisType.STEP,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeXAxisType({xAxisType: XAxisType.WALL_TIME})
      );
      expect(nextState.settings.xAxisType).toBe(XAxisType.WALL_TIME);
    });

    it('changes scalarSmoothing on metricsChangeScalarSmoothing', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeScalarSmoothing({smoothing: 0.1})
      );
      expect(nextState.settings.scalarSmoothing).toBe(0.1);
    });

    it('toggles Partition X on metricsScalarPartitionNonMonotonicXToggled', () => {
      const state1 = buildMetricsState({
        settings: buildMetricsSettingsState({
          scalarPartitionNonMonotonicX: true,
        }),
      });
      const state2 = reducers(
        state1,
        actions.metricsScalarPartitionNonMonotonicXToggled()
      );
      expect(state2.settings.scalarPartitionNonMonotonicX).toBe(false);

      const state3 = reducers(
        state2,
        actions.metricsScalarPartitionNonMonotonicXToggled()
      );
      expect(state3.settings.scalarPartitionNonMonotonicX).toBe(true);
    });

    it('changes imageBrightnessInMilli on metricsChangeImageBrightness', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageBrightnessInMilli: 300,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeImageBrightness({brightnessInMilli: 1000})
      );
      expect(nextState.settings.imageBrightnessInMilli).toBe(1000);
    });

    it('changes imageContrastInMilli on metricsChangeImageContrast', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageContrastInMilli: 200,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeImageContrast({contrastInMilli: 500})
      );
      expect(nextState.settings.imageContrastInMilli).toBe(500);
    });

    it('resets imageBrightnessInMilli', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageBrightnessInMilli: 300,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsResetImageBrightness()
      );
      expect(nextState.settings.imageBrightnessInMilli).toBe(1000);
    });

    it('resets imageContrastInMilli', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageContrastInMilli: 300,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsResetImageContrast()
      );
      expect(nextState.settings.imageContrastInMilli).toBe(1000);
    });

    it('changes imageShowActualSize on metricsToggleImageShowActualSize', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          imageShowActualSize: true,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsToggleImageShowActualSize()
      );
      expect(nextState.settings.imageShowActualSize).toBe(false);
    });

    it('changes histogramMode on metricsChangeHistogramMode', () => {
      const prevState = buildMetricsState({
        settings: buildMetricsSettingsState({
          histogramMode: HistogramMode.OFFSET,
        }),
      });
      const nextState = reducers(
        prevState,
        actions.metricsChangeHistogramMode({
          histogramMode: HistogramMode.OVERLAY,
        })
      );
      expect(nextState.settings.histogramMode).toBe(HistogramMode.OVERLAY);
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
        expect(nextState.cardStepIndex).toEqual({card1: nextStepIndex});
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
        expect(nextState.cardStepIndex).toEqual({card1: 2});
      });

      it('sets step index to null when there is no time series', () => {
        const runToSeries = {};
        const beforeState = createScalarCardLoadedState('card1', runToSeries);

        const action = actions.cardStepSliderChanged({
          cardId: 'card1',
          stepIndex: 100,
        });
        const nextState = reducers(beforeState, action);
        expect(nextState.cardStepIndex).toEqual({card1: null});
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
          cardStepIndex: {card1: 2, pinnedCopy1: 2},
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
          card1: 2,
          pinnedCopy1: 2,
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
          cardStepIndex: {card1: stepCount - 1, pinnedCopy1: stepCount - 1},
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
          card1: newStepCount - 1,
          pinnedCopy1: newStepCount - 1,
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
          cardStepIndex: {card1: 9, pinnedCopy1: 9},
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
          card1: 2,
          pinnedCopy1: 2,
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
          card1: 2,
          pinnedCopy1: 2,
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
          cardStepIndex: {card1: 5, pinnedCopy1: 5},
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
        visibleCards: new Set(['card1']),
      });

      const action = actions.cardVisibilityChanged({
        enteredCards: new Set(),
        exitedCards: new Set(),
      });
      const nextState = reducers(beforeState, action);
      expect(nextState.visibleCards).toEqual(new Set(['card1']));
      expect(nextState).toBe(beforeState);
    });

    it('handles bad payloads', () => {
      const beforeState = buildMetricsState({
        visibleCards: new Set(['card1']),
      });

      const action = actions.cardVisibilityChanged({
        enteredCards: new Set(['duplicateCard']),
        exitedCards: new Set(['duplicateCard']),
      });
      let nextState = beforeState;
      expect(() => {
        nextState = reducers(beforeState, action);
      }).toThrow();
      expect(nextState).toBe(beforeState);
    });

    it('handles adding and removing cards', () => {
      const beforeState = buildMetricsState({
        visibleCards: new Set(['existingCard1', 'existingCard2']),
      });

      const action = actions.cardVisibilityChanged({
        enteredCards: new Set(['existingCard1', 'newCard1']),
        exitedCards: new Set(['existingCard2', 'newCard2']),
      });
      const nextState = reducers(beforeState, action);
      expect(nextState.visibleCards).toEqual(
        new Set(['existingCard1', 'newCard1'])
      );
    });
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
          card1: 10,
          pinnedCopy1: 20,
        },
        cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
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
          card1: 10,
        },
        cardToPinnedCopy: new Map(),
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
          card1: 10,
          pinnedCopy1: 20,
        },
        cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
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
          card1: 10,
        },
        cardToPinnedCopy: new Map(),
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
          card1: stepCount - 1,
        },
        cardToPinnedCopy: new Map(),
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
          card1: stepCount - 1,
          [expectedPinnedCopyId]: stepCount - 1,
        },
        cardToPinnedCopy: new Map([['card1', expectedPinnedCopyId]]),
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
        tagMetadataLoaded: DataLoadState.LOADED,
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
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: 0.1}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settings.scalarSmoothing).toBe(0.1);
    });

    it('keeps old state when the rehydrated state is null', () => {
      const beforeState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: null}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settings.scalarSmoothing).toBe(0.3);
    });

    it('keeps old state when the rehydrated state is NaN', () => {
      const beforeState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: NaN}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settings.scalarSmoothing).toBe(0.3);
    });

    it('clips value to 0', () => {
      const beforeState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: -0.1}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settings.scalarSmoothing).toBe(0);
    });

    it('clips value to 0.999', () => {
      const beforeState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: 100}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settings.scalarSmoothing).toBe(0.999);
    });

    it('rounds to the 3 significant digits to prevent weird numbers', () => {
      const beforeState = buildMetricsState({
        settings: buildMetricsSettingsState({scalarSmoothing: 0.3}),
      });
      const action = routingActions.stateRehydratedFromUrl({
        routeKind: RouteKind.EXPERIMENT,
        partialState: {metrics: {pinnedCards: [], smoothing: 0.2318421}},
      });
      const nextState = reducers(beforeState, action);

      expect(nextState.settings.scalarSmoothing).toBe(0.232);
    });
  });
});
