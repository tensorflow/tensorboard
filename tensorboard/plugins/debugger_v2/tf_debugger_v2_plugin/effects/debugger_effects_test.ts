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
  activeRunIdChanged,
  debuggerLoaded,
  debuggerRunsLoaded,
  debuggerRunsRequested,
  executionDigestsLoaded,
  executionDigestsRequested,
  numExecutionsLoaded,
  numExecutionsRequested,
  requestExecutionDigests,
} from '../actions';
import {Tfdbg2HttpServerDataSource} from '../data_source/tfdbg2_data_source';
import {
  State,
  DebuggerRunListing,
  ExecutionDigestsResponse,
  DataLoadState,
} from '../store/debugger_types';
import {createDebuggerState, createState} from '../testing';
import {DebuggerEffects, getMissingPages} from './debugger_effects';

describe('getMissingPages', () => {
  it('returns correct page indices for missing page', () => {
    const begin = 0;
    const end = 50;
    const pageSize = 100;
    const numItems = 140000;
    const loadePageSizes = {
      1337: 100,
    };
    expect(
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([0]);
  });

  it('returns empty page indices for existing full page', () => {
    const begin = 0;
    const end = 50;
    const pageSize = 100;
    const numItems = 240;
    const loadePageSizes = {
      0: 100,
    };
    expect(
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([]);
  });

  it('returns empty page indices for existing incomplete page', () => {
    const begin = 80;
    const end = 130;
    const pageSize = 100;
    const numItems = 1001;
    const loadePageSizes = {
      0: 100,
      1: 30,
    };
    expect(
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([]);
  });

  it('returns empty page indices for end of items', () => {
    const begin = 3;
    const end = 53;
    const pageSize = 100;
    const numItems = 53;
    const loadePageSizes = {
      0: 53,
    };
    expect(
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([]);
  });

  it('returns correct page index for incomplete page data', () => {
    const begin = 0;
    const end = 50;
    const pageSize = 100;
    const numItems = 80;
    const loadePageSizes = {
      0: 30,
    };
    expect(
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([0]);
  });

  it('returns correct page index if end is out of right-side bound', () => {
    const begin = 159;
    const end = 209;
    const pageSize = 100;
    const numItems = 1998;
    const loadePageSizes = {
      0: 100,
      1: 100,
    };
    expect(
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([2]);
  });

  it('returns array of two pages for straddling begin & end values', () => {
    const begin = 265;
    const end = 315;
    const pageSize = 100;
    const numItems = 5432;
    const loadePageSizes = {
      0: 100,
      1: 100,
      2: 99,
    };
    expect(
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([2, 3]);
  });

  it('throws error for begin-end span exceeding pageSize', () => {
    const begin = 1000;
    const end = 1150;
    const pageSize = 100;
    const numItems = 1234;
    const loadePageSizes = {};
    expect(() =>
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toThrowError(/exceeds page size/);
  });

  it('end > numItems leads to error', () => {
    const begin = 100;
    const end = 200;
    const pageSize = 100;
    const numItems = 199;
    const loadePageSizes = {};
    expect(() =>
      getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toThrowError('end index (200) exceeds total number of items (199)');
  });

  for (const invalidPageSize of [-2, 0, Math.PI]) {
    it(`throws error for invalid page size: ${invalidPageSize}`, () => {
      const begin = 0;
      const end = 50;
      const numItems = 999;
      expect(() =>
        getMissingPages(begin, end, invalidPageSize, numItems, {})
      ).toThrowError(/Invalid pageSize:/);
    });
  }
});

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

  describe('numExecutions loading', () => {
    let recordedActions: Action[] = [];

    beforeEach(() => {
      recordedActions = [];
      debuggerEffects.loadNumExecutions$.subscribe((action: Action) => {
        recordedActions.push(action);
      });
    });

    it('activeRunIdChanged action triggers run loading numExecutions', () => {
      const executionDigestForTest: ExecutionDigestsResponse = {
        begin: 0,
        end: 0,
        num_digests: 1234,
        execution_digests: [],
      };
      const fetchExecutionDigests = spyOn(
        TestBed.get(Tfdbg2HttpServerDataSource),
        'fetchExecutionDigests'
      )
        .withArgs('__default_debugger_run__', 0, 0)
        .and.returnValue(of(executionDigestForTest));

      action.next(
        activeRunIdChanged({activeRunId: '__default_debugger_run__'})
      );

      expect(fetchExecutionDigests).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(numExecutionsRequested());
      expect(recordedActions).toEqual([
        numExecutionsLoaded({
          numExecutions: 1234,
        }),
      ]);
    });
  });

  describe('executionDigests loading', () => {
    let recordedActions: Action[] = [];

    beforeEach(() => {
      recordedActions = [];
      debuggerEffects.loadNumExecutions$.subscribe((action: Action) => {
        recordedActions.push(action);
      });
      debuggerEffects.loadExecutionDigests$.subscribe((action: Action) => {
        recordedActions.push(action);
      });
    });

    it('requestExecutionDigests triggers executionDigests loading', () => {
      const pageSize = 5;
      store.setState(
        createState(
          createDebuggerState({
            executions: {
              numExecutionsLoaded: {
                state: DataLoadState.LOADED,
                lastLoadedTimeInMs: 1234,
              },
              executionDigestsLoaded: {
                state: DataLoadState.NOT_LOADED,
                lastLoadedTimeInMs: null,
                numExecutions: 10000, // Make sure total # of executions is loaded.
                pageLoadedSizes: {},
              },
              pageSize,
              displayCount: 2,
              scrollBeginIndex: 0,
              executionDigests: {},
            },
          })
        )
      );
      const executionDigests: ExecutionDigestsResponse = {
        begin: 0,
        end: 5,
        num_digests: 10000,
        execution_digests: [],
      };
      for (let i = 0; i < 5; ++i) {
        executionDigests.execution_digests.push({
          op_type: 'FooOp',
          output_tensor_device_ids: ['a1'],
        });
      }
      const fetchExecutionDigests = spyOn(
        TestBed.get(Tfdbg2HttpServerDataSource),
        'fetchExecutionDigests'
      )
        .withArgs('__default_debugger_run__', 0, pageSize)
        .and.returnValue(of(executionDigests));

      action.next(
        requestExecutionDigests({
          runId: '__default_debugger_run__',
          begin: 0,
          end: 2,
          pageSize,
        })
      );

      expect(fetchExecutionDigests).toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(executionDigestsRequested());
      expect(recordedActions).toEqual([
        executionDigestsLoaded(executionDigests),
      ]);
    });
  });
});
