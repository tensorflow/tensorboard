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
import * as selectors from './experiments_selectors';
import {State} from '../../app_state';
import {buildExperiment, buildStateFromExperimentsState} from './testing';
import {buildMockState} from '../../testing/utils';
import {
  buildAppRoutingState,
  buildStateFromAppRoutingState,
} from '../../app_routing/store/testing';
import {RouteKind} from '../../app_routing/types';

describe('experiments selectors', () => {
  describe('#getExperiment', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getExperiment.release();
    });

    it('returns an experiment', () => {
      const pooh = buildExperiment({id: 'pooh'});
      const tigger = buildExperiment({id: 'tigger'});
      const state = buildStateFromExperimentsState({
        data: {
          experimentMap: {pooh, tigger},
        },
      });
      expect(selectors.getExperiment(state, {experimentId: 'pooh'})).toEqual(
        pooh
      );
    });

    it('returns null if not found', () => {
      const pooh = buildExperiment({id: 'pooh'});
      const state = buildStateFromExperimentsState({
        data: {
          experimentMap: {pooh},
        },
      });
      expect(selectors.getExperiment(state, {experimentId: 'tigger'})).toEqual(
        null
      );
    });
  });

  describe('#getDashboardExperimentNames', () => {
    let state: State;

    beforeEach(() => {
      const foo = buildExperiment({id: 'foo', name: 'foo name'});
      const bar = buildExperiment({id: 'bar', name: 'bar name'});

      state = buildMockState({
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.COMPARE_EXPERIMENT,
              params: {
                experimentIds: 'exp1:foo,exp2:bar,exp3:baz',
              },
            },
          })
        ),
        ...buildStateFromExperimentsState({
          data: {
            experimentMap: {foo, bar},
          },
        }),
      });
    });

    it('translates experiment ids to experiment names', () => {
      expect(selectors.getDashboardExperimentNames(state)).toEqual({
        foo: 'foo name',
        bar: 'bar name',
      });
    });

    it('returns an empty object when no experiments are provided', () => {
      state = {
        ...state,
        ...buildStateFromAppRoutingState(
          buildAppRoutingState({
            activeRoute: {
              routeKind: RouteKind.EXPERIMENTS,
              params: {},
            },
          })
        ),
      };
      expect(selectors.getDashboardExperimentNames(state)).toEqual({});
    });
  });
});
