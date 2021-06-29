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
import {buildNavigatedToNewRouteIdAction, buildRoute} from './testing';
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
    it('stows routeful state to the context', () => {
      const state1 = {
        routeful: 1,
        notRouteful: 2,
        privateRouteContextedState: {
          '2/abc': {
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
        })
      );

      expect(state3.routeful).toBe(1);
    });

    it('sets initialValue when navigating to cache miss route', () => {
      const state = {
        routeful: 2000,
        notRouteful: 2,
        privateRouteContextedState: {},
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
        })
      );

      expect(nextState.routeful).toBe(initialState.routeful);
    });

    it(
      'does not modify state when `before` is empty since it can have value ' +
        'from deeplinks',
      () => {
        const state = {
          routeful: 1337,
          notRouteful: 2,
          privateRouteContextedState: {},
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
          })
        );

        expect(nextState.routeful).toBe(1337);
      }
    );

    it('does not overwrite existing state when navigating to same routeId', () => {
      const state = {
        routeful: 2000,
        notRouteful: 2,
        privateRouteContextedState: {
          '2/xyz': {
            routeful: 3,
          },
        },
      };

      const nextState = routeReducers(
        state,
        navigated({
          before: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
          after: buildRoute({
            routeKind: RouteKind.EXPERIMENT,
            params: {experimentId: 'xyz'},
            queryParams: [],
          }),
        })
      );

      expect(nextState.routeful).toBe(2000);
      expect(nextState.notRouteful).toBe(2);
    });

    it('ignores routeful state when `before` is null', () => {
      const state1 = {
        routeful: 2000,
        notRouteful: 2,
        privateRouteContextedState: {
          '2/abc': {
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
        })
      );

      expect(state3.routeful).toBe(initialState.routeful);
    });
  });

  describe('integration', () => {
    it('does not change behavior of reducers', () => {
      const state = {
        routeful: 1,
        notRouteful: 10,
        privateRouteContextedState: {},
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
        privateRouteContextedState: {
          '2/abc': {
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
        })
      );

      expect(state2.routeful).toBe(10);

      const state3 = reducers(state2, buildNavigatedToNewRouteIdAction());

      expect(state3.routeful).toBe(1);
    });
  });

  describe('onRouteIdChanged', () => {
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
      const state2 = routeReducers(state1, buildNavigatedToNewRouteIdAction());

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
      const state2 = reducers(state1, buildNavigatedToNewRouteIdAction());

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
      privateRouteContextedState: {},
    });
  });
});
