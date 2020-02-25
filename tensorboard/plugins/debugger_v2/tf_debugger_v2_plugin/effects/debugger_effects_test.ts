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
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of, ReplaySubject} from 'rxjs';
import {
  alertTypeFocusToggled,
  debuggerLoaded,
  debuggerRunsLoaded,
  debuggerRunsRequested,
  executionDataLoaded,
  executionDigestFocused,
  executionDigestsLoaded,
  executionDigestsRequested,
  executionScrollLeft,
  executionScrollRight,
  numAlertsAndBreakdownRequested,
  numAlertsAndBreakdownLoaded,
  numExecutionsLoaded,
  numExecutionsRequested,
  stackFramesLoaded,
  alertsOfTypeLoaded,
} from '../actions';
import {
  AlertsResponse,
  ExecutionDataResponse,
  ExecutionDigestsResponse,
  StackFramesResponse,
  Tfdbg2HttpServerDataSource,
} from '../data_source/tfdbg2_data_source';
import {
  getActiveRunId,
  getAlertsFocusType,
  getDebuggerRunListing,
  getNumAlertsOfFocusedType,
  getNumExecutionsLoaded,
  getNumExecutions,
  getDisplayCount,
  getExecutionDigestsLoaded,
  getExecutionPageSize,
  getExecutionScrollBeginIndex,
  getLoadedAlertsOfFocusedType,
  getLoadedExecutionData,
  getLoadedStackFrames,
  getAlertsLoaded,
} from '../store';
import {
  AlertType,
  DataLoadState,
  DebuggerRunListing,
  Execution,
  ExecutionDigest,
  State,
} from '../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createTestExecutionData,
  createTestStackFrame,
  createTestInfNanAlert,
  createTestExecutionDigest,
} from '../testing';
import {TBHttpClientTestingModule} from '../../../../webapp/webapp_data_source/tb_http_client_testing';

import {DebuggerEffects, TEST_ONLY} from './debugger_effects';

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
    }).compileComponents();
    debuggerEffects = TestBed.get(DebuggerEffects);

    store = TestBed.get(Store);
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
  });

  function createFetchAlertsSpy(
    runId: string,
    begin: number,
    end: number,
    alertsResponse: AlertsResponse,
    alert_type?: string
  ) {
    if (alert_type === undefined) {
      return spyOn(TestBed.get(Tfdbg2HttpServerDataSource), 'fetchAlerts')
        .withArgs(runId, begin, end)
        .and.returnValue(of(alertsResponse));
    } else {
      return spyOn(TestBed.get(Tfdbg2HttpServerDataSource), 'fetchAlerts')
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
      TestBed.get(Tfdbg2HttpServerDataSource),
      'fetchExecutionDigests'
    )
      .withArgs(runId, begin, end)
      .and.returnValue(of(excutionDigestsResponse));
  }

  describe('loadData', () => {
    const runListingForTest: DebuggerRunListing = {
      __default_debugger_run__: {
        start_time: 1337,
      },
    };

    function createFetchRunsSpy(runsListing: DebuggerRunListing) {
      return spyOn(TestBed.get(Tfdbg2HttpServerDataSource), 'fetchRuns')
        .withArgs()
        .and.returnValue(of(runsListing));
    }

    const numAlertsResponseForTest: AlertsResponse = {
      begin: 0,
      end: 0,
      num_alerts: 0,
      alerts_breakdown: {},
      alerts: [],
      per_type_alert_limit: 1000,
    };

    function createFetchExecutionDataSpy(
      runId: string,
      begin: number,
      end: number,
      response: ExecutionDataResponse
    ) {
      return spyOn(
        TestBed.get(Tfdbg2HttpServerDataSource),
        'fetchExecutionData'
      )
        .withArgs(runId, begin, end)
        .and.returnValue(of(response));
    }

    function createFetchStackFramesSpy(stackFrames: StackFramesResponse) {
      return spyOn(
        TestBed.get(Tfdbg2HttpServerDataSource),
        'fetchStackFrames'
      ).and.returnValue(of(stackFrames));
    }

    const runId = '__default_debugger_run__';
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
    const stackFrame0 = createTestStackFrame();
    const stackFrame1 = createTestStackFrame();

    function createFetchSpies() {
      const fetchRuns = createFetchRunsSpy(runListingForTest);
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
      const fetchExecutionData = createFetchExecutionDataSpy(
        runId,
        0,
        1,
        executionDataResponse
      );
      const fetchStackFrames = createFetchStackFramesSpy({
        stack_frames: [stackFrame0, stackFrame1],
      });
      return {
        fetchRuns,
        fetchNumAlertsSpy,
        fetchExecutionDigests,
        fetchExecutionData,
        fetchStackFrames,
      };
    }

    beforeEach(() => {
      debuggerEffects.loadData$.subscribe();
    });

    it('run list loading: empty runs', () => {
      const fetchRuns = createFetchRunsSpy({});
      store.overrideSelector(getDebuggerRunListing, {});

      action.next(debuggerLoaded());

      expect(fetchRuns).toHaveBeenCalled();
      expect(dispatchedActions).toEqual([
        debuggerRunsRequested(),
        debuggerRunsLoaded({runs: {}}),
      ]);
    });

    it('loads numExecutions when there is a run: empty executions', () => {
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
      store.overrideSelector(getDebuggerRunListing, runListingForTest);
      store.overrideSelector(getNumExecutionsLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      store.refreshState();

      action.next(debuggerLoaded());

      expect(fetchRuns).toHaveBeenCalled();
      expect(fetchNumExecutionDigests).toHaveBeenCalled();
      expect(fetchNumAlerts).toHaveBeenCalled();
      expect(dispatchedActions).toEqual([
        debuggerRunsRequested(),
        debuggerRunsLoaded({runs: runListingForTest}),
        numAlertsAndBreakdownRequested(),
        numAlertsAndBreakdownLoaded({
          numAlerts: numAlertsResponseForTest.num_alerts,
          alertsBreakdown: numAlertsResponseForTest.alerts_breakdown,
        }),
        numExecutionsRequested(),
        numExecutionsLoaded({numExecutions: 0}),
      ]);
    });

    it('loads execution digests, data & stack trace loading if numExecutions>0', () => {
      const {
        fetchRuns,
        fetchExecutionDigests,
        fetchExecutionData,
        fetchStackFrames,
      } = createFetchSpies();
      store.overrideSelector(getDebuggerRunListing, runListingForTest);
      store.overrideSelector(getNumExecutionsLoaded, {
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
      });
      store.overrideSelector(getActiveRunId, runId);
      store.overrideSelector(getNumExecutions, numExecutions);
      store.overrideSelector(getExecutionPageSize, pageSize);
      store.overrideSelector(getLoadedStackFrames, {});
      store.refreshState();

      action.next(debuggerLoaded());

      expect(fetchRuns).toHaveBeenCalled();
      // Once for # of execution digests; once for the first page.
      expect(fetchExecutionDigests).toHaveBeenCalledTimes(2);
      expect(fetchExecutionData).toHaveBeenCalledTimes(1);
      expect(fetchStackFrames).toHaveBeenCalledTimes(1);
      expect(dispatchedActions).toEqual([
        debuggerRunsRequested(),
        debuggerRunsLoaded({runs: runListingForTest}),
        numAlertsAndBreakdownRequested(),
        numAlertsAndBreakdownLoaded({
          numAlerts: numAlertsResponseForTest.num_alerts,
          alertsBreakdown: numAlertsResponseForTest.alerts_breakdown,
        }),
        numExecutionsRequested(),
        numExecutionsLoaded({numExecutions}),
        executionDigestsRequested(),
        executionDigestsLoaded(executionDigestsPageResponse),
        executionDataLoaded(executionDataResponse),
        stackFramesLoaded({stackFrames: {aa: stackFrame0, bb: stackFrame1}}),
      ]);
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
            executionData[
              scrollBeginIndex + displayIndexOfFocus
            ] = executionDataOnFocus;
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
          const fetchStackFrames = createFetchStackFramesSpy({
            stack_frames: [stackFrame0, stackFrame1],
          });

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
                stackFrames: {aa: stackFrame0, bb: stackFrame1},
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
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1234,
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
              executionDigestsRequested(),
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
          const dataAlreadyExists = false;
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
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: 1234,
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
              executionDigestsRequested(),
              executionDigestsLoaded(executionDigestsResponse),
            ]);
          }
        }
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
      debuggerEffects.loadData$.subscribe();
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
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
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
        executionDigestsRequested(),
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
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 1234,
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
        TestBed.get(Tfdbg2HttpServerDataSource),
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
        TestBed.get(Tfdbg2HttpServerDataSource),
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
});
