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
import {createAction, createReducer, on} from '@ngrx/store';
import {composeReducers} from './ngrx';

const incrementFoo = createAction('[UTIL TEST] Increment Foo');
const incrementBar = createAction('[UTIL TEST] Increment Bar');
const incrementBaz = createAction('[UTIL TEST] Increment Baz');

interface State {
  foo: number;
  bar: number;
  baz: number;
}

function buildState({foo = 10, bar = 100, baz = 5}: Partial<State> = {}) {
  return {foo, bar, baz};
}

const reducer1 = createReducer(
  buildState(),
  on(incrementFoo, (state) => {
    return {...state, foo: state.foo + 1};
  }),
  on(incrementBaz, (state) => {
    return {...state, baz: state.baz + 1};
  }),
  // This is legal in Ngrx.
  on(incrementBaz, (state) => {
    return {...state, baz: state.baz + 2};
  })
);

const reducer2 = createReducer(
  buildState(),
  on(incrementFoo, (state) => {
    return {...state, foo: state.foo + 5};
  }),
  on(incrementBar, (state) => {
    return {...state, bar: state.bar + 5};
  })
);

describe('ngrx util', () => {
  it('composes multiple reducers and run all their reducers', () => {
    const reducers = composeReducers(reducer1, reducer2);

    const newState = reducers(buildState({bar: 10}), incrementBar());

    expect(newState.bar).toBe(15);
  });

  it('calls incrementFoo handler on all reducers', () => {
    const reducers = composeReducers(reducer1, reducer2);

    const newState = reducers(buildState({foo: 3}), incrementFoo());

    // 3 + 5 + 1
    expect(newState.foo).toBe(9);
  });

  it('supports multiple handlers handling same action within a reducer', () => {
    const reducers = composeReducers(reducer1, reducer2);

    const newState = reducers(buildState({baz: 4}), incrementBaz());

    expect(newState.baz).toBe(7);
  });
});
