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
import {
  CardIdWithMetadata,
  HistogramMode,
  TooltipSort,
  XAxisType,
} from '../types';
import {
  ColumnHeader,
  ColumnHeaderType,
  DataTableMode,
} from '../../widgets/data_table/types';
import * as selectors from './metrics_selectors';
import {CardFeatureOverride, MetricsState} from './metrics_types';

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

  describe('getCardStateMap', () => {
    it('returns cardStateMap', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {
            card1: {
              tableExpanded: true,
            },
          },
        })
      );
      expect(selectors.getCardStateMap(state)).toEqual({
        card1: {
          tableExpanded: true,
        },
      });
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

  describe('getMetricsCardTimeSelection', () => {
    describe('when linked time is disabled', () => {
      let partialState: Partial<MetricsState>;
      beforeEach(() => {
        partialState = {
          linkedTimeEnabled: false,
        };
      });

      it('returns cards timeSelection if defined', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                dataMinMax: {
                  minStep: 0,
                  maxStep: 10,
                },
                timeSelection: {
                  start: {step: 0},
                  end: {step: 5},
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 0},
          end: {step: 5},
        });
      });

      it('returns undefined if step selection is disabled', () => {
        expect(
          selectors.getMetricsCardTimeSelection(
            appStateFromMetricsState(
              buildMetricsState({
                ...partialState,
                stepSelectorEnabled: true,
                cardStateMap: {
                  card1: {
                    stepSelectionOverride:
                      CardFeatureOverride.OVERRIDE_AS_DISABLED,
                    dataMinMax: {
                      minStep: 0,
                      maxStep: 10,
                    },
                    timeSelection: {
                      start: {step: 0},
                      end: {step: 5},
                    },
                  },
                },
              })
            ),
            'card1'
          )
        ).toBeUndefined();

        expect(
          selectors.getMetricsCardTimeSelection(
            appStateFromMetricsState(
              buildMetricsState({
                ...partialState,
                stepSelectorEnabled: false,
                cardStateMap: {
                  card1: {
                    dataMinMax: {
                      minStep: 0,
                      maxStep: 10,
                    },
                    timeSelection: {
                      start: {step: 0},
                      end: {step: 5},
                    },
                  },
                },
              })
            ),
            'card1'
          )
        ).toBeUndefined();
      });

      it('returns undefined if no min max is defined', () => {
        expect(
          selectors.getMetricsCardTimeSelection(
            appStateFromMetricsState(
              buildMetricsState({
                ...partialState,
                cardStateMap: {
                  card1: {
                    timeSelection: {
                      start: {step: 0},
                      end: {step: 5},
                    },
                  },
                },
              })
            ),
            'card1'
          )
        ).toBeUndefined();
      });

      it('returns undefined when there is no card state', () => {
        expect(
          selectors.getMetricsCardTimeSelection(
            appStateFromMetricsState(
              buildMetricsState({
                ...partialState,
                cardStateMap: {},
              })
            ),
            'card1'
          )
        ).toBeUndefined();
      });

      it('uses min step as start value if end value does not exists', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                dataMinMax: {
                  minStep: 0,
                  maxStep: 10,
                },
                timeSelection: {
                  start: {step: 5},
                  end: null,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 0},
          end: {step: 5},
        });
      });

      it('returns cards minMax as a timeSelection if timeSelection is undefined', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                dataMinMax: {
                  minStep: 0,
                  maxStep: 5,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 0},
          end: {step: 5},
        });
      });

      it('removes end value if range selection is overridden as disabled', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                rangeSelectionOverride:
                  CardFeatureOverride.OVERRIDE_AS_DISABLED,
                dataMinMax: {
                  minStep: 0,
                  maxStep: 5,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 5},
          end: null,
        });
      });

      it('removes end value if range selection is globally disabled', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: false,
            cardStateMap: {
              card1: {
                stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                dataMinMax: {
                  minStep: 0,
                  maxStep: 5,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 5},
          end: null,
        });
      });

      it('does not remove end value if range selection is overridden as enabled', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: false,
            cardStateMap: {
              card1: {
                stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                dataMinMax: {
                  minStep: 0,
                  maxStep: 5,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 0},
          end: {step: 5},
        });
      });

      it('clips time selection if it exceeds the cards minMax', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                stepSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                dataMinMax: {
                  minStep: 5,
                  maxStep: 10,
                },
                timeSelection: {
                  start: {step: 0},
                  end: {step: 15},
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 5},
          end: {step: 10},
        });
      });
    });

    describe('with linkedTime enabled', () => {
      let partialState: Partial<MetricsState>;
      beforeEach(() => {
        partialState = {
          linkedTimeEnabled: true,
          linkedTimeSelection: {
            start: {step: 0},
            end: {step: 5},
          },
        };
      });

      it('returns linkedTimeSelection if linkedTime is enabled', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                dataMinMax: {
                  minStep: 0,
                  maxStep: 5,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 0},
          end: {step: 5},
        });
      });

      it('removes end value if global range selection is disabled', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: false,
            cardStateMap: {
              card1: {
                dataMinMax: {
                  minStep: 0,
                  maxStep: 5,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 0},
          end: null,
        });
      });

      it('maintains end value if local range selection is overridden as disabled', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                rangeSelectionOverride: CardFeatureOverride.OVERRIDE_AS_ENABLED,
                dataMinMax: {
                  minStep: 0,
                  maxStep: 5,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 0},
          end: {step: 5},
        });
      });

      it('clips time selection based on card minMax', () => {
        const state = appStateFromMetricsState(
          buildMetricsState({
            ...partialState,
            rangeSelectionEnabled: true,
            cardStateMap: {
              card1: {
                dataMinMax: {
                  minStep: 1,
                  maxStep: 4,
                },
              },
            },
          })
        );

        expect(selectors.getMetricsCardTimeSelection(state, 'card1')).toEqual({
          start: {step: 1},
          end: {step: 4},
        });
      });
    });
  });

  describe('getMetricsCardMinMax', () => {
    it('returns userMinMax when defined', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {
            card1: {
              userViewBox: {
                x: [10, 20],
                y: [11, 22],
              },
              dataMinMax: {
                minStep: 0,
                maxStep: 100,
              },
            },
          },
        })
      );

      expect(selectors.getMetricsCardMinMax(state, 'card1')).toEqual({
        minStep: 10,
        maxStep: 20,
      });
    });

    it('returns dataMinMax when userMinMax is not defined', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {
            card1: {
              dataMinMax: {
                minStep: 0,
                maxStep: 100,
              },
            },
          },
        })
      );

      expect(selectors.getMetricsCardMinMax(state, 'card1')).toEqual({
        minStep: 0,
        maxStep: 100,
      });
    });
  });

  describe('getMetricsCardDataMinMax', () => {
    it('returns undefined when cardStateMap is undefined', () => {
      const state = appStateFromMetricsState(buildMetricsState({}));
      expect(
        selectors.getMetricsCardDataMinMax(state, 'card1')
      ).toBeUndefined();
    });

    it('returns undefined when card has no cardState', () => {
      const state1 = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {},
        })
      );

      const state2 = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {
            card1: {},
          },
        })
      );

      expect(
        selectors.getMetricsCardDataMinMax(state1, 'card1')
      ).toBeUndefined();
      expect(
        selectors.getMetricsCardDataMinMax(state2, 'card1')
      ).toBeUndefined();
    });

    it('returns data cards minMax when defined', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {
            card1: {
              dataMinMax: {
                minStep: 0,
                maxStep: 100,
              },
            },
          },
        })
      );
      expect(selectors.getMetricsCardDataMinMax(state, 'card1')).toEqual({
        minStep: 0,
        maxStep: 100,
      });
    });
  });

  describe('getMetricsCardUserViewBox', () => {
    it('returns null when cardStateMap is undefined', () => {
      const state = appStateFromMetricsState(buildMetricsState({}));
      expect(selectors.getMetricsCardUserViewBox(state, 'card1')).toBeNull();
    });

    it('returns null when card has no cardState', () => {
      const state1 = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {},
        })
      );
      expect(selectors.getMetricsCardUserViewBox(state1, 'card1')).toBeNull();

      const state2 = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {
            card1: {},
          },
        })
      );
      expect(selectors.getMetricsCardUserViewBox(state2, 'card1')).toBeNull();
    });

    it('returns userViewBox when defined', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardStateMap: {
            card1: {
              userViewBox: {
                x: [0, 10],
                y: [11, 22],
              },
            },
          },
        })
      );
      expect(selectors.getMetricsCardUserViewBox(state, 'card1')).toEqual({
        x: [0, 10],
        y: [11, 22],
      });
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

  describe('getSuggestedCardsWithMetadata', () => {
    let mockCards: CardIdWithMetadata[];
    let cardMetadataMap: Record<string, CardIdWithMetadata>;

    beforeEach(() => {
      mockCards = Array.from({length: 15}).map((_, index) => ({
        cardId: `card${index}`,
        tag: 'a',
        runId: null,
        plugin: PluginType.SCALARS,
      }));

      cardMetadataMap = mockCards.reduce((map, card) => {
        map[card.cardId] = card;
        return map;
      }, {} as Record<string, CardIdWithMetadata>);
    });

    it('does not return more than 3 cards based on previous tag searches', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap,
          previousCardInteractions: {
            pins: [],
            clicks: [],
            tagFilters: ['a'],
          },
        })
      );
      expect(selectors.getSuggestedCardsWithMetadata(state)).toEqual([
        mockCards[14],
        mockCards[13],
        mockCards[12],
      ]);
    });

    it('does not return more than 3 previously clicked cards', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap,
          previousCardInteractions: {
            pins: [],
            clicks: mockCards,
            tagFilters: [],
          },
        })
      );
      expect(selectors.getSuggestedCardsWithMetadata(state)).toEqual([
        mockCards[14],
        mockCards[13],
        mockCards[12],
      ]);
    });

    it('never returns more than 10 cards', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          cardMetadataMap,
          previousCardInteractions: {
            pins: mockCards.slice(0, 5),
            clicks: mockCards.slice(5, 10),
            tagFilters: ['a'],
          },
        })
      );

      expect(selectors.getSuggestedCardsWithMetadata(state)).toEqual([
        mockCards[4],
        mockCards[3],
        mockCards[2],
        mockCards[1],
        mockCards[0],
        mockCards[14],
        mockCards[13],
        mockCards[12],
        mockCards[9],
        mockCards[8],
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

    it('returns hideEmptyCards when getMetricsHideEmptyCards is called', () => {
      selectors.getMetricsHideEmptyCards.release();
      let state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            hideEmptyCards: false,
          }),
        })
      );
      expect(selectors.getMetricsHideEmptyCards(state)).toBe(false);

      state = appStateFromMetricsState(
        buildMetricsState({
          settings: buildMetricsSettingsState({
            hideEmptyCards: true,
          }),
        })
      );

      expect(selectors.getMetricsHideEmptyCards(state)).toBe(true);
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

  describe('getMetricsCardRangeSelectionEnabled', () => {
    it('returns card specific value when defined', () => {
      expect(
        selectors.getMetricsCardRangeSelectionEnabled(
          appStateFromMetricsState(
            buildMetricsState({
              rangeSelectionEnabled: false,
              cardStateMap: {
                card1: {
                  rangeSelectionOverride:
                    CardFeatureOverride.OVERRIDE_AS_ENABLED,
                },
              },
            })
          ),
          'card1'
        )
      ).toBeTrue();
      expect(
        selectors.getMetricsCardRangeSelectionEnabled(
          appStateFromMetricsState(
            buildMetricsState({
              rangeSelectionEnabled: true,
              cardStateMap: {
                card1: {
                  rangeSelectionOverride:
                    CardFeatureOverride.OVERRIDE_AS_DISABLED,
                },
              },
            })
          ),
          'card1'
        )
      ).toBeFalse();
    });

    it('returns global value when card specific value is not defined', () => {
      expect(
        selectors.getMetricsCardRangeSelectionEnabled(
          appStateFromMetricsState(
            buildMetricsState({
              rangeSelectionEnabled: true,
              cardStateMap: {
                card1: {},
              },
            })
          ),
          'card1'
        )
      ).toBeTrue();
      expect(
        selectors.getMetricsCardRangeSelectionEnabled(
          appStateFromMetricsState(
            buildMetricsState({
              rangeSelectionEnabled: false,
            })
          ),
          'card1'
        )
      ).toBeFalse();
    });

    it('returns global value when linked time is enabled', () => {
      expect(
        selectors.getMetricsCardRangeSelectionEnabled(
          appStateFromMetricsState(
            buildMetricsState({
              rangeSelectionEnabled: true,
              linkedTimeEnabled: true,
              cardStateMap: {
                card1: {
                  rangeSelectionOverride:
                    CardFeatureOverride.OVERRIDE_AS_DISABLED,
                },
              },
            })
          ),
          'card1'
        )
      ).toBeTrue();

      expect(
        selectors.getMetricsCardRangeSelectionEnabled(
          appStateFromMetricsState(
            buildMetricsState({
              rangeSelectionEnabled: false,
              linkedTimeEnabled: true,
              cardStateMap: {
                card1: {
                  rangeSelectionOverride:
                    CardFeatureOverride.OVERRIDE_AS_ENABLED,
                },
              },
            })
          ),
          'card1'
        )
      ).toBeFalse();
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
        start: {step: 1000},
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
        })
      );
      expect(selectors.getMetricsLinkedTimeSelection(state)).toEqual({
        start: {step: 0},
        end: {step: 100},
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

  describe('#getTableEditorSelectedTab', () => {
    beforeEach(() => {
      selectors.getTableEditorSelectedTab.release();
    });

    it('returns current settings pane open state', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({tableEditorSelectedTab: DataTableMode.RANGE})
      );
      expect(selectors.getTableEditorSelectedTab(state)).toEqual(
        DataTableMode.RANGE
      );
    });
  });

  describe('getSingleSelectionHeaders', () => {
    it('returns all single selection headers', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          singleSelectionHeaders: [
            {
              type: ColumnHeaderType.COLOR,
              name: 'color',
              displayName: 'Color',
              enabled: true,
            },
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'My Run name',
              enabled: false,
            },
          ],
        })
      );
      expect(selectors.getSingleSelectionHeaders(state)).toEqual([
        {
          type: ColumnHeaderType.COLOR,
          name: 'color',
          displayName: 'Color',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'My Run name',
          enabled: false,
        },
      ]);
    });
  });

  describe('getRangeSelectionHeaders', () => {
    it('returns all range selection headers', () => {
      const state = appStateFromMetricsState(
        buildMetricsState({
          rangeSelectionHeaders: [
            {
              type: ColumnHeaderType.COLOR,
              name: 'color',
              displayName: 'Color',
              enabled: true,
            },
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'My Run name',
              enabled: false,
            },
          ],
        })
      );
      expect(selectors.getRangeSelectionHeaders(state)).toEqual([
        {
          type: ColumnHeaderType.COLOR,
          name: 'color',
          displayName: 'Color',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'My Run name',
          enabled: false,
        },
      ]);
    });
  });

  describe('getColumnHeadersForCard', () => {
    let singleSelectionHeaders: ColumnHeader[];
    let rangeSelectionHeaders: ColumnHeader[];

    beforeEach(() => {
      singleSelectionHeaders = [
        {
          type: ColumnHeaderType.COLOR,
          name: 'color',
          displayName: 'Color',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'My Run name',
          enabled: false,
        },
      ];
      rangeSelectionHeaders = [
        {
          type: ColumnHeaderType.MEAN,
          name: 'mean',
          displayName: 'Mean',
          enabled: true,
        },
      ];
    });

    it('returns single selection headers when card range selection is disabled', () => {
      expect(
        selectors.getColumnHeadersForCard('card1')(
          appStateFromMetricsState(
            buildMetricsState({
              singleSelectionHeaders,
              rangeSelectionHeaders,
            })
          )
        )
      ).toEqual(singleSelectionHeaders);
      expect(
        selectors.getColumnHeadersForCard('card1')(
          appStateFromMetricsState(
            buildMetricsState({
              singleSelectionHeaders,
              rangeSelectionHeaders,
              cardStateMap: {
                card1: {
                  rangeSelectionOverride:
                    CardFeatureOverride.OVERRIDE_AS_DISABLED,
                },
              },
            })
          )
        )
      ).toEqual(singleSelectionHeaders);
    });

    it('returns range selection headers when card range selection is enabled', () => {
      expect(
        selectors.getColumnHeadersForCard('card1')(
          appStateFromMetricsState(
            buildMetricsState({
              singleSelectionHeaders,
              rangeSelectionHeaders,
              cardStateMap: {
                card1: {
                  rangeSelectionOverride:
                    CardFeatureOverride.OVERRIDE_AS_ENABLED,
                },
              },
            })
          )
        )
      ).toEqual(rangeSelectionHeaders);
    });

    it('returns range selection headers when global range selection is enabled', () => {
      expect(
        selectors.getColumnHeadersForCard('card1')(
          appStateFromMetricsState(
            buildMetricsState({
              singleSelectionHeaders,
              rangeSelectionHeaders,
              rangeSelectionEnabled: true,
            })
          )
        )
      ).toEqual(rangeSelectionHeaders);
    });
  });
});
