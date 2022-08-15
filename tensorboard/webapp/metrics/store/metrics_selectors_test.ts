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
import {nextElementId} from '../../util/dom';
import {PluginType} from '../data_source';
import {HistogramMode, TooltipSort, XAxisType} from '../internal_types';
import {
  appStateFromMetricsState,
  buildMetricsSettingsState,
  buildMetricsState,
  buildStepIndexMetadata,
  createCardMetadata,
  createImageStepData,
  createScalarStepData,
  createTimeSeriesData,
} from '../testing';
import * as selectors from './metrics_selectors';

describe('metrics selectors', () => {
  beforeEach(() => {
    // Clear the memoization.
    selectors.getMetricsTagMetadataLoadState.release();
  });

  it('returns loaded state', () => {
    const state = appStateFromMetricsState(
      buildMetricsState({
        tagMetadataLoadState: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 1,
        },
      })
    );
    expect(selectors.getMetricsTagMetadataLoadState(state)).toEqual({
      state: DataLoadState.LOADED,
      lastLoadedTimeInMs: 1,
    });
  });

  describe('getCardLoadState', () => {
    it('returns a card load state', () => {
      selectors.getCardLoadState.release();

      const loadable = {
        runToSeries: {run1: createScalarStepData()},
        runToLoadState: {run1: DataLoadState.LOADED},
      };
      const metricsState = buildMetricsState({
        timeSeriesData: {
          ...createTimeSeriesData(),
          [PluginType.SCALARS]: {tagA: loadable},
        },
        cardMetadataMap: {
          '<card_id>': {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runId: null,
          },
        },
      });
      metricsState.tagMetadata.scalars.tagToRuns = {tagA: ['run1']};
      const state = appStateFromMetricsState(metricsState);
      expect(selectors.getCardLoadState(state, '<card_id>')).toBe(
        DataLoadState.LOADED
      );
    });

    it('returns a card load state for a specific run', () => {
      selectors.getCardLoadState.release();

      const loadable = {
        runToSeries: {},
        runToLoadState: {
          run1: DataLoadState.LOADING,
          run2: DataLoadState.FAILED,
        },
      };
      const metricsState = buildMetricsState({
        timeSeriesData: {
          ...createTimeSeriesData(),
          [PluginType.IMAGES]: {tagA: {0: loadable}},
        },
        cardMetadataMap: {
          '<card_id>': {
            plugin: PluginType.IMAGES,
            tag: 'tagA',
            runId: 'run2',
            sample: 0,
          },
        },
      });
      metricsState.tagMetadata.images.tagRunSampledInfo = {
        tagA: {
          run1: {maxSamplesPerStep: 1},
          run2: {maxSamplesPerStep: 1},
        },
      };
      const state = appStateFromMetricsState(metricsState);
      expect(selectors.getCardLoadState(state, '<card_id>')).toBe(
        DataLoadState.FAILED
      );
    });

    it('returns not-loaded when no time series is available', () => {
      selectors.getCardLoadState.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            '<card_id>': {
              plugin: PluginType.SCALARS,
              tag: 'tagA',
              runId: null,
            },
          },
        })
      );
      expect(selectors.getCardLoadState(state, '<card_id>')).toBe(
        DataLoadState.NOT_LOADED
      );
    });

    it('returns not-loaded when card is not available', () => {
      selectors.getCardLoadState.release();

      const state = appStateFromMetricsState(buildMetricsState());
      expect(selectors.getCardLoadState(state, '<card_id>')).toBe(
        DataLoadState.NOT_LOADED
      );
    });

    it('returns loading when some runs are loading', () => {
      selectors.getCardLoadState.release();

      const loadable = {
        runToSeries: {run1: createScalarStepData()},
        runToLoadState: {
          run1: DataLoadState.LOADED,
          run2: DataLoadState.LOADING,
        },
      };
      const metricsState = buildMetricsState({
        timeSeriesData: {
          ...createTimeSeriesData(),
          [PluginType.SCALARS]: {tagA: loadable},
        },
        cardMetadataMap: {
          '<card_id>': {
            plugin: PluginType.SCALARS,
            tag: 'tagA',
            runId: null,
          },
        },
      });
      metricsState.tagMetadata.scalars.tagToRuns = {tagA: ['run1', 'run2']};
      const state = appStateFromMetricsState(metricsState);
      expect(selectors.getCardLoadState(state, '<card_id>')).toBe(
        DataLoadState.LOADING
      );
    });

    it(
      'returns not-loaded when some runs are not loaded and nothing is ' +
        'loading',
      () => {
        selectors.getCardLoadState.release();

        const loadable = {
          runToSeries: {run1: createScalarStepData()},
          runToLoadState: {
            run1: DataLoadState.NOT_LOADED,
            run2: DataLoadState.LOADED,
          },
        };
        const metricsState = buildMetricsState({
          timeSeriesData: {
            ...createTimeSeriesData(),
            [PluginType.SCALARS]: {tagA: loadable},
          },
          cardMetadataMap: {
            '<card_id>': {
              plugin: PluginType.SCALARS,
              tag: 'tagA',
              runId: null,
            },
          },
        });
        metricsState.tagMetadata.scalars.tagToRuns = {
          tagA: ['run1', 'run2'],
        };
        const state = appStateFromMetricsState(metricsState);
        expect(selectors.getCardLoadState(state, '<card_id>')).toBe(
          DataLoadState.NOT_LOADED
        );
      }
    );
  });

  describe('getCardMetadata', () => {
    it('returns card metadata', () => {
      selectors.getCardMetadata.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            '<card_id>': {
              plugin: PluginType.SCALARS,
              tag: 'tagA',
              runId: null,
            },
          },
        })
      );
      expect(selectors.getCardMetadata(state, '<card_id>')).toEqual({
        plugin: PluginType.SCALARS,
        tag: 'tagA',
        runId: null,
      });
    });

    it('returns null when metadata is not available', () => {
      selectors.getCardMetadata.release();

      const state = appStateFromMetricsState(buildMetricsState());
      expect(selectors.getCardMetadata(state, '<card_id>')).toBe(null);
    });
  });

  describe('getNonEmptyCardIdsWithMetadata', () => {
    beforeEach(() => {
      selectors.getNonEmptyCardIdsWithMetadata.release();
    });

    it('returns an emtpy array when cardList is empty', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {},
          cardList: [],
        })
      );
      expect(selectors.getNonEmptyCardIdsWithMetadata(state)).toEqual([]);
    });

    it('returns card list with metadata', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            card1: createCardMetadata(PluginType.SCALARS),
            card2: createCardMetadata(PluginType.HISTOGRAMS),
          },
          cardList: ['card1', 'card2'],
        })
      );
      expect(selectors.getNonEmptyCardIdsWithMetadata(state)).toEqual([
        {
          cardId: 'card1',
          ...createCardMetadata(PluginType.SCALARS),
        },
        {
          cardId: 'card2',
          ...createCardMetadata(PluginType.HISTOGRAMS),
        },
      ]);
    });

    it('omits card metadata that is not part of current cardList', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            card1: createCardMetadata(PluginType.SCALARS),
            card2: createCardMetadata(PluginType.HISTOGRAMS),
          },
          cardList: ['card2'],
        })
      );
      expect(selectors.getNonEmptyCardIdsWithMetadata(state)).toEqual([
        {
          cardId: 'card2',
          ...createCardMetadata(PluginType.HISTOGRAMS),
        },
      ]);
    });
  });

  describe('getVisibleCardIdSet', () => {
    beforeEach(() => {
      selectors.getVisibleCardIdSet.release();
    });

    it('returns an emtpy array', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          visibleCardMap: new Map(),
        })
      );
      expect(selectors.getVisibleCardIdSet(state)).toEqual(new Set<string>([]));
    });

    it('returns a non-empty array', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          visibleCardMap: new Map([
            [nextElementId(), 'card1'],
            [nextElementId(), 'card2'],
          ]),
        })
      );
      expect(selectors.getVisibleCardIdSet(state)).toEqual(
        new Set(['card1', 'card2'])
      );
    });
  });

  describe('getCardTimeSeries', () => {
    it('getCardTimeSeries', () => {
      selectors.getCardTimeSeries.release();

      const sampleScalarRunToSeries = {
        run1: createScalarStepData(),
        run2: createScalarStepData(),
      };
      const sampleImageRunToSeries = {run1: createImageStepData()};
      const state = appStateFromMetricsState(
        buildMetricsState({
          timeSeriesData: {
            ...createTimeSeriesData(),
            scalars: {
              tagA: {
                runToLoadState: {
                  run1: DataLoadState.LOADED,
                  run2: DataLoadState.LOADED,
                },
                runToSeries: sampleScalarRunToSeries,
              },
            },
            images: {
              tagB: {
                0: {
                  runToLoadState: {run1: DataLoadState.LOADED},
                  runToSeries: sampleImageRunToSeries,
                },
              },
            },
          },
          cardMetadataMap: {
            card1: {
              plugin: PluginType.SCALARS,
              tag: 'tagA',
              runId: null,
            },
            card2: {
              plugin: PluginType.IMAGES,
              tag: 'tagB',
              runId: 'run1',
              sample: 0,
            },
          },
        })
      );
      expect(selectors.getCardTimeSeries(state, 'card1')).toEqual(
        sampleScalarRunToSeries
      );
      expect(selectors.getCardTimeSeries(state, 'card2')).toEqual(
        sampleImageRunToSeries
      );
      expect(selectors.getCardTimeSeries(state, 'card-nonexistent')).toBe(null);
    });
  });

  describe('getCardStepIndex', () => {
    it('returns null if no card exists', () => {
      selectors.getCardStepIndexMetaData.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardStepIndex: {},
        })
      );
      expect(selectors.getCardStepIndexMetaData(state, 'card1')).toBe(null);
    });

    it('properly returns card ids', () => {
      selectors.getCardStepIndexMetaData.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardStepIndex: {card1: buildStepIndexMetadata({index: 5})},
        })
      );
      expect(selectors.getCardStepIndexMetaData(state, 'card1')).toEqual(
        buildStepIndexMetadata({index: 5})
      );
    });
  });

  describe('getPinnedCardsWithMetadata', () => {
    beforeEach(() => {
      selectors.getPinnedCardsWithMetadata.release();
    });

    it('returns an emtpy array when there are no pinned copies', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {},
          cardToPinnedCopy: new Map(),
        })
      );
      expect(selectors.getPinnedCardsWithMetadata(state)).toEqual([]);
    });

    it('does not return cards that have no metadata', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {},
          cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
        })
      );
      expect(selectors.getPinnedCardsWithMetadata(state)).toEqual([]);
    });

    it('does not rely on the list of original, non-pinned cards', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            card1: createCardMetadata(PluginType.SCALARS),
          },
          cardToPinnedCopy: new Map(),
          cardList: ['card1'],
        })
      );
      expect(selectors.getPinnedCardsWithMetadata(state)).toEqual([]);
    });

    it(`returns list with the pinned copy's metadata`, () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            pinnedCopy1: createCardMetadata(PluginType.SCALARS),
            card1: createCardMetadata(PluginType.HISTOGRAMS),
          },
          cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
        })
      );
      expect(selectors.getPinnedCardsWithMetadata(state)).toEqual([
        {
          cardId: 'pinnedCopy1',
          ...createCardMetadata(PluginType.SCALARS),
        },
      ]);
    });
  });

  describe('getCardPinnedState', () => {
    it('returns false if no card exists', () => {
      selectors.getCardPinnedState.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardToPinnedCopy: new Map(),
          cardList: [],
        })
      );
      expect(selectors.getCardPinnedState(state, 'card1')).toBe(false);
    });

    it('returns false if the card is not pinned', () => {
      selectors.getCardPinnedState.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            card1: createCardMetadata(PluginType.HISTOGRAMS),
          },
          cardToPinnedCopy: new Map(),
          cardList: ['card1'],
        })
      );
      expect(selectors.getCardPinnedState(state, 'card1')).toBe(false);
    });

    it('returns true if the card has a pinned copy', () => {
      selectors.getCardPinnedState.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            card1: createCardMetadata(PluginType.HISTOGRAMS),
          },
          cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
          pinnedCardToOriginal: new Map([['pinnedCopy1', 'card1']]),
          cardList: ['card1'],
        })
      );
      expect(selectors.getCardPinnedState(state, 'card1')).toBe(true);
    });

    it('returns true if the card is a pinned copy', () => {
      selectors.getCardPinnedState.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap: {
            card1: createCardMetadata(PluginType.HISTOGRAMS),
          },
          cardToPinnedCopy: new Map([['card1', 'pinnedCopy1']]),
          pinnedCardToOriginal: new Map([['pinnedCopy1', 'card1']]),
          cardList: ['card1'],
        })
      );
      expect(selectors.getCardPinnedState(state, 'pinnedCopy1')).toBe(true);
    });
  });

  describe('getUnresolvedImportedPinnedCards', () => {
    it('returns unresolved imported pinned cards', () => {
      selectors.getUnresolvedImportedPinnedCards.release();

      const state = appStateFromMetricsState(
        buildMetricsState({
          unresolvedImportedPinnedCards: [
            {plugin: PluginType.SCALARS, tag: 'accuracy'},
            {
              plugin: PluginType.IMAGES,
              tag: 'output',
              runId: 'exp1/run1',
              sample: 5,
            },
          ],
        })
      );
      expect(selectors.getUnresolvedImportedPinnedCards(state)).toEqual([
        {plugin: PluginType.SCALARS, tag: 'accuracy'},
        {
          plugin: PluginType.IMAGES,
          tag: 'output',
          runId: 'exp1/run1',
          sample: 5,
        },
      ]);
    });
  });

  describe('settings', () => {
    it('returns tooltipSort when called getMetricsTooltipSort', () => {
      selectors.getMetricsTooltipSort.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            tooltipSort: TooltipSort.ASCENDING,
          }),
        })
      );
      expect(selectors.getMetricsTooltipSort(state)).toBe(
        TooltipSort.ASCENDING
      );
    });

    it('returns ignoreOutliers when called getMetricsIgnoreOutliers', () => {
      selectors.getMetricsIgnoreOutliers.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            ignoreOutliers: false,
          }),
        })
      );
      expect(selectors.getMetricsIgnoreOutliers(state)).toBe(false);
    });

    it('returns xAxis when called getMetricsXAxisType', () => {
      selectors.getMetricsXAxisType.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            xAxisType: XAxisType.WALL_TIME,
          }),
        })
      );
      expect(selectors.getMetricsXAxisType(state)).toBe(XAxisType.WALL_TIME);
    });

    it('returns scalarSmoothing when called getMetricsScalarSmoothing', () => {
      selectors.getMetricsScalarSmoothing.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            scalarSmoothing: 0,
          }),
        })
      );
      expect(selectors.getMetricsScalarSmoothing(state)).toBe(0);
    });

    it('returns scalarPartitionNonMonotonicX', () => {
      selectors.getMetricsScalarPartitionNonMonotonicX.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            scalarPartitionNonMonotonicX: false,
          }),
        })
      );
      expect(selectors.getMetricsScalarPartitionNonMonotonicX(state)).toBe(
        false
      );
    });

    it('returns imageBrightnessInMilli when called getMetricsImageBrightnessInMilli', () => {
      selectors.getMetricsImageBrightnessInMilli.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            imageBrightnessInMilli: 1000,
          }),
        })
      );
      expect(selectors.getMetricsImageBrightnessInMilli(state)).toBe(1000);
    });

    it('returns imageContrastInMilli when called getMetricsImageContrastInMilli', () => {
      selectors.getMetricsImageContrastInMilli.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            imageContrastInMilli: 20,
          }),
        })
      );
      expect(selectors.getMetricsImageContrastInMilli(state)).toBe(20);
    });

    it('returns imageShowActualSize when called getMetricsImageShowActualSize', () => {
      selectors.getMetricsImageShowActualSize.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            imageShowActualSize: true,
          }),
        })
      );
      expect(selectors.getMetricsImageShowActualSize(state)).toBe(true);
    });

    it('returns histogramMode when called getMetricsHistogramMode', () => {
      selectors.getMetricsHistogramMode.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            histogramMode: HistogramMode.OVERLAY,
          }),
        })
      );
      expect(selectors.getMetricsHistogramMode(state)).toBe(
        HistogramMode.OVERLAY
      );
    });

    it('returns cardMinWidth when called getMetricCardMinWidth', () => {
      selectors.getMetricsCardMinWidth.release();
      const state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            cardMinWidth: 400,
          }),
        })
      );
      expect(selectors.getMetricsCardMinWidth(state)).toBe(400);
    });
  });

  describe('getMetricsTagFilter', () => {
    it('returns tagFilter', () => {
      selectors.getMetricsTagFilter.release();
      const state = appStateFromMetricsState(
        buildMetricsState({tagFilter: 'hello'})
      );
      expect(selectors.getMetricsTagFilter(state)).toBe('hello');
    });
  });

  describe('getMetricsTagGroupExpansionState', () => {
    beforeEach(() => {
      selectors.getMetricsTagGroupExpansionState.release();
    });

    it('returns tag group expansion state: true', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          tagGroupExpanded: new Map([['hello', true]]),
        })
      );
      expect(selectors.getMetricsTagGroupExpansionState(state, 'hello')).toBe(
        true
      );
    });

    it('returns tag group expansion state: false', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          tagGroupExpanded: new Map([['hello', false]]),
        })
      );
      expect(selectors.getMetricsTagGroupExpansionState(state, 'hello')).toBe(
        false
      );
    });

    it('returns tag group expansion state as false for unseen one', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          tagGroupExpanded: new Map(),
        })
      );
      expect(selectors.getMetricsTagGroupExpansionState(state, 'world')).toBe(
        false
      );
    });
  });

  describe('getMetricsStepMinMax', () => {
    beforeEach(() => {
      selectors.getMetricsStepMinMax.release();
    });

    it('returns min and max of the dataset', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          stepMinMax: {min: 10, max: 100},
        })
      );
      expect(selectors.getMetricsStepMinMax(state)).toEqual({
        min: 10,
        max: 100,
      });
    });

    it('returns 0 and 1000 if extremum are Infinities', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          stepMinMax: {min: Infinity, max: -Infinity},
        })
      );
      expect(selectors.getMetricsStepMinMax(state)).toEqual({
        min: 0,
        max: 1000,
      });
    });
  });

  describe('getMetricsLinkedTimeSelectionSetting', () => {
    beforeEach(() => {
      selectors.getMetricsLinkedTimeSelectionSetting.release();
    });

    it('returns value with start step from the dataset when linked time selection is null', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          linkedTimeSelection: null,
          stepMinMax: {
            min: 0,
            max: 1000,
          },
        })
      );
      expect(selectors.getMetricsLinkedTimeSelectionSetting(state)).toEqual({
        start: {step: 0},
        end: null,
      });
    });

    it('returns value when linked time selection is present', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          linkedTimeSelection: {
            start: {step: 0},
            end: {step: 1},
          },
        })
      );
      expect(selectors.getMetricsLinkedTimeSelectionSetting(state)).toEqual({
        start: {step: 0},
        end: {step: 1},
      });
    });
  });

  describe('getMetricsLinkedTimeSelection', () => {
    beforeEach(() => {
      selectors.getMetricsLinkedTimeSelection.release();
    });

    it('returns `null` when linkedTime is disabled even when value exists', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          linkedTimeSelection: {start: {step: 1}, end: {step: 1}},
          linkedTimeEnabled: false,
        })
      );
      expect(selectors.getMetricsLinkedTimeSelection(state)).toBeNull();
    });

    it('returns value when linked time selection is present', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          linkedTimeSelection: {
            start: {step: 0},
            end: {step: 100},
          },
          linkedTimeEnabled: true,
          linkedTimeRangeEnabled: true,
        })
      );
      expect(selectors.getMetricsLinkedTimeSelection(state)).toEqual({
        start: {step: 0},
        end: {step: 100},
      });
    });

    it('removes `end` when using single step mode', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          linkedTimeSelection: {
            start: {step: 0},
            end: {step: 100},
          },
          linkedTimeEnabled: true,
          linkedTimeRangeEnabled: false,
        })
      );
      expect(selectors.getMetricsLinkedTimeSelection(state)).toEqual({
        start: {step: 0},
        end: null,
      });
    });
  });

  describe('getMetricsFilteredPluginTypes', () => {
    beforeEach(() => {
      selectors.getMetricsFilteredPluginTypes.release();
    });

    it('returns current visualization filters', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          filteredPluginTypes: new Set([PluginType.SCALARS]),
        })
      );
      expect(selectors.getMetricsFilteredPluginTypes(state)).toEqual(
        new Set([PluginType.SCALARS])
      );
    });
  });

  describe('#isMetricsSettingsPaneOpen', () => {
    beforeEach(() => {
      selectors.isMetricsSettingsPaneOpen.release();
    });

    it('returns current settings pane open state', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({isSettingsPaneOpen: false})
      );
      expect(selectors.isMetricsSettingsPaneOpen(state)).toEqual(false);
    });
  });
});
