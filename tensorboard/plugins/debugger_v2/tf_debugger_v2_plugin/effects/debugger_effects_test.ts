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
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {empty, Observable, of, ReplaySubject, timer} from 'rxjs';
import {take} from 'rxjs/operators';
import {
  changePlugin,
  manualReload,
  reload,
} from '../../../../webapp/core/actions';
import {getActivePlugin} from '../../../../webapp/core/store';
import {TBHttpClientTestingModule} from '../../../../webapp/webapp_data_source/tb_http_client_testing';
import {
  alertsOfTypeLoaded,
  alertTypeFocusToggled,
  debuggerDataPollOnset,
  debuggerLoaded,
  debuggerRunsLoaded,
  debuggerRunsRequested,
  debuggerUnloaded,
  executionDataLoaded,
  executionDigestFocused,
  executionDigestsLoaded,
  executionDigestsRequested,
  executionScrollLeft,
  executionScrollRight,
  executionScrollToIndex,
  graphExecutionDataLoaded,
  graphExecutionDataRequested,
  graphExecutionFocused,
  graphExecutionScrollToIndex,
  graphOpFocused,
  graphOpInfoLoaded,
  graphOpInfoRequested,
  numAlertsAndBreakdownLoaded,
  numAlertsAndBreakdownRequested,
  numExecutionsLoaded,
  numExecutionsRequested,
  numGraphExecutionsLoaded,
  numGraphExecutionsRequested,
  sourceFileListLoaded,
  sourceFileListRequested,
  sourceFileLoaded,
  sourceFileRequested,
  sourceLineFocused,
  stackFramesLoaded,
} from '../actions';
import {
  AlertsResponse,
  ExecutionDataResponse,
  ExecutionDigestsResponse,
  GraphExecutionDataResponse,
  GraphExecutionDigestsResponse,
  SourceFileListResponse,
  SourceFileResponse,
  StackFramesResponse,
  Tfdbg2HttpServerDataSource,
} from '../data_source/tfdbg2_data_source';
import {
  getActiveRunId,
  getAlertsFocusType,
  getAlertsLoaded,
  getDebuggerRunListing,
  getDebuggerRunsLoaded,
  getDisplayCount,
  getExecutionDigestsLoaded,
  getExecutionPageSize,
  getExecutionScrollBeginIndex,
  getFocusedSourceFileContent,
  getFocusedSourceFileIndex,
  getGraphExecutionDataLoadingPages,
  getGraphExecutionDataPageLoadedSizes,
  getGraphExecutionDisplayCount,
  getGraphExecutionPageSize,
  getGraphExecutionScrollBeginIndex,
  getLoadedAlertsOfFocusedType,
  getLoadedExecutionData,
  getLoadedStackFrames,
  getLoadingGraphOps,
  getNumAlertsOfFocusedType,
  getNumExecutions,
  getNumExecutionsLoaded,
  getNumGraphExecutions,
  getSourceFileList,
} from '../store';
import {
  AlertType,
  DataLoadState,
  DebuggerRunListing,
  Execution,
  ExecutionDigest,
  GraphExecution,
  GraphOpInfo,
  SourceFileContent,
  SourceFileSpec,
  State,
} from '../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createTestExecutionData,
  createTestExecutionDigest,
  createTestGraphExecution,
  createTestGraphOpInfo,
  createTestInfNanAlert,
  createTestStackFrame,
} from '../testing';
import {PLUGIN_ID} from '../types';
import {
  DebuggerEffects,
  getCurrentPollingInterval,
  MAX_POLLING_INTERVAL_MS,
  MIN_POLLING_INTERVAL_MS,
  POLLING_BACKOFF_FACTOR,
  TEST_ONLY,
} from './debugger_effects';

describe('getCurrentPollingInterval', () => {
  it('constants are valid', () => {
    expect(MIN_POLLING_INTERVAL_MS).toBeGreaterThan(0);
    expect(MAX_POLLING_INTERVAL_MS).toBeGreaterThan(MIN_POLLING_INTERVAL_MS);
    expect(POLLING_BACKOFF_FACTOR).toBeGreaterThan(1);
    expect(MAX_POLLING_INTERVAL_MS).toBeGreaterThan(
      MIN_POLLING_INTERVAL_MS * POLLING_BACKOFF_FACTOR
    );
  });

  it('returns minmum value input below minimum', () => {
    expect(getCurrentPollingInterval(-Infinity)).toBe(MIN_POLLING_INTERVAL_MS);
    expect(getCurrentPollingInterval(-MIN_POLLING_INTERVAL_MS)).toBe(
      MIN_POLLING_INTERVAL_MS
    );
    expect(getCurrentPollingInterval(0)).toBe(MIN_POLLING_INTERVAL_MS);
    expect(getCurrentPollingInterval(MIN_POLLING_INTERVAL_MS / 2)).toBe(
      MIN_POLLING_INTERVAL_MS
    );
    expect(getCurrentPollingInterval(MIN_POLLING_INTERVAL_MS)).toBe(
      MIN_POLLING_INTERVAL_MS
    );
  });

  it('returns minmum value input between minimum and minimum * factor', () => {
    expect(
      getCurrentPollingInterval(
        (MIN_POLLING_INTERVAL_MS * (POLLING_BACKOFF_FACTOR + 1)) / 2
      )
    ).toBe(MIN_POLLING_INTERVAL_MS);
  });

  it('returns input value for input between minimum * factor and max', () => {
    const pollSilenceTimeMillis =
      (MIN_POLLING_INTERVAL_MS * POLLING_BACKOFF_FACTOR +
        MAX_POLLING_INTERVAL_MS) /
      2;
    expect(getCurrentPollingInterval(pollSilenceTimeMillis)).toBe(
      pollSilenceTimeMillis
    );
  });

  it('returns maximum for inputs > maximum', () => {
    expect(getCurrentPollingInterval(MAX_POLLING_INTERVAL_MS + 1)).toBe(
      MAX_POLLING_INTERVAL_MS
    );
    expect(getCurrentPollingInterval(MAX_POLLING_INTERVAL_MS * 1000)).toBe(
      MAX_POLLING_INTERVAL_MS
    );
    expect(getCurrentPollingInterval(Infinity)).toBe(MAX_POLLING_INTERVAL_MS);
  });
});

describe('createTimedRepeater', () => {
  it('emits values at expected times', fakeAsync(() => {
    const inputStream$ = of(42);
    const polllingIntervalStream$ = of(1000);
    const terminationStream$ = empty();
    const outputStream$ = TEST_ONLY.createTimedRepeater(
      inputStream$,
      polllingIntervalStream$,
      terminationStream$
    ).pipe(take(3));
    let numValues = 0;
    outputStream$.subscribe(() => {
      numValues++;
    });
    expect(numValues).toBe(1);
    tick(1000);
    expect(numValues).toBe(2);
    tick(1000);
    expect(numValues).toBe(3);
  }));

  it('terminates on termnation event', fakeAsync(() => {
    const inputStream$ = of(42);
    const polllingIntervalStream$ = of(1000);
    const terminationStream$ = timer(2500);
    const outputStream$ = TEST_ONLY.createTimedRepeater(
      inputStream$,
      polllingIntervalStream$,
      terminationStream$
    );
    let numValues = 0;
    outputStream$.subscribe(() => {
      numValues++;
    });
    tick(4000);
    expect(numValues).toBe(3);
  }));
});

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
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
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
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
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
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([]);
  });

  it('returns non-empty page indices for existing incomplete page', () => {
    const begin = 70;
    const end = 120;
    const pageSize = 100;
    const numItems = 1001;
    const loadePageSizes = {
      0: 30,
      1: 100,
    };
    expect(
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([0]);
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
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
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
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
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
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
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
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toEqual([2, 3]);
  });

  it('throws error for begin-end span exceeding pageSize', () => {
    const begin = 1000;
    const end = 1150;
    const pageSize = 100;
    const numItems = 1234;
    const loadePageSizes = {};
    expect(() =>
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toThrowError(/exceeds page size/);
  });

  it('end > numItems leads to error', () => {
    const begin = 100;
    const end = 200;
    const pageSize = 100;
    const numItems = 199;
    const loadePageSizes = {};
    expect(() =>
      TEST_ONLY.getMissingPages(begin, end, pageSize, numItems, loadePageSizes)
    ).toThrowError('end index (200) exceeds total number of items (199)');
  });

  for (const invalidPageSize of [-2, 0, Math.PI]) {
    it(`throws error for invalid page size: ${invalidPageSize}`, () => {
      const begin = 0;
      const end = 50;
      const numItems = 999;
      expect(() =>
        TEST_ONLY.getMissingPages(begin, end, invalidPageSize, numItems, {})
      ).toThrowError(/Invalid pageSize:/);
    });
  }
});

describe('Debugger effects', () => {
  let debuggerEffects: DebuggerEffects;
  let action: ReplaySubject<Action>;
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;
  let dispatchedActions: Action[];

  beforeEach(async () => {
    action = new ReplaySubject<Action>(1);
    dispatchedActions = [];

    const initialState = createState(createDebuggerState());
    await TestBed.configureTestingModule({
      imports: [TBHttpClientTestingModule],
      providers: [
        provideMockActions(action),
        DebuggerEffects,
        Tfdbg2HttpServerDataSource,
        provideMockStore({initialState}),
      ],
      // The upgrade to Angular 13 caused this test file to fail flakily with
      // errors like "Error: Injector has already been destroyed."
      //
      // Others have run into this problem:
      // https://github.com/angular/angular/issues/44186
      //
      // The suggested workaround is to set `destroyAfterEach` to false. The
      // default value for `destroyAfterEach` changed in Angular 13.
      //
      // The Angular team suggests this means we "have scope leakage in [our]
      // tests" but we haven't been able to pinpoint the leakage.
      teardown: {destroyAfterEach: false},
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
    store.overrideSelector(getActivePlugin, '');
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  function createAndSubscribeToDebuggerEffectsWithEmptyRepeater() {
    spyOn(TEST_ONLY, 'createTimedRepeater').and.callFake(
      (stream: Observable<any>) => stream
    );
    debuggerEffects = TestBed.inject(DebuggerEffects);
    debuggerEffects.loadData$.subscribe();
  }

  function createFetchSourceFileListSpy(
    runId: string,
    sourceFilesListResponse: SourceFileListResponse
  ) {
    return spyOn(
      TestBed.inject(Tfdbg2HttpServerDataSource),
      'fetchSourceFileList'
    )
      .withArgs(runId)
      .and.returnValue(of(sourceFilesListResponse));
  }

  function createFetchAlertsSpy(
    runId: string,
    begin: number,
    end: number,
    alertsResponse: AlertsResponse,
    alert_type?: string
  ) {
    if (alert_type === undefined) {
      return spyOn(TestBed.inject(Tfdbg2HttpServerDataSource), 'fetchAlerts')
        .withArgs(runId, begin, end)
        .and.returnValue(of(alertsResponse));
    } else {
      return spyOn(TestBed.inject(Tfdbg2HttpServerDataSource), 'fetchAlerts')
        .withArgs(runId, begin, end, alert_type)
        .and.returnValue(of(alertsResponse));
    }
  }

  function createFetchExecutionDigestsSpy(
    runId: string,
    begin: number,
    end: number,
    excutionDigestsResponse: ExecutionDigestsResponse
  ) {
    return spyOn(
      TestBed.inject(Tfdbg2HttpServerDataSource),
      'fetchExecutionDigests'
    )
      .withArgs(runId, begin, end)
      .and.returnValue(of(excutionDigestsResponse));
  }

  function createFetchGraphExecutionDigestsSpy(
    runId: string,
    begin: number,
    end: number,
    graphExcutionDigestsResponse: GraphExecutionDigestsResponse
  ) {
    return spyOn(
      TestBed.inject(Tfdbg2HttpServerDataSource),
      'fetchGraphExecutionDigests'
    )
      .withArgs(runId, begin, end)
      .and.returnValue(of(graphExcutionDigestsResponse));
  }

  function createFetchGraphExecutionDataSpy(
    runId: string,
    begin: number,
    end: number,
    graphExcutionDataResponse: GraphExecutionDataResponse
  ) {
    return spyOn(
      TestBed.inject(Tfdbg2HttpServerDataSource),
      'fetchGraphExecutionData'
    )
      .withArgs(runId, begin, end)
      .and.returnValue(of(graphExcutionDataResponse));
  }

  function createFetchGraphOpInfoSpy(
    run: string,
    graph_id: string,
    op_name: string,
    graphOpInfo: GraphOpInfo
  ) {
    return spyOn(TestBed.inject(Tfdbg2HttpServerDataSource), 'fetchGraphOpInfo')
      .withArgs(run, graph_id, op_name)
      .and.returnValue(of(graphOpInfo));
  }

  function createFetchStackFramesSpy(
    run: string,
    stackFrameIds: string[],
    stackFrames: StackFramesResponse
  ) {
    return spyOn(TestBed.inject(Tfdbg2HttpServerDataSource), 'fetchStackFrames')
      .withArgs(run, stackFrameIds)
      .and.returnValue(of(stackFrames));
  }

  function createFetchRunsSpy(runsListing: DebuggerRunListing) {
    return spyOn(TestBed.inject(Tfdbg2HttpServerDataSource), 'fetchRuns')
      .withArgs()
      .and.returnValue(of(runsListing));
  }

  const runListingForTest: DebuggerRunListing = {
    __default_debugger_run__: {
      start_time: 1337,
    },
  };

  const runId = '__default_debugger_run__';

  const numAlertsResponseForTest: AlertsResponse = {
    begin: 0,
    end: 0,
    num_alerts: 0,
    alerts_breakdown: {},
    alerts: [],
    per_type_alert_limit: 1000,
  };

  describe('loadData', () => {
    function createFetchExecutionDataSpy(
      runId: string,
      begin: number,
      end: number,
      response: ExecutionDataResponse
    ) {
      return spyOn(
        TestBed.inject(Tfdbg2HttpServerDataSource),
        'fetchExecutionData'
      )
        .withArgs(runId, begin, end)
        .and.returnValue(of(response));
    }

    const numExecutions = 5;
    const pageSize = 2;
    const executionDigests: ExecutionDigest[] = [
      {
        op_type: 'Op1',
        output_tensor_device_ids: ['d1'],
      },
      {
        op_type: 'Op2',
        output_tensor_device_ids: ['d2'],
      },
    ];
    const executionData1 = createTestExecutionData({
      op_type: 'Op1',
      stack_frame_ids: ['aa', 'bb'],
    });
    const executionDigestsPageResponse: ExecutionDigestsResponse = {
      begin: 0,
      end: pageSize,
      num_digests: numExecutions,
      execution_digests: executionDigests,
    };
    const executionDataResponse: ExecutionDataResponse = {
      begin: 0,
      end: 1,
      executions: [executionData1],
    };

    const numGraphExecutions = 10;

    const stackFrame0 = createTestStackFrame();
    const stackFrame1 = createTestStackFrame();

    const twoSourceFilesForTest: SourceFileListResponse = [
      ['localhost', '/tmp/main.py'],
      ['localhost', '/tmp/train.py'],
    ];

    function createFetchSpies() {
      const fetchRuns = createFetchRunsSpy(runListingForTest);
      const fetchSourceFileList = createFetchSourceFileListSpy(
        runId,
        twoSourceFilesForTest
      );
      const fetchNumAlertsSpy = createFetchAlertsSpy(
        runId,
        0,
        0,
        numAlertsResponseForTest
      );
      // Spy for loading number of execution digests.
      const fetchExecutionDigests = createFetchExecutionDigestsSpy(
        runId,
        0,
        0,
        {
          begin: 0,
          end: 0,
          num_digests: numExecutions,
          execution_digests: [],
        }
      );
      // Spy for loading the first page of execution digests.
      fetchExecutionDigests
        .withArgs(runId, 0, pageSize)
        .and.returnValue(of(executionDigestsPageResponse));
      // Spy for loading detailed execution data.
      const fetchExecutionData = createFetchExecutionDataSpy(
        runId,
        0,
        1,
        executionDataResponse
      );
      // Spy for loading number of graph executions.
      const fetchGraphExecutionDigests = createFetchGraphExecutionDigestsSpy(
        runId,
        0,
        0,
        {
          begin: 0,
          end: 0,
          num_digests: numGraphExecutions,
          graph_execution_digests: [],
        }
      );
      // Spy for loading stack frames.
      const fetchStackFrames = createFetchStackFramesSpy(runId, ['aa', 'bb'], {
        stack_frames: [stackFrame0, stackFrame1],
      });
      return {
        fetchRuns,
        fetchSourceFileList,
        fetchNumAlertsSpy,
        fetchExecutionDigests,
        fetchExecutionData,
        fetchGraphExecutionDigests,
        fetchStackFrames,
      };
    }

    beforeEach(() => {
      createAndSubscribeToDebuggerEffectsWithEmptyRepeater();
    });

    for (const triggerAction of [
      debuggerLoaded(),
      reload(),
      manualReload(),
    ] as Action[]) {
      it(`run list loading on ${triggerAction.type}: empty runs`, () => {
        const fetchRuns = createFetchRunsSpy({});
        store.overrideSelector(getActivePlugin, PLUGIN_ID);
        store.overrideSelector(getDebuggerRunListing, {});
        store.refreshState();

        action.next(triggerAction);

        expect(fetchRuns).toHaveBeenCalled();
        expect(dispatchedActions).toEqual([
          debuggerDataPollOnset(),
          debuggerRunsRequested(),
          debuggerRunsLoaded({runs: {}}),
        ]);
      });

      it(
        `loads numExecutions on ${triggerAction.type}: ` + `empty executions`,
        () => {
          const fetchRuns = createFetchRunsSpy(runListingForTest);
          const fetchNumExecutionDigests = createFetchExecutionDigestsSpy(
            runId,
            0,
            0,
            {
              begin: 0,
              end: 0,
              num_digests: 0,
              execution_digests: [],
            }
          );
          const fetchNumAlerts = createFetchAlertsSpy(
            runId,
            0,
            0,
            numAlertsResponseForTest
          );
          const fetchNumGraphExecutionDigests =
            createFetchGraphExecutionDigestsSpy(runId, 0, 0, {
              begin: 0,
              end: 0,
              num_digests: 0,
              graph_execution_digests: [],
            });
          store.overrideSelector(getActivePlugin, PLUGIN_ID);
          store.overrideSelector(getDebuggerRunListing, runListingForTest);
          store.overrideSelector(getNumExecutionsLoaded, {
            state: DataLoadState.NOT_LOADED,
            lastLoadedTimeInMs: null,
          });
          store.refreshState();

          action.next(triggerAction);

          expect(fetchRuns).toHaveBeenCalled();
          expect(fetchNumExecutionDigests).toHaveBeenCalled();
          expect(fetchNumAlerts).toHaveBeenCalled();
          expect(fetchNumGraphExecutionDigests).toHaveBeenCalled();
          expect(dispatchedActions).toEqual([
            debuggerDataPollOnset(),
            debuggerRunsRequested(),
            debuggerRunsLoaded({runs: runListingForTest}),
            numAlertsAndBreakdownRequested(),
            numAlertsAndBreakdownLoaded({
              numAlerts: numAlertsResponseForTest.num_alerts,
              alertsBreakdown: numAlertsResponseForTest.alerts_breakdown,
            }),
            numExecutionsRequested(),
            numExecutionsLoaded({numExecutions: 0}),
            numGraphExecutionsRequested(),
            numGraphExecutionsLoaded({numGraphExecutions: 0}),
          ]);
        }
      );

      it(
        `on ${triggerAction.type}, ` +
          `loads source-file list, top-level and intra-graph digests and data, ` +
          `and stack trace, if numExecutions>0`,
        () => {
          const {
            fetchRuns,
            fetchSourceFileList,
            fetchExecutionDigests,
            fetchExecutionData,
            fetchGraphExecutionDigests,
            fetchStackFrames,
          } = createFetchSpies();
          store.overrideSelector(getDebuggerRunListing, runListingForTest);
          store.overrideSelector(getNumExecutionsLoaded, {
            state: DataLoadState.NOT_LOADED,
            lastLoadedTimeInMs: null,
          });
          store.overrideSelector(getActivePlugin, PLUGIN_ID);
          store.overrideSelector(getActiveRunId, runId);
          store.overrideSelector(getNumExecutions, numExecutions);
          store.overrideSelector(getExecutionPageSize, pageSize);
          store.overrideSelector(getLoadedStackFrames, {});
          store.refreshState();

          action.next(triggerAction);

          expect(fetchRuns).toHaveBeenCalled();
          // Once for # of execution digests; once for the first page.
          expect(fetchExecutionDigests).toHaveBeenCalledTimes(2);
          expect(fetchExecutionData).toHaveBeenCalledTimes(1);
          expect(fetchStackFrames).toHaveBeenCalledTimes(1);
          expect(fetchGraphExecutionDigests).toHaveBeenCalledTimes(1);
          expect(fetchSourceFileList).toHaveBeenCalledTimes(1);
          expect(dispatchedActions).toEqual([
            debuggerDataPollOnset(),
            debuggerRunsRequested(),
            debuggerRunsLoaded({runs: runListingForTest}),
            numAlertsAndBreakdownRequested(),
            numAlertsAndBreakdownLoaded({
              numAlerts: numAlertsResponseForTest.num_alerts,
              alertsBreakdown: numAlertsResponseForTest.alerts_breakdown,
            }),
            numExecutionsRequested(),
            numExecutionsLoaded({numExecutions}),
            executionDigestsRequested({begin: 0, end: 2}),
            executionDigestsLoaded(executionDigestsPageResponse),
            executionDataLoaded(executionDataResponse),
            stackFramesLoaded({
              stackFrames: {
                aa: stackFrame0,
                bb: stackFrame1,
              },
            }),
            numGraphExecutionsRequested(),
            numGraphExecutionsLoaded({numGraphExecutions}),
            sourceFileListRequested(),
            sourceFileListLoaded({
              sourceFiles: twoSourceFilesForTest.map(
                ([host_name, file_path]) => ({host_name, file_path})
              ),
            }),
          ]);
        }
      );
    }

    for (const triggerAction of [
      reload(),
      manualReload(),
      changePlugin({plugin: 'hello'}),
    ]) {
      describe(`for action: ${triggerAction.type}`, () => {
        it(`ignores action when debugger plugin is not active`, () => {
          const fetchRuns = createFetchRunsSpy({});
          store.overrideSelector(getActivePlugin, 'unknown');
          store.overrideSelector(getDebuggerRunListing, {});
          store.refreshState();

          action.next(triggerAction);

          expect(fetchRuns).not.toHaveBeenCalled();
          expect(dispatchedActions).toEqual([]);
        });
      });
    }

    describe(`for action: ${changePlugin.type}`, () => {
      it(
        'fetchs runs and dispatches `debuggerDataPollOnset` if data was not ' +
          'loaded before',
        () => {
          const fetchRuns = createFetchRunsSpy({});
          store.overrideSelector(getDebuggerRunsLoaded, {
            state: DataLoadState.NOT_LOADED,
            lastLoadedTimeInMs: null,
          });
          store.overrideSelector(getActivePlugin, 'unknown');
          store.overrideSelector(getDebuggerRunListing, {});
          store.refreshState();

          action.next(changePlugin({plugin: PLUGIN_ID}));
          expect(dispatchedActions).toEqual([]);

          store.overrideSelector(getActivePlugin, PLUGIN_ID);
          store.refreshState();
          action.next(changePlugin({plugin: PLUGIN_ID}));

          expect(fetchRuns).toHaveBeenCalled();
          expect(dispatchedActions).toEqual([
            debuggerDataPollOnset(),
            debuggerRunsRequested(),
            debuggerRunsLoaded({runs: {}}),
          ]);

          store.overrideSelector(getDebuggerRunsLoaded, {
            state: DataLoadState.FAILED,
            lastLoadedTimeInMs: null,
          });
          store.refreshState();
          action.next(changePlugin({plugin: PLUGIN_ID}));

          expect(fetchRuns).toHaveBeenCalledTimes(2);
          expect(dispatchedActions).toEqual([
            debuggerDataPollOnset(),
            debuggerRunsRequested(),
            debuggerRunsLoaded({runs: {}}),
            debuggerDataPollOnset(),
            debuggerRunsRequested(),
            debuggerRunsLoaded({runs: {}}),
          ]);

          store.overrideSelector(getDebuggerRunsLoaded, {
            state: DataLoadState.FAILED,
            // non-null value means the data was loaded at least once before.
            lastLoadedTimeInMs: 3,
          });
          store.refreshState();
          action.next(changePlugin({plugin: PLUGIN_ID}));

          expect(fetchRuns).toHaveBeenCalledTimes(2);
          expect(dispatchedActions.length).toBe(6);
        }
      );

      it(
        'does not bootstrap data by fetching runs and dispatching actions when ' +
          'data is already loaded once',
        () => {
          const fetchRuns = createFetchRunsSpy({});
          store.overrideSelector(getDebuggerRunsLoaded, {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 3,
          });
          store.overrideSelector(getActivePlugin, 'unknown');
          store.overrideSelector(getDebuggerRunListing, {});
          store.refreshState();

          action.next(changePlugin({plugin: PLUGIN_ID}));
          expect(dispatchedActions).toEqual([]);

          store.overrideSelector(getActivePlugin, PLUGIN_ID);
          store.refreshState();
          action.next(changePlugin({plugin: PLUGIN_ID}));

          expect(fetchRuns).not.toHaveBeenCalled();
          expect(dispatchedActions).toEqual([]);
        }
      );
    });

    for (const dataAlreadyExists of [false, true]) {
      it(
        `executionDigestFocused loads exec data and stack frames: ` +
          `dataAlreadyExists=${dataAlreadyExists}`,
        () => {
          const scrollBeginIndex = 5;
          const displayIndexOfFocus = 1;
          store.overrideSelector(getActiveRunId, runId);
          const executionData: {[index: number]: Execution} = {
            0: createTestExecutionData(),
            1: createTestExecutionData(),
            12: createTestExecutionData(),
          };
          const executionDataOnFocus = createTestExecutionData({
            stack_frame_ids: ['aa', 'bb'],
          });
          if (dataAlreadyExists) {
            executionData[scrollBeginIndex + displayIndexOfFocus] =
              executionDataOnFocus;
          }
          store.overrideSelector(getLoadedExecutionData, executionData);
          store.overrideSelector(
            getExecutionScrollBeginIndex,
            scrollBeginIndex
          );
          store.refreshState();

          const executionDataResponse: ExecutionDataResponse = {
            begin: scrollBeginIndex + displayIndexOfFocus,
            end: scrollBeginIndex + displayIndexOfFocus + 1,
            executions: [executionDataOnFocus],
          };
          const fetchExecutionData = createFetchExecutionDataSpy(
            runId,
            scrollBeginIndex + displayIndexOfFocus,
            scrollBeginIndex + displayIndexOfFocus + 1,
            executionDataResponse
          );
          const fetchStackFrames = createFetchStackFramesSpy(
            runId,
            ['aa', 'bb'],
            {
              stack_frames: [stackFrame0, stackFrame1],
            }
          );

          action.next(
            executionDigestFocused({displayIndex: displayIndexOfFocus})
          );

          if (dataAlreadyExists) {
            // Data already exists.
            expect(fetchExecutionData).not.toHaveBeenCalled();
            expect(fetchStackFrames).not.toHaveBeenCalled();
          } else {
            expect(fetchExecutionData).toHaveBeenCalledTimes(1);
            expect(fetchStackFrames).toHaveBeenCalledTimes(1);
            expect(dispatchedActions).toEqual([
              executionDataLoaded(executionDataResponse),
              stackFramesLoaded({
                stackFrames: {
                  aa: stackFrame0,
                  bb: stackFrame1,
                },
              }),
            ]);
          }
        }
      );
    }

    for (const dataAlreadyExists of [false, true]) {
      it(
        `scrolling right triggers execution digest loading: ` +
          `dataAlreadyExists=${dataAlreadyExists}`,
        () => {
          const originalScrollBeginIndex = 50;
          const scrollBeginIndex = originalScrollBeginIndex + 1;
          const numExecutions = 100;
          const displayCount = 10;
          const pageSize = 20;
          store.overrideSelector(getActiveRunId, runId);
          store.overrideSelector(
            getExecutionScrollBeginIndex,
            scrollBeginIndex
          );
          store.overrideSelector(getNumExecutions, numExecutions);
          store.overrideSelector(getDisplayCount, displayCount);
          store.overrideSelector(getExecutionPageSize, pageSize);
          const pageLoadedSizes: {[pageIndex: number]: number} = {
            0: 20,
            1: 20,
            2: 20,
          };
          if (dataAlreadyExists) {
            pageLoadedSizes[3] = 5;
          }
          store.overrideSelector(getExecutionDigestsLoaded, {
            numExecutions,
            pageLoadedSizes,
            loadingRanges: [],
          });

          store.refreshState();

          const executionDigestsResponse: ExecutionDigestsResponse = {
            begin: 60,
            end: 60 + pageSize,
            num_digests: numExecutions,
            execution_digests: [],
          };
          for (let i = 0; i < pageSize; ++i) {
            executionDigestsResponse.execution_digests.push({
              op_type: 'FooOp',
              output_tensor_device_ids: ['d1'],
            });
          }
          const fetchExecutionDigests = createFetchExecutionDigestsSpy(
            runId,
            60,
            60 + pageSize,
            executionDigestsResponse
          );

          action.next(executionScrollRight());

          if (dataAlreadyExists) {
            expect(fetchExecutionDigests).not.toHaveBeenCalled();
            expect(dispatchedActions).toEqual([]);
          } else {
            expect(fetchExecutionDigests).toHaveBeenCalledTimes(1);
            expect(dispatchedActions).toEqual([
              executionDigestsRequested({
                begin: 60,
                end: 60 + pageSize,
              }),
              executionDigestsLoaded(executionDigestsResponse),
            ]);
          }
        }
      );
    }

    for (const dataAlreadyExists of [false, true]) {
      it(
        `scrolling left triggers execution digest loading: ` +
          `dataAlreadyExists=${dataAlreadyExists}`,
        () => {
          const originalScrollBeginIndex = 40;
          const scrollBeginIndex = originalScrollBeginIndex - 1;
          const numExecutions = 100;
          const displayCount = 10;
          const pageSize = 20;
          store.overrideSelector(getActiveRunId, runId);
          store.overrideSelector(
            getExecutionScrollBeginIndex,
            scrollBeginIndex
          );
          store.overrideSelector(getNumExecutions, numExecutions);
          store.overrideSelector(getDisplayCount, displayCount);
          store.overrideSelector(getExecutionPageSize, pageSize);
          let pageLoadedSizes: {[pageIndex: number]: number} = {};
          pageLoadedSizes = {
            0: 20,
            1: 10,
            2: 20,
          };
          if (dataAlreadyExists) {
            pageLoadedSizes[1] = 20;
          }
          store.overrideSelector(getExecutionDigestsLoaded, {
            numExecutions,
            pageLoadedSizes,
            loadingRanges: [],
          });

          store.refreshState();

          const executionDigestsResponse: ExecutionDigestsResponse = {
            begin: 20,
            end: 20 + pageSize,
            num_digests: numExecutions,
            execution_digests: [],
          };
          for (let i = 0; i < pageSize; ++i) {
            executionDigestsResponse.execution_digests.push({
              op_type: 'FooOp',
              output_tensor_device_ids: ['d1'],
            });
          }
          const fetchExecutionDigests = createFetchExecutionDigestsSpy(
            runId,
            20,
            20 + pageSize,
            executionDigestsResponse
          );

          action.next(executionScrollLeft());

          if (dataAlreadyExists) {
            expect(fetchExecutionDigests).not.toHaveBeenCalled();
            expect(dispatchSpy).not.toHaveBeenCalled();
          } else {
            expect(fetchExecutionDigests).toHaveBeenCalledTimes(1);
            expect(dispatchedActions).toEqual([
              executionDigestsRequested({
                begin: 20,
                end: 20 + pageSize,
              }),
              executionDigestsLoaded(executionDigestsResponse),
            ]);
          }
        }
      );
    }

    it('does not fetch execution digest page if currently loading', () => {
      const originalScrollBeginIndex = 40;
      const scrollBeginIndex = originalScrollBeginIndex - 1;
      const numExecutions = 100;
      const displayCount = 10;
      const pageSize = 20;
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getExecutionScrollBeginIndex, scrollBeginIndex);
      store.overrideSelector(getNumExecutions, numExecutions);
      store.overrideSelector(getDisplayCount, displayCount);
      store.overrideSelector(getExecutionPageSize, pageSize);
      let pageLoadedSizes: {[pageIndex: number]: number} = {};
      pageLoadedSizes = {
        0: 20,
        1: 10,
        2: 20,
      };
      store.overrideSelector(getExecutionDigestsLoaded, {
        numExecutions,
        pageLoadedSizes,
        loadingRanges: [
          {
            begin: 20,
            end: 20 + pageSize,
          },
        ],
      });

      store.refreshState();

      const fetchExecutionDigests = spyOn(
        TestBed.inject(Tfdbg2HttpServerDataSource),
        'fetchExecutionDigests'
      );
      action.next(executionScrollLeft());

      expect(fetchExecutionDigests).not.toHaveBeenCalled();
      expect(dispatchedActions).toEqual([]);
    });

    for (const {dataAlreadyExists, lastPageLoadedSize} of [
      {
        dataAlreadyExists: false,
        lastPageLoadedSize: 0,
      },
      {
        dataAlreadyExists: true,
        lastPageLoadedSize: 10,
      },
    ]) {
      it(
        `scrolling to execution index triggers execution digest loading: ` +
          `dataAlreadyExists=${dataAlreadyExists}`,
        () => {
          const originalScrollBeginIndex = 50;
          const newScrollBeginIndex = originalScrollBeginIndex + 2;
          const numExecutions = 100;
          const displayCount = 10;
          const pageSize = 20;
          store.overrideSelector(getActiveRunId, runId);
          store.overrideSelector(
            getExecutionScrollBeginIndex,
            newScrollBeginIndex
          );
          store.overrideSelector(getNumExecutions, numExecutions);
          store.overrideSelector(getDisplayCount, displayCount);
          store.overrideSelector(getExecutionPageSize, pageSize);
          const pageLoadedSizes: {[pageIndex: number]: number} = {
            0: 20,
            1: 20,
            2: 20,
          };
          pageLoadedSizes[3] = lastPageLoadedSize;
          store.overrideSelector(getExecutionDigestsLoaded, {
            numExecutions,
            pageLoadedSizes,
            loadingRanges: [],
          });

          store.refreshState();

          const executionDigestsResponse: ExecutionDigestsResponse = {
            begin: 60,
            end: 60 + pageSize,
            num_digests: numExecutions,
            execution_digests: new Array<ExecutionDigest>(pageSize).fill({
              op_type: 'FooOp',
              output_tensor_device_ids: ['d1'],
            }),
          };
          const fetchExecutionDigests = createFetchExecutionDigestsSpy(
            runId,
            60,
            60 + pageSize,
            executionDigestsResponse
          );

          action.next(executionScrollToIndex({index: newScrollBeginIndex}));

          if (dataAlreadyExists) {
            expect(fetchExecutionDigests).not.toHaveBeenCalled();
            expect(dispatchedActions).toEqual([]);
          } else {
            expect(fetchExecutionDigests).toHaveBeenCalledTimes(1);
            expect(dispatchedActions).toEqual([
              executionDigestsRequested({
                begin: 60,
                end: 60 + pageSize,
              }),
              executionDigestsLoaded(executionDigestsResponse),
            ]);
          }
        }
      );
    }
  });

  describe('Timer-based polling', () => {
    function createAndSubscribeToDebuggerEffects() {
      debuggerEffects = TestBed.inject(DebuggerEffects);
      debuggerEffects.loadData$.subscribe();
    }

    let fetchRuns: jasmine.Spy;
    let fetchNumExecutionDigests: jasmine.Spy;
    let fetchNumAlerts: jasmine.Spy;
    let fetchNumGraphExecutionDigests: jasmine.Spy;
    let fetchSourceFileList: jasmine.Spy;

    beforeEach(() => {
      fetchRuns = createFetchRunsSpy(runListingForTest);
      fetchNumExecutionDigests = createFetchExecutionDigestsSpy(runId, 0, 0, {
        begin: 0,
        end: 0,
        num_digests: 0,
        execution_digests: [],
      });
      fetchNumAlerts = createFetchAlertsSpy(
        runId,
        0,
        0,
        numAlertsResponseForTest
      );
      fetchNumGraphExecutionDigests = createFetchGraphExecutionDigestsSpy(
        runId,
        0,
        0,
        {
          begin: 0,
          end: 0,
          num_digests: 0,
          graph_execution_digests: [],
        }
      );
      fetchSourceFileList = createFetchSourceFileListSpy(runId, [
        ['localhost', '/tmp/main.py'],
      ]);
    });

    it('triggers polling after first polling interval', fakeAsync(() => {
      createAndSubscribeToDebuggerEffects();
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getDebuggerRunListing, runListingForTest);
      store.refreshState();
      action.next(debuggerLoaded());
      expect(fetchRuns).toHaveBeenCalledTimes(1);
      expect(fetchNumExecutionDigests).toHaveBeenCalledTimes(1);
      expect(fetchNumAlerts).toHaveBeenCalledTimes(1);
      expect(fetchNumGraphExecutionDigests).toHaveBeenCalledTimes(1);
      expect(fetchSourceFileList).toHaveBeenCalledTimes(1);

      tick(2000); // Wait for the polling interval.
      action.next(debuggerUnloaded());
      expect(fetchRuns).toHaveBeenCalledTimes(2);
      expect(fetchNumExecutionDigests).toHaveBeenCalledTimes(2);
      expect(fetchNumAlerts).toHaveBeenCalledTimes(2);
      expect(fetchNumGraphExecutionDigests).toHaveBeenCalledTimes(2);
      expect(fetchSourceFileList).toHaveBeenCalledTimes(2);
    }));
  });

  describe('graphExecutionScrollToIndex', () => {
    beforeEach(() => {
      createAndSubscribeToDebuggerEffectsWithEmptyRepeater();
    });

    for (const {dataExists, page3Size, loadingPages} of [
      {dataExists: false, page3Size: 0, loadingPages: [3]},
      {dataExists: false, page3Size: 0, loadingPages: []},
      {dataExists: true, page3Size: 2, loadingPages: []},
    ]) {
      it(
        `triggers GraphExecution loading: dataExists=${dataExists}, ` +
          `loadingPages=${JSON.stringify(loadingPages)}`,
        fakeAsync(() => {
          const runId = '__default_debugger_run__';
          const originalScrollBeginIndex = 50;
          const newScrollBeginIndex = originalScrollBeginIndex + 2;
          const numGraphExecutions = 100;
          const pageSize = 20;
          const displayCount = 10;
          store.overrideSelector(getActiveRunId, runId);
          store.overrideSelector(getNumGraphExecutions, numGraphExecutions);
          store.overrideSelector(
            getGraphExecutionScrollBeginIndex,
            newScrollBeginIndex
          );
          store.overrideSelector(getGraphExecutionPageSize, pageSize);
          store.overrideSelector(getGraphExecutionDisplayCount, displayCount);
          store.overrideSelector(getExecutionPageSize, pageSize);
          store.overrideSelector(
            getGraphExecutionDataLoadingPages,
            loadingPages
          );
          const pageLoadedSizes: {[pageIndex: number]: number} = {
            0: 20,
            1: 20,
            2: 20,
          };
          pageLoadedSizes[3] = page3Size;
          store.overrideSelector(
            getGraphExecutionDataPageLoadedSizes,
            pageLoadedSizes
          );
          store.refreshState();

          const graphExecutions = new Array<GraphExecution>(pageSize).fill(
            createTestGraphExecution()
          );
          const graphExecutionDataResponse: GraphExecutionDataResponse = {
            begin: 60,
            end: 60 + pageSize,
            graph_executions: graphExecutions,
          };
          const fetchExecutionData = createFetchGraphExecutionDataSpy(
            runId,
            60,
            60 + pageSize,
            graphExecutionDataResponse
          );

          action.next(
            graphExecutionScrollToIndex({index: newScrollBeginIndex})
          );
          tick(100);

          if (dataExists || loadingPages.length > 0) {
            expect(fetchExecutionData).not.toHaveBeenCalled();
            expect(dispatchedActions).toEqual([]);
          } else {
            expect(fetchExecutionData).toHaveBeenCalledTimes(1);
            expect(dispatchedActions).toEqual([
              graphExecutionDataRequested({pageIndex: 3}),
              graphExecutionDataLoaded({
                begin: 60,
                end: 60 + pageSize,
                graph_executions: graphExecutions,
              }),
            ]);
          }
        })
      );
    }
  });

  describe('load alerts of given type', () => {
    const runId = '__default_debugger_run__';
    const alert0 = createTestInfNanAlert({
      op_type: 'Op0',
      execution_index: 10,
    });
    const alert1 = createTestInfNanAlert({
      op_type: 'Op1',
      execution_index: 11,
    });
    const alertsResponseForTest: AlertsResponse = {
      num_alerts: 2,
      alerts_breakdown: {
        [AlertType.INF_NAN_ALERT]: 2,
      },
      begin: 0,
      end: 2,
      alert_type: AlertType.INF_NAN_ALERT,
      per_type_alert_limit: 1000,
      alerts: [alert0, alert1],
    };
    const execDigest08 = createTestExecutionDigest();
    const execDigest09 = createTestExecutionDigest();
    const execDigest10 = createTestExecutionDigest();
    const execDigest11 = createTestExecutionDigest();

    beforeEach(() => {
      createAndSubscribeToDebuggerEffectsWithEmptyRepeater();
    });

    it('fetches alerts and execution digest page if data is missing', () => {
      const fetchInfNanAlerts = createFetchAlertsSpy(
        runId,
        0,
        -1,
        alertsResponseForTest,
        AlertType.INF_NAN_ALERT
      );
      const numExecutions = 100;
      const fetchExecutionDigests = createFetchExecutionDigestsSpy(
        runId,
        8,
        12,
        {
          begin: 8,
          end: 12,
          num_digests: numExecutions,
          execution_digests: [
            execDigest08,
            execDigest09,
            execDigest10,
            execDigest11,
          ],
        }
      );
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getAlertsFocusType, AlertType.INF_NAN_ALERT);
      store.overrideSelector(getNumAlertsOfFocusedType, 2);
      store.overrideSelector(getLoadedAlertsOfFocusedType, null);
      store.overrideSelector(getAlertsLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      store.overrideSelector(getExecutionPageSize, 4);
      store.overrideSelector(getDisplayCount, 2);
      store.overrideSelector(getExecutionScrollBeginIndex, 0);
      store.overrideSelector(getNumExecutions, numExecutions);
      store.overrideSelector(getExecutionDigestsLoaded, {
        numExecutions,
        pageLoadedSizes: {},
        loadingRanges: [],
      });

      store.refreshState();

      action.next(
        alertTypeFocusToggled({
          alertType: AlertType.INF_NAN_ALERT,
        })
      );
      expect(fetchInfNanAlerts).toHaveBeenCalledTimes(1);
      expect(fetchExecutionDigests).toHaveBeenCalledTimes(1);
      expect(dispatchedActions).toEqual([
        numAlertsAndBreakdownRequested(),
        alertsOfTypeLoaded({
          numAlerts: 2,
          alertsBreakdown: {
            [AlertType.INF_NAN_ALERT]: 2,
          },
          begin: 0,
          end: 2,
          alertType: AlertType.INF_NAN_ALERT,
          alerts: [alert0, alert1],
        }),
        executionDigestsRequested({
          begin: 8,
          end: 12,
        }),
        executionDigestsLoaded({
          num_digests: numExecutions,
          begin: 8,
          end: 12,
          execution_digests: [
            execDigest08,
            execDigest09,
            execDigest10,
            execDigest11,
          ],
        }),
      ]);
    });

    it('does not fetch execution digest page if execution digests are loaded', () => {
      const fetchInfNanAlerts = createFetchAlertsSpy(
        runId,
        0,
        -1,
        alertsResponseForTest,
        AlertType.INF_NAN_ALERT
      );
      const numExecutions = 100;
      const fetchExecutionDigests = createFetchExecutionDigestsSpy(
        runId,
        8,
        12,
        {
          begin: 8,
          end: 12,
          num_digests: numExecutions,
          execution_digests: [
            execDigest08,
            execDigest09,
            execDigest10,
            execDigest11,
          ],
        }
      );
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getAlertsFocusType, AlertType.INF_NAN_ALERT);
      store.overrideSelector(getNumAlertsOfFocusedType, 2);
      store.overrideSelector(getLoadedAlertsOfFocusedType, null);
      store.overrideSelector(getAlertsLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      store.overrideSelector(getExecutionPageSize, 4);
      store.overrideSelector(getDisplayCount, 2);
      store.overrideSelector(getExecutionScrollBeginIndex, 0);
      store.overrideSelector(getNumExecutions, numExecutions);
      store.overrideSelector(getExecutionDigestsLoaded, {
        numExecutions,
        pageLoadedSizes: {
          2: 4, // The page of eecution digest has already been loaded.
        },
        loadingRanges: [],
      });

      store.refreshState();

      action.next(
        alertTypeFocusToggled({
          alertType: AlertType.INF_NAN_ALERT,
        })
      );
      expect(fetchInfNanAlerts).toHaveBeenCalledTimes(1);
      expect(fetchExecutionDigests).not.toHaveBeenCalled();
      expect(dispatchedActions).toEqual([
        numAlertsAndBreakdownRequested(),
        alertsOfTypeLoaded({
          numAlerts: 2,
          alertsBreakdown: {
            [AlertType.INF_NAN_ALERT]: 2,
          },
          begin: 0,
          end: 2,
          alertType: AlertType.INF_NAN_ALERT,
          alerts: [alert0, alert1],
        }),
      ]);
    });

    it('does not fetch alerts when alerts are already loaded', () => {
      const fetchAlerts = spyOn(
        TestBed.inject(Tfdbg2HttpServerDataSource),
        'fetchAlerts'
      );
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getAlertsFocusType, AlertType.INF_NAN_ALERT);
      store.overrideSelector(getNumAlertsOfFocusedType, 2);
      store.overrideSelector(getLoadedAlertsOfFocusedType, {
        0: alert0,
        1: alert1,
      });
      store.overrideSelector(getAlertsLoaded, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 1234,
      });
      store.refreshState();

      action.next(
        alertTypeFocusToggled({
          alertType: AlertType.INF_NAN_ALERT,
        })
      );
      expect(fetchAlerts).not.toHaveBeenCalled();
      expect(dispatchedActions).toEqual([]);
    });

    it('does not fetch alerts when alert type focus is set to null', () => {
      const fetchAlerts = spyOn(
        TestBed.inject(Tfdbg2HttpServerDataSource),
        'fetchAlerts'
      );
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getAlertsFocusType, null);
      store.overrideSelector(getNumAlertsOfFocusedType, 3);
      store.overrideSelector(getLoadedAlertsOfFocusedType, {
        0: alert0,
        1: alert1,
      });
      store.overrideSelector(getAlertsLoaded, {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 1234,
      });
      store.refreshState();

      action.next(
        alertTypeFocusToggled({
          alertType: AlertType.INF_NAN_ALERT,
        })
      );
      expect(fetchAlerts).not.toHaveBeenCalled();
      expect(dispatchedActions).toEqual([]);
    });
  });

  describe('loading source file content', () => {
    const fileSpecA: SourceFileSpec = {
      host_name: 'localhost',
      file_path: '/home/user/main.py',
    };
    const fileSpecB: SourceFileSpec = {
      host_name: 'localhost',
      file_path: '/home/user/train.py',
    };
    const fileSpecC: SourceFileSpec = {
      host_name: 'localhost',
      file_path: '/home/user/model.py',
    };

    function unloadedSourceFileContent(): SourceFileContent {
      return {
        loadState: DataLoadState.NOT_LOADED,
        lines: null,
      };
    }

    function createFetchSourceFileSpy(
      runId: string,
      fileIndex: number,
      hostName: string,
      filePath: string,
      lines: string[]
    ) {
      return spyOn(
        TestBed.inject(Tfdbg2HttpServerDataSource),
        'fetchSourceFile'
      )
        .withArgs(runId, fileIndex)
        .and.returnValue(
          of({
            host_name: hostName,
            file_path: filePath,
            lines,
          })
        );
    }

    beforeEach(() => {
      createAndSubscribeToDebuggerEffectsWithEmptyRepeater();
    });

    it('loads the content of a known file', () => {
      const runId = '__default_debugger_run__';
      const fileIndex = 2;
      const fileContentC: SourceFileResponse = {
        ...fileSpecC,
        lines: ['import tensorflow as tf', '', 'x = tf.constant(1)'],
      };
      const fetchSourceFileSpy = createFetchSourceFileSpy(
        runId,
        fileIndex,
        fileContentC.host_name,
        fileContentC.file_path,
        fileContentC.lines
      );
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getSourceFileList, [
        fileSpecA,
        fileSpecB,
        fileSpecC,
      ]);
      store.overrideSelector(getFocusedSourceFileIndex, fileIndex);
      store.overrideSelector(getFocusedSourceFileContent, {
        loadState: DataLoadState.NOT_LOADED,
        lines: null,
      });
      store.refreshState();

      action.next(
        sourceLineFocused({
          stackFrame: {
            ...fileSpecC,
            lineno: 42,
            function_name: 'foo',
          },
        })
      );

      expect(fetchSourceFileSpy).toHaveBeenCalledTimes(1);
      expect(dispatchedActions).toEqual([
        sourceFileRequested(fileSpecC),
        sourceFileLoaded(fileContentC),
      ]);
    });

    for (const {loadState, loadStateName} of [
      {
        loadState: DataLoadState.LOADED,
        loadStateName: 'LOADED',
      },
      {
        loadState: DataLoadState.LOADING,
        loadStateName: 'LOADING',
      },
    ]) {
      it(`skips loading when file state is ${loadStateName}`, () => {
        const runId = '__default_debugger_run__';
        const fileIndex = 2;
        const fileContentC: SourceFileResponse = {
          ...fileSpecC,
          lines: [''],
        };
        const fetchSourceFileSpy = createFetchSourceFileSpy(
          runId,
          fileIndex,
          fileContentC.host_name,
          fileContentC.file_path,
          fileContentC.lines
        );
        store.overrideSelector(getActiveRunId, runId);
        store.overrideSelector(getSourceFileList, [
          fileSpecA,
          fileSpecB,
          fileSpecC,
        ]);
        store.overrideSelector(getFocusedSourceFileIndex, fileIndex);
        store.overrideSelector(getFocusedSourceFileContent, {
          loadState,
          lines: null,
        });
        store.refreshState();

        action.next(
          sourceLineFocused({
            stackFrame: {
              ...fileSpecC,
              lineno: 42,
              function_name: 'foo',
            },
          })
        );

        // Due to the LOADED or LOADING state of the file, no request should
        // have been made for the content of the file.
        expect(fetchSourceFileSpy).not.toHaveBeenCalled();
        expect(dispatchedActions).toEqual([]);
      });
    }

    it('does not load a file being loaded', () => {
      const runId = '__default_debugger_run__';
      const fileIndex = 2;
      const fetchSourceFileSpy = createFetchSourceFileSpy(
        runId,
        fileIndex,
        fileSpecC.host_name,
        fileSpecC.file_path,
        []
      );
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getSourceFileList, [
        fileSpecA,
        fileSpecB,
        fileSpecC,
      ]);
      const fileCContent = unloadedSourceFileContent();
      fileCContent.loadState = DataLoadState.LOADING;
      store.overrideSelector(getFocusedSourceFileIndex, fileIndex);
      store.overrideSelector(getFocusedSourceFileContent, {
        loadState: DataLoadState.LOADING,
        lines: null,
      });
      store.refreshState();

      action.next(
        sourceLineFocused({
          stackFrame: {
            ...fileSpecC,
            lineno: 42,
            function_name: 'foo',
          },
        })
      );

      expect(fetchSourceFileSpy).not.toHaveBeenCalled();
      expect(dispatchedActions).toEqual([]);
    });
  });

  describe('loading graph op info', () => {
    const runId = '__default_debugger_run__';

    const graphOpInfoResponse = createTestGraphOpInfo({
      op_name: 'namespace_1/op1',
      graph_ids: ['g1', 'g2'],
      stack_frame_ids: ['aaa1', 'bbb2'],
    });
    const stackFrame0 = createTestStackFrame();
    const stackFrame1 = createTestStackFrame();

    beforeEach(() => {
      createAndSubscribeToDebuggerEffectsWithEmptyRepeater();
    });

    for (const testAction of [
      graphOpFocused({
        graph_id: 'g2',
        op_name: 'namespace_1/op_1',
      }),
      graphExecutionFocused({
        index: 42,
        graph_id: 'g2',
        op_name: 'namespace_1/op_1',
      }),
    ] as Action[]) {
      it(
        `fetches missing op and missing stack frames: ` +
          `action: ${testAction.type}`,
        () => {
          const fetchGraphOpInfo = createFetchGraphOpInfoSpy(
            runId,
            'g2',
            'namespace_1/op_1',
            graphOpInfoResponse
          );
          const fetchStackFrames = createFetchStackFramesSpy(
            runId,
            ['aaa1', 'bbb2'],
            {
              stack_frames: [stackFrame0, stackFrame1],
            }
          );
          store.overrideSelector(getActiveRunId, runId);
          store.overrideSelector(getLoadingGraphOps, {
            g2: new Map([['other_op', DataLoadState.LOADED]]),
          });
          store.overrideSelector(getLoadedStackFrames, {});
          store.refreshState();

          action.next(testAction);

          expect(fetchGraphOpInfo).toHaveBeenCalledTimes(1);
          expect(fetchStackFrames).toHaveBeenCalledTimes(1);
          expect(dispatchedActions).toEqual([
            graphOpInfoRequested({graph_id: 'g2', op_name: 'namespace_1/op_1'}),
            graphOpInfoLoaded({graphOpInfoResponse}),
            stackFramesLoaded({
              stackFrames: {
                aaa1: stackFrame0,
                bbb2: stackFrame1,
              },
            }),
          ]);
        }
      );

      for (const opLoadState of [DataLoadState.LOADING, DataLoadState.LOADED]) {
        it(
          `skips a loading or loaded op:  state=${opLoadState}, ` +
            `action=${testAction.type}`,
          () => {
            store.overrideSelector(getActiveRunId, runId);
            store.overrideSelector(getLoadingGraphOps, {
              g2: new Map([['namespace_1/op_1', opLoadState]]),
            });
            store.refreshState();

            action.next(testAction);
            // No action should have been dispatched.
            expect(dispatchedActions).toEqual([]);
          }
        );
      }

      it(
        `skips subset of stack frames that are already loaded: ` +
          `action=${testAction.type}`,
        () => {
          const fetchGraphOpInfo = createFetchGraphOpInfoSpy(
            runId,
            'g2',
            'namespace_1/op_1',
            graphOpInfoResponse
          );
          const fetchStackFrames = createFetchStackFramesSpy(runId, ['aaa1'], {
            stack_frames: [stackFrame0],
          });
          store.overrideSelector(getActiveRunId, runId);
          store.overrideSelector(getLoadingGraphOps, {
            g2: new Map([['other_op', DataLoadState.LOADED]]),
          });
          // The second stack frame is already loaded.
          store.overrideSelector(getLoadedStackFrames, {
            bbb2: stackFrame1,
          });
          store.refreshState();

          action.next(testAction);

          expect(fetchGraphOpInfo).toHaveBeenCalledTimes(1);
          expect(fetchStackFrames).toHaveBeenCalledTimes(1);
          expect(dispatchedActions).toEqual([
            graphOpInfoRequested({graph_id: 'g2', op_name: 'namespace_1/op_1'}),
            graphOpInfoLoaded({graphOpInfoResponse}),
            // Only the first (missing) stack frame should have been loaded.
            stackFramesLoaded({
              stackFrames: {
                aaa1: stackFrame0,
              },
            }),
          ]);
        }
      );
    }
  });
});
