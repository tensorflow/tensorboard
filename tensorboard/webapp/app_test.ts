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

import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';

import {AppContainer} from './app_container';
import {State} from './app_state';
import {coreLoaded} from './core/actions';
import {getActiveRoute} from './selectors';
import {buildRoute} from './app_routing/testing';

describe('app test', () => {
  let actualDispatches: Action[];
  let store: MockStore<State>;

  beforeEach(async () => {
    actualDispatches = [];
    await TestBed.configureTestingModule({
      providers: [provideMockStore()],
      declarations: [AppContainer],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualDispatches.push(action);
    });
  });

  it('dispatches coreLoaded once after route is initialized', () => {
    store.overrideSelector(getActiveRoute, null);
    const fixture = TestBed.createComponent(AppContainer);
    fixture.detectChanges();

    expect(actualDispatches).toEqual([]);

    store.overrideSelector(
      getActiveRoute,
      buildRoute({
        pathname: '/bar',
      })
    );
    store.refreshState();

    expect(actualDispatches).toEqual([coreLoaded()]);

    store.overrideSelector(
      getActiveRoute,
      buildRoute({
        pathname: '/foo',
      })
    );
    store.refreshState();
    expect(actualDispatches).toEqual([coreLoaded()]);
  });
});
