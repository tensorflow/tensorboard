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

import {
  createAlertsState,
  createDebuggerExecutionsState,
  createDebuggerGraphExecutionsState,
  createDebuggerGraphsState,
  createDebuggerSourceCodeState,
  createDebuggerState,
  createState,
  createTestExecutionData,
  createTestExecutionDigest,
  createTestGraphExecution,
  createTestGraphOpInfo,
  createTestInfNanAlert,
  createTestStackFrame,
} from '../testing';
import {
  getAlertsBreakdown,
  getAlertsFocusType,
  getAlertsLoaded,
  getCodeLocationOrigin,
  getFocusAlertTypesOfVisibleExecutionDigests,
  getFocusedExecutionData,
  getFocusedExecutionIndex,
  getFocusedGraphExecutionInputIndices,
  getFocusedGraphOpConsumers,
  getFocusedGraphOpInfo,
  getFocusedGraphOpInputs,
  getFocusedSourceFileContent,
  getFocusedSourceFileIndex,
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
  getGraphExecutionData,
  getGraphExecutionDataLoadingPages,
  getGraphExecutionDataPageLoadedSizes,
  getGraphExecutionDisplayCount,
  getGraphExecutionFocusIndex,
  getGraphExecutionPageSize,
  getGraphExecutionScrollBeginIndex,
  getLoadedAlertsOfFocusedType,
  getLoadingGraphOps,
  getNumAlerts,
  getNumAlertsOfFocusedType,
  getNumGraphExecutions,
  getNumGraphExecutionsLoaded,
  getPollSilenceTimeMs,
  getSourceFileList,
  getSourceFileListLoaded,
} from './debugger_selectors';
import {
  AlertType,
  CodeLocationType,
  DataLoadState,
  DEBUGGER_FEATURE_KEY,
  StackFrame,
} from './debugger_types';

describe('debugger selectors', () => {
  describe('getPollSilenceTimeMs', () => {
    it('returns correct zero value for initial state', () => {
      const state = createState(
        createDebuggerState({
          lastDataPollOnsetTimeMs: -1,
          lastNonEmptyPollDataTimeMs: -1,
        })
      );
      expect(getPollSilenceTimeMs(state)).toBe(0);
    });

    it('returns correct positive value: no data yet', () => {
      const state = createState(
        createDebuggerState({
          lastDataPollOnsetTimeMs: 1234,
          lastNonEmptyPollDataTimeMs: -1,
        })
      );
      expect(getPollSilenceTimeMs(state)).toBe(1235);
    });

    it('returns correct positive value: has been data', () => {
      const state = createState(
        createDebuggerState({
          lastDataPollOnsetTimeMs: 1234,
          lastNonEmptyPollDataTimeMs: 1000,
        })
      );
      expect(getPollSilenceTimeMs(state)).toBe(234);
    });
  });

  describe('getAlertsLoaded', () => {
    it('returns correct NOT_LOADED state', () => {
      const state = createState(createDebuggerState());
      const alertsLoaded = getAlertsLoaded(state);
      expect(alertsLoaded.state).toBe(DataLoadState.NOT_LOADED);
      expect(alertsLoaded.lastLoadedTimeInMs).toBe(null);
    });

    it('returns correct LOADING state', () => {
      const state = createState(
        createDebuggerState({
          alerts: createAlertsState({
            alertsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
          }),
        })
      );
      const alertsLoaded = getAlertsLoaded(state);
      expect(alertsLoaded.state).toBe(DataLoadState.LOADING);
      expect(alertsLoaded.lastLoadedTimeInMs).toBe(null);
    });
  });

  describe('getAlertsFocusType', () => {
    it('returns correct null state', () => {
      const state = createState(createDebuggerState());
      expect(getAlertsFocusType(state)).toBeNull();
    });

    it('returns correct non-null state', () => {
      const state = createState(
        createDebuggerState({
          alerts: createAlertsState({
            focusType: AlertType.INF_NAN_ALERT,
          }),
        })
      );
      expect(getAlertsFocusType(state)).toBe(AlertType.INF_NAN_ALERT);
    });
  });

  describe('getNumAlertsOfFocusedType', () => {
    for (const {focusType, expectedNumAlertsOfFocusedType} of [
      {
        focusType: null,
        expectedNumAlertsOfFocusedType: 0,
      },
      {
        focusType: AlertType.INF_NAN_ALERT,
        expectedNumAlertsOfFocusedType: 2,
      },
    ]) {
      it(`returns correct number of alerts in focus: focusType=${focusType}`, () => {
        const state = createState(
          createDebuggerState({
            alerts: createAlertsState({
              numAlerts: 2,
              focusType,
              alertsBreakdown: {
                [AlertType.INF_NAN_ALERT]: 2,
              },
              // NOTE: `alerts` is left blank here, to test that the return value of
              // getNumAlertsOfFocusedType() shouldn't depend on `alerts`, it should
              // depend on only `alertsBreakdown`.
            }),
          })
        );
        const numAlertsOfFocusedType = getNumAlertsOfFocusedType(state);
        expect(numAlertsOfFocusedType).toBe(expectedNumAlertsOfFocusedType);
      });
    }
  });

  describe('getLoadedAlertsOfFocusedType', () => {
    const alert0 = createTestInfNanAlert();
    const alert1 = createTestInfNanAlert();

    it('returns correct null when there is no focus', () => {
      const state = createState(
        createDebuggerState({
          alerts: createAlertsState({
            numAlerts: 2,
            focusType: null,
            alerts: {
              [AlertType.INF_NAN_ALERT]: {
                0: alert0,
                1: alert1,
              },
            },
          }),
        })
      );
      const loadedAlertsOfFocus = getLoadedAlertsOfFocusedType(state);
      expect(loadedAlertsOfFocus).toBeNull();
    });

    it('returns correct result when focus and data both exist', () => {
      const state = createState(
        createDebuggerState({
          alerts: createAlertsState({
            numAlerts: 2,
            focusType: AlertType.INF_NAN_ALERT,
            alerts: {
              [AlertType.INF_NAN_ALERT]: {
                0: alert0,
                1: alert1,
              },
            },
          }),
        })
      );
      const loadedAlertsOfFocus = getLoadedAlertsOfFocusedType(state);
      expect(loadedAlertsOfFocus).toEqual({
        0: alert0,
        1: alert1,
      });
    });
  });

  describe('getNumAlerts', () => {
    it('Returns correct zero numAlerts', () => {
      const state = createState(createDebuggerState());
      expect(getNumAlerts(state)).toBe(0);
    });

    it('Returns correct non-zero numAlerts', () => {
      const state = createState(
        createDebuggerState({
          alerts: createAlertsState({
            numAlerts: 95,
          }),
        })
      );
      expect(getNumAlerts(state)).toBe(95);
    });
  });

  describe('getAlertsBreakdown', () => {
    it('Returns correct empty object for initial state', () => {
      const state = createState(createDebuggerState());
      expect(getAlertsBreakdown(state)).toEqual({});
    });

    it('Returns correct non-empty map', () => {
      const state = createState(
        createDebuggerState({
          alerts: createAlertsState({
            numAlerts: 95,
            alertsBreakdown: {
              InfNanAlert: 50,
              FooAlert: 30,
              BarAlert: 15,
            },
          }),
        })
      );
      expect(getAlertsBreakdown(state)).toEqual({
        InfNanAlert: 50,
        FooAlert: 30,
        BarAlert: 15,
      });
    });
  });

  describe('getAlertTypesOfVisibleExecutionDigests', () => {
    it('returns all-null array when there is no focused alert type', () => {
      const state = createState(
        createDebuggerState({
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 0,
            },
            pageSize: 1000,
            displayCount: 3,
            focusIndex: null,
            scrollBeginIndex: 0,
            executionDigests: {
              0: createTestExecutionDigest(),
              1: createTestExecutionDigest(),
              2: createTestExecutionDigest(),
            },
            executionData: {},
          },
        })
      );

      const alertTypes = getFocusAlertTypesOfVisibleExecutionDigests(state);
      expect(alertTypes).toEqual([null, null, null]);
    });

    it('returns correct non-null array when there is focused alert type', () => {
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          alerts: createAlertsState({
            focusType: AlertType.INF_NAN_ALERT,
            executionIndices: {
              [AlertType.INF_NAN_ALERT]: [0, 2, 3],
            },
          }),
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 0,
            },
            pageSize: 1000,
            displayCount: 3,
            focusIndex: null,
            scrollBeginIndex: 0,
            executionDigests: {
              0: createTestExecutionDigest(),
              1: createTestExecutionDigest(),
              2: createTestExecutionDigest(),
              3: createTestExecutionDigest(),
            },
            executionData: {},
          },
        })
      );

      const alertTypes = getFocusAlertTypesOfVisibleExecutionDigests(state);
      expect(alertTypes).toEqual([
        AlertType.INF_NAN_ALERT,
        null,
        AlertType.INF_NAN_ALERT,
      ]);
    });
  });

  describe('getFocusedExecutionIndex', () => {
    for (const focusIndex of [null, 0, 1]) {
      it(`returns null correctly: focusIndex=${focusIndex}`, () => {
        const state = createState(
          createDebuggerState({
            activeRunId: '__default_debugger_run__',
            executions: {
              numExecutionsLoaded: {
                state: DataLoadState.LOADING,
                lastLoadedTimeInMs: null,
              },
              executionDigestsLoaded: {
                loadingRanges: [],
                pageLoadedSizes: {},
                numExecutions: 0,
              },
              pageSize: 1000,
              displayCount: 50,
              focusIndex,
              scrollBeginIndex: 0,
              executionDigests: {},
              executionData: {},
            },
          })
        );
        expect(getFocusedExecutionIndex(state)).toBe(focusIndex);
      });
    }
  });

  describe('getFocusedExecutionData', () => {
    it('returns correct execution data in focus: null', () => {
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 0,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: null,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {},
          },
        })
      );
      expect(getFocusedExecutionData(state)).toBe(null);
    });

    it('returns correct execution data in focus: data present, non-null', () => {
      const executionData = createTestExecutionData({op_type: 'FocusedOp'});
      const state = {
        [DEBUGGER_FEATURE_KEY]: createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 10,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: 1,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {
              0: createTestExecutionData(),
              1: executionData,
            },
          },
        }),
      };
      expect(getFocusedExecutionData(state)).toEqual(executionData);
    });

    it('returns correct execution data in focus: null due to data missing', () => {
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 10,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: 3,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {
              0: createTestExecutionData(),
            },
          },
        })
      );
      expect(getFocusedExecutionData(state)).toBe(null);
    });
  });

  describe('getCodeLocationOrigin', () => {
    it('returns null initial state', () => {
      const state = createState(createDebuggerState());
      expect(getCodeLocationOrigin(state)).toBeNull();
    });

    it('returns correct origin for eager execution', () => {
      const state = createState(
        createDebuggerState({
          codeLocationFocusType: CodeLocationType.EXECUTION,
          executions: createDebuggerExecutionsState({
            focusIndex: 1,
            executionData: {
              0: createTestExecutionData({
                op_type: 'Type1Op',
              }),
              1: createTestExecutionData({
                op_type: 'Type2Op',
              }),
            },
          }),
        })
      );
      expect(getCodeLocationOrigin(state)).toEqual({
        codeLocationType: CodeLocationType.EXECUTION,
        opType: 'Type2Op',
        executionIndex: 1,
      });
    });

    it('returns correct origin for graph-op creation', () => {
      const state = createState(
        createDebuggerState({
          codeLocationFocusType: CodeLocationType.GRAPH_OP_CREATION,
          graphs: createDebuggerGraphsState({
            focusedOp: {
              graphId: 'f1',
              opName: 'op2',
            },
            ops: {
              f1: new Map([
                [
                  'op1',
                  createTestGraphOpInfo({
                    op_type: 'Type1Op',
                    op_name: 'foo',
                  }),
                ],
                [
                  'op2',
                  createTestGraphOpInfo({
                    op_type: 'Type2Op',
                    op_name: 'bar',
                  }),
                ],
              ]),
            },
          }),
        })
      );
      expect(getCodeLocationOrigin(state)).toEqual({
        codeLocationType: CodeLocationType.GRAPH_OP_CREATION,
        opType: 'Type2Op',
        opName: 'bar',
      });
    });
  });

  describe('getFocusedStackFrames', () => {
    it('returns correct stack frames when there is no focus', () => {
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 0,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: null,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {},
          },
          codeLocationFocusType: null,
        })
      );
      expect(getFocusedStackFrames(state)).toBe(null);
    });

    it('returns correct eager stack frames', () => {
      const stackFrame1: StackFrame = createTestStackFrame();
      const stackFrame2: StackFrame = createTestStackFrame();
      const stackFrame3: StackFrame = createTestStackFrame();
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 0,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: 1,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {
              1: createTestExecutionData({
                stack_frame_ids: ['a1', 'a3'],
              }),
            },
          },
          stackFrames: {
            a1: stackFrame1,
            a2: stackFrame2,
            a3: stackFrame3,
          },
          codeLocationFocusType: CodeLocationType.EXECUTION,
        })
      );
      expect(getFocusedStackFrames(state)).toEqual([stackFrame1, stackFrame3]);
    });

    it('returns correct graph-op-creation stack frames', () => {
      const stackFrame1: StackFrame = createTestStackFrame();
      const stackFrame2: StackFrame = createTestStackFrame();
      const stackFrame3: StackFrame = createTestStackFrame();
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          graphs: {
            ops: {
              f1: new Map([
                [
                  'op7',
                  createTestGraphOpInfo({
                    stack_frame_ids: ['a1', 'a2'],
                  }),
                ],
                [
                  'op8',
                  createTestGraphOpInfo({
                    stack_frame_ids: ['a1', 'a3'],
                  }),
                ],
              ]),
            },
            loadingOps: {},
            focusedOp: {
              graphId: 'f1',
              opName: 'op8',
            },
          },
          stackFrames: {
            a1: stackFrame1,
            a2: stackFrame2,
            a3: stackFrame3,
          },
          codeLocationFocusType: CodeLocationType.GRAPH_OP_CREATION,
        })
      );
      expect(getFocusedStackFrames(state)).toEqual([stackFrame1, stackFrame3]);
    });

    it('returns null when no graph op is focused on', () => {
      const stackFrame1: StackFrame = createTestStackFrame();
      const stackFrame2: StackFrame = createTestStackFrame();
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          graphs: {
            ops: {
              f1: new Map([
                [
                  'op1',
                  createTestGraphOpInfo({
                    stack_frame_ids: ['a1', 'a2'],
                  }),
                ],
              ]),
            },
            loadingOps: {},
            focusedOp: null,
          },
          stackFrames: {
            a1: stackFrame1,
            a2: stackFrame2,
          },
          codeLocationFocusType: CodeLocationType.GRAPH_OP_CREATION,
        })
      );
      expect(getFocusedStackFrames(state)).toBeNull();
    });

    it('returns null when subset of frames is missing', () => {
      const state = createState(
        createDebuggerState({
          activeRunId: '__default_debugger_run__',
          executions: {
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 0,
            },
            pageSize: 1000,
            displayCount: 50,
            focusIndex: 1,
            scrollBeginIndex: 0,
            executionDigests: {},
            executionData: {
              1: createTestExecutionData({
                stack_frame_ids: ['a1', 'a3'],
              }),
            },
          },
          stackFrames: {
            a1: {
              host_name: 'localhost',
              file_path: '/tmp/main.py',
              lineno: 10,
              function_name: 'main',
            },
            a2: {
              host_name: 'localhost',
              file_path: '/tmp/model.py',
              lineno: 20,
              function_name: 'initialize',
            },
          },
        })
      );
      expect(getFocusedStackFrames(state)).toBeNull();
    });
  });

  describe('getSourceFileListLoaded', () => {
    it('returns correct NOT_LOADED state', () => {
      const state = createState(createDebuggerState());
      const loaded = getSourceFileListLoaded(state);
      expect(loaded.state).toBe(DataLoadState.NOT_LOADED);
      expect(loaded.lastLoadedTimeInMs).toBeNull();
    });

    it('returns correct LOADING state', () => {
      const state = createState(
        createDebuggerState({
          sourceCode: createDebuggerSourceCodeState({
            sourceFileListLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: 4321,
            },
          }),
        })
      );
      const loaded = getSourceFileListLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADING);
      expect(loaded.lastLoadedTimeInMs).toBe(4321);
    });

    it('returns correct LOADED state', () => {
      const state = createState(
        createDebuggerState({
          sourceCode: createDebuggerSourceCodeState({
            sourceFileListLoaded: {
              state: DataLoadState.LOADED,
              lastLoadedTimeInMs: 8888,
            },
          }),
        })
      );
      const loaded = getSourceFileListLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADED);
      expect(loaded.lastLoadedTimeInMs).toBe(8888);
    });
  });

  describe('getSourceFileList', () => {
    it('returns correct empty array state', () => {
      const state = createState(createDebuggerState());
      const sourceFileList = getSourceFileList(state);
      expect(sourceFileList).toEqual([]);
    });

    it('returns correct non-empty array state', () => {
      const state = createState(
        createDebuggerState({
          sourceCode: createDebuggerSourceCodeState({
            sourceFileList: [
              {
                host_name: 'worker0',
                file_path: '/tmp/main.py',
              },
              {
                host_name: 'worker1',
                file_path: '/tmp/eval.py',
              },
            ],
          }),
        })
      );
      const sourceFileList = getSourceFileList(state);
      expect(sourceFileList).toEqual([
        {
          host_name: 'worker0',
          file_path: '/tmp/main.py',
        },
        {
          host_name: 'worker1',
          file_path: '/tmp/eval.py',
        },
      ]);
    });
  });

  describe('getFocusedSourceFileIndex', () => {
    it('returns correct -1 for no-focus initial state', () => {
      const state = createState(createDebuggerState());
      expect(getFocusedSourceFileIndex(state)).toBe(-1);
    });

    it('returns correct -1 for no-focus state with file list', () => {
      const state = createState(
        createDebuggerState({
          sourceCode: createDebuggerSourceCodeState({
            sourceFileList: [
              {
                host_name: 'worker0',
                file_path: '/tmp/main.py',
              },
            ],
            focusLineSpec: null,
          }),
        })
      );
      expect(getFocusedSourceFileIndex(state)).toBe(-1);
    });

    it('returns correct >=0 value', () => {
      const state = createState(
        createDebuggerState({
          sourceCode: createDebuggerSourceCodeState({
            sourceFileList: [
              {
                host_name: 'worker0',
                file_path: '/tmp/main.py',
              },
              {
                host_name: 'worker1',
                file_path: '/tmp/eval.py',
              },
            ],
            focusLineSpec: {
              host_name: 'worker1',
              file_path: '/tmp/eval.py',
              lineno: 100,
              function_name: 'train_fn',
            },
          }),
        })
      );
      expect(getFocusedSourceFileIndex(state)).toBe(1);
    });
  });

  describe('getFocusedSourceFileContent', () => {
    it('returns correct null for no-focus initial state', () => {
      const state = createState(createDebuggerState());
      expect(getFocusedSourceFileContent(state)).toBeNull();
    });

    it('returns correct >=0 value', () => {
      const state = createState(
        createDebuggerState({
          sourceCode: createDebuggerSourceCodeState({
            sourceFileList: [
              {
                host_name: 'worker0',
                file_path: '/tmp/main.py',
              },
              {
                host_name: 'worker1',
                file_path: '/tmp/eval.py',
              },
            ],
            fileContents: [
              {
                loadState: DataLoadState.NOT_LOADED,
                lines: null,
              },
              {
                loadState: DataLoadState.LOADED,
                lines: ['', 'import tensorflow as tf'],
              },
            ],
            focusLineSpec: {
              host_name: 'worker1',
              file_path: '/tmp/eval.py',
              lineno: 100,
              function_name: 'train_fn',
            },
          }),
        })
      );
      expect(getFocusedSourceFileContent(state)).toEqual({
        loadState: DataLoadState.LOADED,
        lines: ['', 'import tensorflow as tf'],
      });
    });
  });

  describe('getNumGraphExecutionsLoaded', () => {
    it('returns correct NOT_LOADED state', () => {
      const state = createState(createDebuggerState());
      const loaded = getNumGraphExecutionsLoaded(state);
      expect(loaded.state).toBe(DataLoadState.NOT_LOADED);
      expect(loaded.lastLoadedTimeInMs).toBe(null);
    });

    it('returns correct LOADING state', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            numExecutionsLoaded: {
              state: DataLoadState.LOADING,
              lastLoadedTimeInMs: null,
            },
          }),
        })
      );
      const loaded = getNumGraphExecutionsLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADING);
      expect(loaded.lastLoadedTimeInMs).toBe(null);
    });

    it('returns correct LOADED state', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            numExecutionsLoaded: {
              state: DataLoadState.LOADED,
              lastLoadedTimeInMs: 1234,
            },
          }),
        })
      );
      const loaded = getNumGraphExecutionsLoaded(state);
      expect(loaded.state).toBe(DataLoadState.LOADED);
      expect(loaded.lastLoadedTimeInMs).toBe(1234);
    });
  });

  describe('getNumGraphExecutions', () => {
    it('returns correct initial zero state', () => {
      const state = createState(createDebuggerState());
      expect(getNumGraphExecutions(state)).toBe(0);
    });

    it('returns correct non-zero state', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            executionDigestsLoaded: {
              loadingRanges: [],
              pageLoadedSizes: {},
              numExecutions: 10,
            },
          }),
        })
      );
      expect(getNumGraphExecutions(state)).toBe(10);
    });
  });

  describe('getGraphExecutionScrollBeginIndex', () => {
    it('returns correct initial zero state', () => {
      const state = createState(createDebuggerState());
      expect(getGraphExecutionScrollBeginIndex(state)).toBe(0);
    });

    it('returns correct non-zero state', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            scrollBeginIndex: 1234567,
          }),
        })
      );
      expect(getGraphExecutionScrollBeginIndex(state)).toBe(1234567);
    });
  });

  describe('getGraphExecutionDisplayCount', () => {
    it('returns correct value', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            displayCount: 240,
          }),
        })
      );
      expect(getGraphExecutionDisplayCount(state)).toBe(240);
    });
  });

  describe('getGraphExecutionPageSize', () => {
    it('returns correct value', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            pageSize: 126,
          }),
        })
      );
      expect(getGraphExecutionPageSize(state)).toBe(126);
    });
  });

  describe('getGraphExecutionDataLoadingPages', () => {
    it('returns correct empty value', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionDataLoadingPages: [],
          }),
        })
      );
      expect(getGraphExecutionDataLoadingPages(state)).toEqual([]);
    });

    it('returns correct non-empty value', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionDataLoadingPages: [1, 2, 100],
          }),
        })
      );
      expect(getGraphExecutionDataLoadingPages(state)).toEqual([1, 2, 100]);
    });
  });

  describe('getGraphExecutionDataLoadingPages', () => {
    it('returns correct empty value', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionDataPageLoadedSizes: {},
          }),
        })
      );
      expect(getGraphExecutionDataPageLoadedSizes(state)).toEqual({});
    });

    it('returns correct non-empty value', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionDataPageLoadedSizes: {0: 10, 2: 40},
          }),
        })
      );
      expect(getGraphExecutionDataPageLoadedSizes(state)).toEqual({
        0: 10,
        2: 40,
      });
    });
  });

  describe('getGraphExecutionData', () => {
    it('returns correct initial empty state', () => {
      const state = createState(createDebuggerState());
      expect(getGraphExecutionData(state)).toEqual({});
    });

    it('returns correct non-empty value', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionData: {
              10: createTestGraphExecution(),
            },
          }),
        })
      );
      expect(getGraphExecutionData(state)).toEqual({
        10: createTestGraphExecution(),
      });
    });
  });

  describe('getGraphExecutionFocusIndex', () => {
    for (const focusIndex of [null, 0, 100]) {
      it(`returns correct value: ${JSON.stringify(focusIndex)}`, () => {
        const state = createState(
          createDebuggerState({
            graphExecutions: createDebuggerGraphExecutionsState({
              focusIndex,
            }),
          })
        );
        expect(getGraphExecutionFocusIndex(state)).toBe(focusIndex);
      });
    }
  });

  describe('getFocusedGraphOpInfo', () => {
    const op1Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op1',
    });
    const op2Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op2',
    });

    it('returns initial null state', () => {
      const state = createState(createDebuggerState());
      expect(getFocusedGraphOpInfo(state)).toBeNull();
    });

    it('returns null when no op is focused on but graph ops are loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([
                ['op1', op1Info],
                ['op2', op2Info],
              ]),
            },
            focusedOp: null,
          }),
        })
      );
      expect(getFocusedGraphOpInfo(state)).toBeNull();
    });

    it('returns null if op is focused on but graph op is not loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([
                ['op1', op1Info],
                ['op2', op2Info],
              ]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op3',
            },
          }),
        })
      );
      expect(getFocusedGraphOpInfo(state)).toBeNull();
    });

    it('returns correct value if op is focused and loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([
                ['op1', op1Info],
                ['op2', op2Info],
              ]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op2',
            },
          }),
        })
      );
      expect(getFocusedGraphOpInfo(state)).toEqual(op2Info);
    });
  });

  describe('getFocusedOpInputs', () => {
    const op1Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op1',
      consumers: [
        [
          {
            op_name: 'op2',
            input_slot: 0,
          },
        ],
      ],
    });
    const op2Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op2',
      inputs: [
        {
          op_name: 'op1',
          output_slot: 0,
        },
      ],
    });

    it('returns initial null state', () => {
      const state = createState(createDebuggerState());
      expect(getFocusedGraphOpInputs(state)).toBeNull();
    });

    it('returns initial null when graph is not loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {},
            focusedOp: {
              graphId: 'g1',
              opName: 'op2',
            },
          }),
        })
      );
      expect(getFocusedGraphOpInputs(state)).toBeNull();
    });

    it('returns initial null when self op is not loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([['op1', op1Info]]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op2',
            },
          }),
        })
      );
      expect(getFocusedGraphOpInputs(state)).toBeNull();
    });

    it('returns initial array without data when input op is not loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([['op2', op2Info]]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op2',
            },
          }),
        })
      );
      expect(getFocusedGraphOpInputs(state)).toEqual([
        {
          op_name: 'op1',
          output_slot: 0,
        },
      ]);
    });

    it('returns array with data when both self and input ops are loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([
                ['op1', op1Info],
                ['op2', op2Info],
              ]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op2',
            },
          }),
        })
      );
      expect(getFocusedGraphOpInputs(state)).toEqual([
        {
          op_name: 'op1',
          output_slot: 0,
          data: op1Info,
        },
      ]);
    });
  });

  describe('getFocusedGraphExecutionInputIndices', () => {
    // The opInfo instances below form a simple graph:
    //   op1:0 ----> op2:0 ----> op3:0
    //    |                       ^
    //    +-----------------------|
    //
    //   op4:0
    const op1Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op1',
      consumers: [
        [
          {
            op_name: 'op2',
            input_slot: 0,
          },
          {
            op_name: 'op3',
            input_slot: 0,
          },
        ],
      ],
    });
    const op2Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op2',
      inputs: [
        {
          op_name: 'op1',
          output_slot: 0,
        },
      ],
      consumers: [
        [
          {
            op_name: 'op3',
            input_slot: 1,
          },
        ],
      ],
    });
    const op3Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op3',
      inputs: [
        {
          op_name: 'op1',
          output_slot: 0,
        },
        {
          op_name: 'op2',
          output_slot: 0,
        },
      ],
    });
    const op4Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op4',
      inputs: [],
    });
    const graphOps = {
      g1: new Map([
        ['op1', op1Info],
        ['op2', op2Info],
        ['op3', op3Info],
        ['op4', op4Info],
      ]),
    };

    it('returns null under initial state', () => {
      const state = createState(createDebuggerState());
      expect(getFocusedGraphExecutionInputIndices(state)).toBeNull();
    });

    it('returns null when no graph execution is focused on', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionData: {
              8: createTestGraphExecution({
                // This is the immedate input.
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
              10: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op2',
                output_slot: 0,
              }),
            },
            focusIndex: null,
          }),
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([
                ['op1', op1Info],
                ['op2', op2Info],
              ]),
            },
            focusedOp: null,
          }),
        })
      );
      expect(getFocusedGraphExecutionInputIndices(state)).toBeNull();
    });

    it('returns single input index while skipping earlier & later ones', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionData: {
              // This is a past run of the tensor that is the immediate input.
              // Should be ignored.
              6: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
              // This is the immedate input.
              8: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
              // Unrelated op, should be ignored.
              9: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op4',
                output_slot: 0,
              }),
              // The focused op.
              10: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op2',
                output_slot: 0,
              }),
              // This is a future run of the tensor that is the immediate input.
              // Should be ignored.
              12: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
            },
            focusIndex: 10,
          }),
          graphs: createDebuggerGraphsState({
            ops: graphOps,
            focusedOp: {
              graphId: 'g1',
              opName: 'op2',
            },
          }),
        })
      );
      expect(getFocusedGraphExecutionInputIndices(state)).toEqual([8]);
    });

    it('returns 2 input indices for 2-input op: inputs fully loaded', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionData: {
              // This is a past run of the tensor that is the 1st immediate
              // input. Should be ignored.
              5: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
              // This is the 1st immedate input.
              6: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
              // Unrelated op, should be ignored.
              9: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op4',
                output_slot: 0,
              }),
              // This is the 2nd immediate input.
              10: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op2',
                output_slot: 0,
              }),
              // The focused graph execution.
              12: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op3',
                output_slot: 0,
              }),
            },
            focusIndex: 12,
          }),
          graphs: createDebuggerGraphsState({
            ops: graphOps,
            focusedOp: {
              graphId: 'g1',
              opName: 'op3',
            },
          }),
        })
      );
      expect(getFocusedGraphExecutionInputIndices(state)).toEqual([10, 6]);
    });

    it('returns 1 input indices for 2-input op: inputs partially loaded', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionData: {
              // This is the 2nd immediate input.
              10: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op2',
                output_slot: 0,
              }),
              // The focused graphe execution.
              12: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op3',
                output_slot: 0,
              }),
              // This is the same tensor as the 1st immedate input, but in the
              // future. Should be ignored.
              13: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
            },
            focusIndex: 12,
          }),
          graphs: createDebuggerGraphsState({
            ops: graphOps,
            focusedOp: {
              graphId: 'g1',
              opName: 'op3',
            },
          }),
        })
      );
      expect(getFocusedGraphExecutionInputIndices(state)).toEqual([10]);
    });

    it('returns empty array for no-input op', () => {
      const state = createState(
        createDebuggerState({
          graphExecutions: createDebuggerGraphExecutionsState({
            graphExecutionData: {
              5: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op1',
                output_slot: 0,
              }),
              6: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op2',
                output_slot: 0,
              }),
              10: createTestGraphExecution({
                graph_id: 'g1',
                op_name: 'op4',
                output_slot: 0,
              }),
            },
            focusIndex: 12,
          }),
          graphs: createDebuggerGraphsState({
            ops: graphOps,
            focusedOp: {
              graphId: 'g1',
              opName: 'op4',
            },
          }),
        })
      );
      expect(getFocusedGraphExecutionInputIndices(state)).toEqual([]);
    });
  });

  describe('getFocusedOpConsumers', () => {
    const op1Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op1',
      consumers: [
        [
          {
            op_name: 'op2',
            input_slot: 0,
          },
        ],
      ],
    });
    const op2Info = createTestGraphOpInfo({
      graph_ids: ['g1'],
      op_name: 'op2',
      inputs: [
        {
          op_name: 'op1',
          output_slot: 0,
        },
      ],
    });

    it('returns initial null state', () => {
      const state = createState(createDebuggerState());
      expect(getFocusedGraphOpConsumers(state)).toBeNull();
    });

    it('returns initial null when graph is not loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {},
            focusedOp: {
              graphId: 'g1',
              opName: 'op1',
            },
          }),
        })
      );
      expect(getFocusedGraphOpConsumers(state)).toBeNull();
    });

    it('returns initial null when self op is not loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([['op2', op2Info]]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op1',
            },
          }),
        })
      );
      expect(getFocusedGraphOpConsumers(state)).toBeNull();
    });

    it('returns initial array without data when consumer op is not loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([['op1', op1Info]]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op1',
            },
          }),
        })
      );
      expect(getFocusedGraphOpConsumers(state)).toEqual([
        [
          {
            op_name: 'op2',
            input_slot: 0,
          },
        ],
      ]);
    });

    it('returns array with data when both self and input ops are loaded', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            ops: {
              g1: new Map([
                ['op1', op1Info],
                ['op2', op2Info],
              ]),
            },
            focusedOp: {
              graphId: 'g1',
              opName: 'op1',
            },
          }),
        })
      );
      expect(getFocusedGraphOpConsumers(state)).toEqual([
        [
          {
            op_name: 'op2',
            input_slot: 0,
            data: op2Info,
          },
        ],
      ]);
    });
  });

  describe('getLoadingGraphOps', () => {
    it('returns initial empty state', () => {
      const state = createState(createDebuggerState());
      expect(getLoadingGraphOps(state)).toEqual({});
    });

    it('returns non-empty state', () => {
      const state = createState(
        createDebuggerState({
          graphs: createDebuggerGraphsState({
            loadingOps: {
              g0: new Map(),
              g1: new Map([['Op1', DataLoadState.LOADING]]),
              g2: new Map([
                ['Op2a', DataLoadState.LOADED],
                ['Op2b', DataLoadState.FAILED],
              ]),
            },
          }),
        })
      );
      expect(getLoadingGraphOps(state)).toEqual({
        g0: new Map(),
        g1: new Map([['Op1', DataLoadState.LOADING]]),
        g2: new Map([
          ['Op2a', DataLoadState.LOADED],
          ['Op2b', DataLoadState.FAILED],
        ]),
      });
    });
  });

  describe('getFocusedSourceLineSpec', () => {
    it(`returns non-null focused source line spec`, () => {
      const state = createState(createDebuggerState());
      expect(getFocusedSourceLineSpec(state)).toBeNull();
    });

    it(`returns non-null focused source line spec`, () => {
      const state = createState(
        createDebuggerState({
          sourceCode: createDebuggerSourceCodeState({
            focusLineSpec: {
              host_name: 'localhost',
              file_path: 'train.py',
              lineno: 5,
              function_name: 'train_fn',
            },
          }),
        })
      );
      const focused = getFocusedSourceLineSpec(state);
      expect(focused).toEqual({
        host_name: 'localhost',
        file_path: 'train.py',
        lineno: 5,
        function_name: 'train_fn',
      });
    });
  });
});
