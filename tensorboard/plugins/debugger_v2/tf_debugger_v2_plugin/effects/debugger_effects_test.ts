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
import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {ReplaySubject, of} from 'rxjs';

import {
  debuggerLoaded,
  debuggerRunsRequested,
  debuggerRunsLoaded,
} from '../actions';
import {Tfdbg2HttpServerDataSource} from '../data_source/tfdbg2_data_source';
import {State, DebuggerRunListing} from '../store/debugger_types';
import {createDebuggerState, createState} from '../testing';
import {DebuggerEffects} from './debugger_effects';

describe('Debugger effects', () => {
  let debuggerEffects: DebuggerEffects;
  let action: ReplaySubject<Action>;
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);

    const initialState = createState(createDebuggerState());
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        provideMockActions(action),
        DebuggerEffects,
        Tfdbg2HttpServerDataSource,
        provideMockStore({initialState}),
      ],
    }).compileComponents();
    debuggerEffects = TestBed.get(DebuggerEffects);
    store = TestBed.get(Store);
    dispatchSpy = spyOn(store, 'dispatch');
  });

  describe('Runs loading', () => {
    let recordedActions: Action[] = [];

    beforeEach(() => {
      recordedActions = [];
      debuggerEffects.loadRunListing$.subscribe((action: Action) => {
        recordedActions.push(action);
      });
    });

    it('debugerLoaded action triggers run loading that succeeeds', () => {
      const runListingForTest: DebuggerRunListing = {
        foo_run: {
          start_time: 1337,
        },
      };
      const fetchRuns = spyOn(
        TestBed.get(Tfdbg2HttpServerDataSource),
        'fetchRuns'
      )
        .withArgs()
        .and.returnValue(of(runListingForTest));

      action.next(debuggerLoaded());

      expect(fetchRuns).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(debuggerRunsRequested());
      expect(recordedActions).toEqual([
        debuggerRunsLoaded({
          runs: runListingForTest,
        }),
      ]);
    });
  });
});
