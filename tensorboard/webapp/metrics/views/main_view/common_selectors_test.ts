/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
import {RouteKind} from '../../../app_routing';
import {
  buildAppRoutingState,
  buildStateFromAppRoutingState,
} from '../../../app_routing/store/testing';
import {buildRoute} from '../../../app_routing/testing';
import {Run} from '../../../runs/store/runs_types';
import {
  buildRunsState,
  buildStateFromRunsState,
} from '../../../runs/store/testing';
import {
  appStateFromMetricsState,
  buildMetricsSettingsState,
  buildMetricsState,
} from '../../testing';
import {PluginType} from '../../types';
import * as selectors from './common_selectors';

describe('common selectors', () => {
  let runIds: Record<string, string[]>;
  let runIdToExpId: Record<string, string>;
  let runMetadata: Record<string, Run>;
  beforeEach(() => {
    runIds = {defaultExperimentId: ['run1', 'run2', 'run3']};
    runIdToExpId = {
      run1: 'defaultExperimentId',
      run2: 'defaultExperimentId',
      run3: 'defaultExperimentId',
    };
    runMetadata = {
      run1: {
        id: 'run1',
        name: 'run1',
        startTime: 0,
        hparams: null,
        metrics: null,
      },
      run2: {
        id: 'run2',
        name: 'run2',
        startTime: 0,
        hparams: null,
        metrics: null,
      },
      run3: {
        id: 'run3',
        name: 'run3',
        startTime: 0,
        hparams: null,
        metrics: null,
      },
    };
  });

  describe('getTagsWithScalarData', () => {
    it('returns all tags containing scalar data when no runs are selected', () => {
      const state = {
        ...appStateFromMetricsState(
          buildMetricsState({
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map(),
            }
          )
        ),
      };
      expect(selectors.TEST_ONLY.getTagsWithScalarData(state)).toEqual(
        new Set(['tag-1', 'tag-2'])
      );
    });

    it('returns only tags containing selected runs run some runs are selected', () => {
      const state = {
        ...appStateFromMetricsState(
          buildMetricsState({
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map([
                ['run1', false],
                ['run2', true],
                ['run3', false],
              ]),
            }
          )
        ),
      };
      expect(selectors.TEST_ONLY.getTagsWithScalarData(state)).toEqual(
        new Set(['tag-2'])
      );
    });
  });

  describe('getSortedRenderableCardIdsWithMetadata', () => {
    it('shows empty scalar cards when hideEmptyCards is false', () => {
      const state = {
        ...appStateFromMetricsState(
          buildMetricsState({
            cardList: ['card1', 'card2', 'card3'],
            cardMetadataMap: {
              card1: {
                plugin: PluginType.SCALARS,
                tag: 'tag-1',
                runId: null,
              },
              card2: {
                plugin: PluginType.SCALARS,
                tag: 'tag-2',
                runId: null,
              },
              card3: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run1',
              },
              card4: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run2',
              },
            },
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
            settings: buildMetricsSettingsState({
              hideEmptyCards: false,
            }),
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map([['run1', true]]),
            }
          )
        ),
      };
      expect(selectors.getSortedRenderableCardIdsWithMetadata(state)).toEqual([
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tag-1',
          runId: null,
        },
        {
          cardId: 'card2',
          plugin: PluginType.SCALARS,
          tag: 'tag-2',
          runId: null,
        },
        {
          cardId: 'card3',
          plugin: PluginType.HISTOGRAMS,
          tag: 'tag-2',
          runId: 'run1',
        },
      ]);
    });

    it('hides empty scalar cards when hideEmptyCards is true', () => {
      const state = {
        ...appStateFromMetricsState(
          buildMetricsState({
            cardList: ['card1', 'card2', 'card3'],
            cardMetadataMap: {
              card1: {
                plugin: PluginType.SCALARS,
                tag: 'tag-1',
                runId: null,
              },
              card2: {
                plugin: PluginType.SCALARS,
                tag: 'tag-2',
                runId: null,
              },
              card3: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run1',
              },
              card4: {
                plugin: PluginType.HISTOGRAMS,
                tag: 'tag-2',
                runId: 'run2',
              },
            },
            tagMetadata: {
              histograms: {
                tagDescriptions: {},
                tagToRuns: {},
              },
              images: {
                tagDescriptions: {},
                tagRunSampledInfo: {},
              },
              scalars: {
                tagDescriptions: {},
                tagToRuns: {
                  'tag-1': ['run1'],
                  'tag-2': ['run2', 'run3'],
                },
              },
            },
            settings: buildMetricsSettingsState({
              hideEmptyCards: true,
            }),
          })
        ),
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {},
            }),
          })
        ),
        ...buildStateFromRunsState(
          buildRunsState(
            {
              runIds,
              runIdToExpId,
              runMetadata,
            },
            {
              selectionState: new Map([['run1', true]]),
            }
          )
        ),
      };
      expect(selectors.getSortedRenderableCardIdsWithMetadata(state)).toEqual([
        {
          cardId: 'card1',
          plugin: PluginType.SCALARS,
          tag: 'tag-1',
          runId: null,
        },
        {
          cardId: 'card3',
          plugin: PluginType.HISTOGRAMS,
          tag: 'tag-2',
          runId: 'run1',
        },
      ]);
    });
  });
});
