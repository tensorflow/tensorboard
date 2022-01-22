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
import {TestBed} from '@angular/core/testing';
import {
  createAction,
  createFeatureSelector,
  createReducer,
  createSelector,
  on,
  Store,
  StoreModule,
} from '@ngrx/store';
import {firstValueFrom} from 'rxjs';
import {composeReducers} from '../util/ngrx';
import {navigated} from './actions';
import {areSameRouteKindAndExperiments} from './internal_utils';
import {
  createNamespaceContextedState,
  NamespaceContextedState,
} from './namespaced_state_reducer_helper';
import {buildNavigatedToNewExperimentAction, buildRoute} from './testing';
import {RouteKind} from './types';

interface NamespacedState {
  namespaced: number;
}

interface NonNamespacedState {
  nonNamespaced: number;
}

type ContextedState = NamespaceContextedState<
  NamespacedState,
  NonNamespacedState
>;

const incrementNamespaced = createAction('[TEST] Toggle Namespaced');
const incrementNonNamespaced = createAction('[TEST] Toggle Not Namespaced');

const {initialState, reducers: namespacedReducers} =
  createNamespaceContextedState<NamespacedState, NonNamespacedState>(
    {namespaced: 0},
    {nonNamespaced: 1}
  );

const reducer = createReducer<ContextedState>(
  initialState,
  on(incrementNamespaced, (state) => {
    return {...state, namespaced: state.namespaced + 1};
  }),
  on(incrementNonNamespaced, (state) => {
    return {...state, nonNamespaced: state.nonNamespaced + 1};
  })
);

const reducers = composeReducers(namespacedReducers, reducer);

describe('route_contexted_reducer_helper', () => {
  describe('helper reducers', () => {
    it('swaps namespaced state in and out of cache', () => {
      const state1 = {
        namespaced: 1,
        nonNamespaced: 2,
        privateNamespacedState: {
          namespace2: {
            namespaced: 10,
          },
        },
      };

      const state2 = namespacedReducers(
        state1,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'abc'},
            queryParams: [],
          }),
          beforeNamespaceId: 'namespace1',
          afterNamespaceId: 'namespace2',
        })
      );

      expect(state2.namespaced).toBe(10);

      const state3 = namespacedReducers(
        state2,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'abc'},
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
          beforeNamespaceId: 'namespace2',
          afterNamespaceId: 'namespace1',
        })
      );

      expect(state3.namespaced).toBe(1);
    });

    it('sets namespaced state to initialValue on cache miss', () => {
      const state = {
        namespaced: 2000,
        nonNamespaced: 2,
        privateNamespacedState: {},
      };

      const nextState = namespacedReducers(
        state,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
            params: {},
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
          beforeNamespaceId: 'namespace1',
          afterNamespaceId: 'namespace2',
        })
      );

      expect(nextState.namespaced).toBe(initialState.namespaced);
    });

    it(
      'does not modify namespaced state on cache miss when `before` is empty ' +
        'since it can have value from deeplinks',
      () => {
        const state = {
          namespaced: 1337,
          nonNamespaced: 2,
          privateNamespacedState: {},
        };

        const nextState = namespacedReducers(
          state,
          navigated({
            before: null,
            after: buildRoute({
              routeKind: RouteKind.EXPERIMENT,
              params: {experimentId: 'xyz'},
              queryParams: [],
            }),
            beforeNamespaceId: null,
            afterNamespaceId: 'namespace1',
          })
        );

        expect(nextState.namespaced).toBe(1337);
      }
    );

    it('modifies namespaced state on cache hit even when `before` is null', () => {
      const state1 = {
        namespaced: 2000,
        nonNamespaced: 2,
        privateNamespacedState: {
          namespace1: {
            namespaced: 10,
          },
        },
      };

      const state2 = namespacedReducers(
        state1,
        navigated({
          before: null,
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'abc'},
            queryParams: [],
          }),
          beforeNamespaceId: null,
          afterNamespaceId: 'namespace1',
        })
      );

      expect(state2.namespaced).toBe(10);
    });

    it('does not modify namespaced state when navigating to same namespace', () => {
      const state = {
        namespaced: 2000,
        nonNamespaced: 2,
        privateNamespacedState: {
          namespace2: {
            namespaced: 3,
          },
        },
      };

      const nextState = namespacedReducers(
        state,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'abc'},
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
          beforeNamespaceId: 'namespace1',
          afterNamespaceId: 'namespace1',
        })
      );

      expect(nextState.namespaced).toBe(2000);
      expect(nextState.nonNamespaced).toBe(2);
    });
  });

  describe('integration', () => {
    it('does not change behavior of reducers', () => {
      const state = {
        namespaced: 1,
        nonNamespaced: 10,
        privateNamespacedState: {},
      };
      const namespacedNextState = reducers(state, incrementNamespaced());
      expect(namespacedNextState.namespaced).toBe(2);

      const nonNamespacedNextState = reducers(state, incrementNonNamespaced());
      expect(nonNamespacedNextState.nonNamespaced).toBe(11);
    });

    it('keeps helper reducers still functional', () => {
      const state1 = {
        namespaced: 1,
        nonNamespaced: 2,
        privateNamespacedState: {
          namespace2: {
            namespaced: 10,
          },
        },
      };

      const state2 = reducers(
        state1,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'abc'},
            queryParams: [],
          }),
          beforeNamespaceId: 'namespace1',
          afterNamespaceId: 'namespace2',
        })
      );

      expect(state2.namespaced).toBe(10);

      const state3 = reducers(
        state2,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'abc'},
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
          beforeNamespaceId: 'namespace2',
          afterNamespaceId: 'namespace1',
        })
      );

      expect(state3.namespaced).toBe(1);
    });
  });

  describe('onNavigated', () => {
    it('transforms the state', () => {
      const {reducers: namespacedReducers} = createNamespaceContextedState<
        NamespacedState,
        NonNamespacedState
      >({namespaced: 0}, {nonNamespaced: 1}, (state) => {
        return {...state, namespaced: 999};
      });

      const state1 = {
        namespaced: 0,
        nonNamespaced: 1,
      };
      const state2 = namespacedReducers(
        state1,
        buildNavigatedToNewExperimentAction()
      );

      expect(state2.namespaced).toBe(999);
    });

    it('transforms state before reducers', () => {
      const {initialState, reducers: namespacedReducers} =
        createNamespaceContextedState<NamespacedState, NonNamespacedState>(
          {namespaced: 0},
          {nonNamespaced: 1},
          (state, oldRoute, newRoute) => {
            return {...state, namespaced: 999};
          }
        );

      const reducer = createReducer<ContextedState>(
        initialState,
        on(navigated, (state) => {
          return {...state, namespaced: 123};
        })
      );
      const reducers = composeReducers(namespacedReducers, reducer);

      const state1 = {
        namespaced: 0,
        nonNamespaced: 1,
      };
      const state2 = reducers(state1, buildNavigatedToNewExperimentAction());

      expect(state2.namespaced).toBe(123);
    });

    it('allows transformation with route information', () => {
      const {initialState, reducers: namespacedReducers} =
        createNamespaceContextedState<NamespacedState, NonNamespacedState>(
          {namespaced: 0},
          {nonNamespaced: 1},
          (state, oldRoute, newRoute) => {
            return {
              ...state,
              namespaced:
                newRoute.routeKind === RouteKind.EXPERIMENTS ? 7 : 999,
            };
          }
        );

      const noopReducer = createReducer<ContextedState>(initialState);

      const reducers = composeReducers(namespacedReducers, noopReducer);

      const state1 = {
        namespaced: 0,
        nonNamespaced: 1,
      };
      const state2 = reducers(
        state1,
        navigated({
          before: null,
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
          }),
          beforeNamespaceId: null,
          afterNamespaceId: 'namespace1',
        })
      );
      expect(state2.namespaced).toBe(7);

      const state3 = reducers(
        state1,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
          }),
          after: buildRoute({
            routeKind: RouteKind.COMPARE_EXPERIMENT,
            params: {experimentIds: 'e1:1,e2:2'},
          }),
          beforeNamespaceId: 'namespace1',
          afterNamespaceId: 'namespace2',
        })
      );
      expect(state3.namespaced).toBe(999);
    });

    it('allows transformation based on route changes', () => {
      const {initialState, reducers: namespacedReducers} =
        createNamespaceContextedState<NamespacedState, NonNamespacedState>(
          {namespaced: 0},
          {nonNamespaced: 1},
          (state, oldRoute, newRoute) => {
            if (areSameRouteKindAndExperiments(oldRoute, newRoute)) {
              return {
                ...state,
                namespaced: 1000,
              };
            }
            return {
              ...state,
              namespaced: -1000,
            };
          }
        );

      const noopReducer = createReducer<ContextedState>(initialState);
      const reducers = composeReducers(namespacedReducers, noopReducer);

      const state1 = {
        namespaced: 0,
        nonNamespaced: 1,
      };
      const state2 = reducers(
        state1,
        navigated({
          before: null,
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
          }),
          beforeNamespaceId: null,
          afterNamespaceId: 'namespace1',
        })
      );
      expect(state2.namespaced).toEqual(-1000);

      const state3 = reducers(
        state1,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENTS,
          }),
          beforeNamespaceId: 'namespace1',
          afterNamespaceId: 'namespace2',
        })
      );
      expect(state3.namespaced).toEqual(1000);
    });
  });
});

describe('route_contexted_reducer_helper ngrx integration test', () => {
  let store: Store;

  const TEST_KEY = 'my_test';

  const selectFeature = createFeatureSelector(TEST_KEY);
  const selectAll = createSelector(selectFeature, (s) => s);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StoreModule.forRoot([]),
        StoreModule.forFeature(TEST_KEY, reducers),
      ],
    }).compileComponents();
    store = TestBed.inject(Store);
  });

  it('contains correct initial value', async () => {
    const initialState = await firstValueFrom(store.select(selectAll));
    expect(initialState).toEqual({
      namespaced: 0,
      nonNamespaced: 1,
      privateNamespacedState: {},
    });
  });
});
