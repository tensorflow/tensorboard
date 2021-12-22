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
import {
  createRouteContextedState,
  RouteContextedState,
} from './route_contexted_reducer_helper';
import {buildNavigatedToNewExperimentAction, buildRoute} from './testing';
import {RouteKind} from './types';

interface RoutefulState {
  routeful: number;
}

interface NonRoutefulState {
  notRouteful: number;
}

type ContextedState = RouteContextedState<RoutefulState, NonRoutefulState>;

const incrementRouteful = createAction('[TEST] Toggle Routeful');
const incrementNotRouteful = createAction('[TEST] Toggle Not Routeful');

const {initialState, reducers: routeReducers} = createRouteContextedState<
  RoutefulState,
  NonRoutefulState
>({routeful: 0}, {notRouteful: 1});

const reducer = createReducer<ContextedState>(
  initialState,
  on(incrementRouteful, (state) => {
    return {...state, routeful: state.routeful + 1};
  }),
  on(incrementNotRouteful, (state) => {
    return {...state, notRouteful: state.notRouteful + 1};
  })
);

const reducers = composeReducers(routeReducers, reducer);

describe('route_contexted_reducer_helper', () => {
  describe('helper reducers', () => {
    it('swaps routeful state in and out of cache', () => {
      const state1 = {
        routeful: 1,
        notRouteful: 2,
        privateNamespacedState: {
          namespace2: {
            routeful: 10,
          },
        },
      };

      const state2 = routeReducers(
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

      expect(state2.routeful).toBe(10);

      const state3 = routeReducers(
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

      expect(state3.routeful).toBe(1);
    });

    it('sets routeful state to initialValue on cache miss', () => {
      const state = {
        routeful: 2000,
        notRouteful: 2,
        privateNamespacedState: {},
      };

      const nextState = routeReducers(
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

      expect(nextState.routeful).toBe(initialState.routeful);
    });

    it(
      'does not modify routeful state on cache miss when `before` is empty ' +
        'since it can have value from deeplinks',
      () => {
        const state = {
          routeful: 1337,
          notRouteful: 2,
          privateNamespacedState: {},
        };

        const nextState = routeReducers(
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

        expect(nextState.routeful).toBe(1337);
      }
    );

    it('modifies routeful state on cache hit even when `before` is null', () => {
      const state1 = {
        routeful: 2000,
        notRouteful: 2,
        privateNamespacedState: {
          namespace1: {
            routeful: 10,
          },
        },
      };

      const state2 = routeReducers(
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

      expect(state2.routeful).toBe(10);
    });

    it('does not modify routeful state when navigating to same namespace', () => {
      const state = {
        routeful: 2000,
        notRouteful: 2,
        privateNamespacedState: {
          namespace2: {
            routeful: 3,
          },
        },
      };

      const nextState = routeReducers(
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

      expect(nextState.routeful).toBe(2000);
      expect(nextState.notRouteful).toBe(2);
    });
  });

  describe('integration', () => {
    it('does not change behavior of reducers', () => {
      const state = {
        routeful: 1,
        notRouteful: 10,
        privateNamespacedState: {},
      };
      const routefulNextState = reducers(state, incrementRouteful());
      expect(routefulNextState.routeful).toBe(2);

      const notRoutefulNextState = reducers(state, incrementNotRouteful());
      expect(notRoutefulNextState.notRouteful).toBe(11);
    });

    it('keeps helper reducers still functional', () => {
      const state1 = {
        routeful: 1,
        notRouteful: 2,
        privateNamespacedState: {
          namespace2: {
            routeful: 10,
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

      expect(state2.routeful).toBe(10);

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

      expect(state3.routeful).toBe(1);
    });
  });

  describe('onRouteKindOrExperimentsChanged', () => {
    it('transforms the state', () => {
      const {reducers: routeReducers} = createRouteContextedState<
        RoutefulState,
        NonRoutefulState
      >({routeful: 0}, {notRouteful: 1}, (state) => {
        return {...state, routeful: 999};
      });

      const state1 = {
        routeful: 0,
        notRouteful: 1,
      };
      const state2 = routeReducers(
        state1,
        buildNavigatedToNewExperimentAction()
      );

      expect(state2.routeful).toBe(999);
    });

    it('transforms state before reducers', () => {
      const {initialState, reducers: routeReducers} = createRouteContextedState<
        RoutefulState,
        NonRoutefulState
      >({routeful: 0}, {notRouteful: 1}, (state, route) => {
        return {...state, routeful: 999};
      });

      const reducer = createReducer<ContextedState>(
        initialState,
        on(navigated, (state) => {
          return {...state, routeful: 123};
        })
      );
      const reducers = composeReducers(routeReducers, reducer);

      const state1 = {
        routeful: 0,
        notRouteful: 1,
      };
      const state2 = reducers(state1, buildNavigatedToNewExperimentAction());

      expect(state2.routeful).toBe(123);
    });

    it('allows transformation with route information', () => {
      const {initialState, reducers: routeReducers} = createRouteContextedState<
        RoutefulState,
        NonRoutefulState
      >({routeful: 0}, {notRouteful: 1}, (state, route) => {
        return {
          ...state,
          routeful: route.routeKind === RouteKind.EXPERIMENTS ? 7 : 999,
        };
      });

      const noopReducer = createReducer<ContextedState>(initialState);

      const reducers = composeReducers(routeReducers, noopReducer);

      const state1 = {
        routeful: 0,
        notRouteful: 1,
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
      expect(state2.routeful).toBe(7);

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
      expect(state3.routeful).toBe(999);
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
      routeful: 0,
      notRouteful: 1,
      privateNamespacedState: {},
    });
  });
});
