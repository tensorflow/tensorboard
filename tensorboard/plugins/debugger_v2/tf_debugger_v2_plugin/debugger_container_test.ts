/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
/**
 * Unit tests for the Debugger Container.
 */
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {debuggerLoaded} from './actions';
import {DebuggerComponent} from './debugger_component';
import {DebuggerContainer} from './debugger_container';
import {DataLoadState, State} from './store/debugger_types';
import {createDebuggerState, createState} from './testing';

describe('Debugger Container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      providers: [
        provideMockStore({
          initialState: createState(createDebuggerState()),
        }),
        DebuggerContainer,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

  it('renders debugger component initially with inactive component', () => {
    const fixture = TestBed.createComponent(DebuggerContainer);
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(
      By.css('tf-debugger-v2-inactive')
    );
    expect(inactiveElement).toBeTruthy();
    const alertsElement = fixture.debugElement.query(
      By.css('tf-debugger-v2-alerts')
    );
    expect(alertsElement).toBeNull();
  });

  it('rendering debugger component dispatches debuggeRunsRequested', () => {
    const fixture = TestBed.createComponent(DebuggerContainer);
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(debuggerLoaded());
  });

  it('updates the UI to hide inactive component when store has 1 run', () => {
    const fixture = TestBed.createComponent(DebuggerContainer);
    fixture.detectChanges();

    store.setState(
      createState(
        createDebuggerState({
          runs: {
            foo_run: {
              start_time: 111,
            },
          },
          runsLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
        })
      )
    );
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(
      By.css('tf-debugger-v2-inactive')
    );
    expect(inactiveElement).toBeNull();
    const alertsElement = fixture.debugElement.query(
      By.css('tf-debugger-v2-alerts')
    );
    expect(alertsElement).toBeTruthy();
  });

  it('updates the UI to hide inactive component when store has no run', () => {
    const fixture = TestBed.createComponent(DebuggerContainer);
    fixture.detectChanges();

    store.setState(
      createState(
        createDebuggerState({
          runs: {},
          runsLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
        })
      )
    );
    fixture.detectChanges();

    const inactiveElement = fixture.debugElement.query(
      By.css('tf-debugger-v2-inactive')
    );
    expect(inactiveElement).toBeTruthy();
    const alertsElement = fixture.debugElement.query(
      By.css('tf-debugger-v2-alerts')
    );
    expect(alertsElement).toBeNull();
  });
});
