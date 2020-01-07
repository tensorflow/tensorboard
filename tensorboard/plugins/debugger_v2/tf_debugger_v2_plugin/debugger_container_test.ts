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
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {
  debuggerLoaded,
  executionScrollLeft,
  executionScrollRight,
} from './actions';
import {DebuggerComponent} from './debugger_component';
import {DebuggerContainer} from './debugger_container';
import {DataLoadState, State} from './store/debugger_types';
import {
  createDebuggerState,
  createState,
  createDebuggerExecutionsState,
  createDebuggerStateWithLoadedExecutionDigests,
} from './testing';
import {AlertsModule} from './views/alerts/alerts_module';
import {InactiveModule} from './views/inactive/inactive_module';
import {TimelineContainer} from './views/timeline/timeline_container';
import {TimelineModule} from './views/timeline/timeline_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Debugger Container test', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [AlertsModule, CommonModule, InactiveModule, TimelineModule],
      providers: [
        provideMockStore({
          initialState: createState(createDebuggerState()),
        }),
        DebuggerContainer,
        TimelineContainer,
      ],
    }).compileComponents();
    store = TestBed.get(Store);
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

  it('Timeline module shows loading number of executions', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();

    store.setState(
      createState(
        createDebuggerState({
          runs: {},
          runsLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          executions: createDebuggerExecutionsState({
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
          }),
        })
      )
    );
    fixture.detectChanges();

    const loadingElements = fixture.debugElement.queryAll(
      By.css('.loading-num-executions')
    );
    expect(loadingElements.length).toEqual(1);
  });

  it('Timeline module hides loading number of executions', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();

    store.setState(
      createState(
        createDebuggerState({
          runs: {},
          runsLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: Date.now(),
          },
          executions: createDebuggerExecutionsState({
            numExecutionsLoaded: {
              state: DataLoadState.LOADED,
              lastLoadedTimeInMs: 111,
            },
          }),
        })
      )
    );
    fixture.detectChanges();

    const loadingElements = fixture.debugElement.queryAll(
      By.css('.loading-num-executions')
    );
    expect(loadingElements.length).toEqual(0);
  });

  it('Timeline module shows correct display range for executions', () => {
    console.log('300'); // DEBUG
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();

    const scrollBeginIndex = 977;
    const dislpaySize = 100;
    store.setState(
      createState(
        createDebuggerStateWithLoadedExecutionDigests(
          scrollBeginIndex,
          dislpaySize
        )
      )
    );
    fixture.detectChanges();

    const navigationPositionInfoElement = fixture.debugElement.query(
      By.css('.navigation-position-info')
    );
    expect(navigationPositionInfoElement.nativeElement.innerText).toEqual(
      'Execution: 977 ~ 1076 of 1500'
    );
  });

  it('Clicking left button dispatches executionScrollLeft action', async () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();
    store.setState(
      createState(createDebuggerStateWithLoadedExecutionDigests(0, 50))
    );
    fixture.detectChanges();

    const leftBUtton = fixture.debugElement.query(
      By.css('.navigation-button-left')
    );
    leftBUtton.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dispatchSpy).toHaveBeenCalledWith(executionScrollLeft());
  });

  it('Clicking left button dispatches executionScrollRight action', async () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();
    store.setState(
      createState(createDebuggerStateWithLoadedExecutionDigests(0, 50))
    );
    fixture.detectChanges();

    const rightButton = fixture.debugElement.query(
      By.css('.navigation-button-right')
    );
    rightButton.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dispatchSpy).toHaveBeenCalledWith(executionScrollRight());
  });

  it('Timeline displays correct op names', () => {
    const fixture = TestBed.createComponent(TimelineContainer);
    fixture.detectChanges();
    const scrollBeginIndex = 100;
    const displayCount = 40;
    const opTypes: string[] = [];
    for (let i = 0; i < 200; ++i) {
      opTypes.push(`${i}Op`);
    }
    store.setState(
      createState(
        createDebuggerStateWithLoadedExecutionDigests(
          scrollBeginIndex,
          displayCount,
          opTypes
        )
      )
    );
    fixture.detectChanges();

    const executionDigests = fixture.debugElement.queryAll(
      By.css('.execution-digest')
    );
    expect(executionDigests.length).toEqual(40);
    const strLen = 1;
    for (let i = 0; i < 40; ++i) {
      expect(executionDigests[i].nativeElement.innerText).toEqual(
        opTypes[i + 100].slice(0, strLen)
      );
    }
  });
});
