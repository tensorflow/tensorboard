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
import * as actions from '../actions';
import {ExecutionDigestsResponse} from '../data_source/tfdbg2_data_source';
import {reducers} from './debugger_reducers';
import {DataLoadState, Execution, StackFramesById} from './debugger_types';
import {
  createDebuggerExecutionsState,
  createDebuggerState,
  createDigestsStateWhileLoadingExecutionDigests,
  createDebuggerStateWithLoadedExecutionDigests,
  createTestExecutionData,
  createTestStackFrame,
} from '../testing';

describe('Debugger reducers', () => {
  describe('Runs loading', () => {
    it('sets runsLoaded to loading on requesting runs', () => {
      const state = createDebuggerState();
      const nextState = reducers(state, actions.debuggerRunsRequested());
      expect(nextState.runsLoaded.state).toBe(DataLoadState.LOADING);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('set runsLoad to failed on request failure', () => {
      const state = createDebuggerState({
        runsLoaded: {state: DataLoadState.LOADING, lastLoadedTimeInMs: null},
      });
      const nextState = reducers(state, actions.debuggerRunsRequestFailed());
      expect(nextState.runsLoaded.state).toBe(DataLoadState.FAILED);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeNull();
    });

    it('sets runsLoaded and runs on successful runs loading', () => {
      const state = createDebuggerState();
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.debuggerRunsLoaded({
          runs: {
            foo_debugger_run: {
              start_time: 111,
            },
          },
        })
      );
      expect(nextState.runsLoaded.state).toBe(DataLoadState.LOADED);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
        t0
      );
      expect(nextState.runs).toEqual({
        foo_debugger_run: {
          start_time: 111,
        },
      });
    });

    it('Overrides existing runs on successful runs loading', () => {
      const state = createDebuggerState({
        runs: {
          foo_debugger_run: {
            start_time: 111,
          },
        },
        runsLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 0,
        },
      });
      const t0 = Date.now();
      const nextState = reducers(
        state,
        actions.debuggerRunsLoaded({
          runs: {
            bar_debugger_run: {
              start_time: 222,
            },
          },
        })
      );
      expect(nextState.runsLoaded.state).toBe(DataLoadState.LOADED);
      expect(nextState.runsLoaded.lastLoadedTimeInMs).toBeGreaterThanOrEqual(
        t0
      );
      expect(nextState.runs).toEqual({
        bar_debugger_run: {
          start_time: 222,
        },
      });
    });
  });

  it('Overrides activeRunId on debuggerRunsLoaded', () => {
    const state = createDebuggerState();
    const nextState = reducers(
      state,
      actions.debuggerRunsLoaded({
        runs: {
          __default_debugger_run__: {
            start_time: 222,
          },
        },
      })
    );
    expect(nextState.activeRunId).toEqual('__default_debugger_run__');
  });

  it('Updates load state on numExecutionsRequested', () => {
    const state = createDebuggerState({
      runs: {
        __default_debugger_run__: {
          start_time: 111,
        },
      },
      runsLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 222,
      },
      activeRunId: '__default_debugger_run__',
    });
    const nextState = reducers(state, actions.numExecutionsRequested());
    expect(nextState.executions.numExecutionsLoaded.state).toBe(
      DataLoadState.LOADING
    );
    expect(
      nextState.executions.numExecutionsLoaded.lastLoadedTimeInMs
    ).toBeNull();
  });

  it('Updates states correctly on numExecutionsLoaded', () => {
    const state = createDebuggerState({
      runs: {
        __default_debugger_run__: {
          start_time: 111,
        },
      },
      runsLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 222,
      },
      activeRunId: '__default_debugger_run__',
      executions: {
        numExecutionsLoaded: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        },
        executionDigestsLoaded: {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
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
    });
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.numExecutionsLoaded({numExecutions: 1337})
    );
    expect(nextState.executions.numExecutionsLoaded.state).toBe(
      DataLoadState.LOADED
    );
    expect(
      nextState.executions.numExecutionsLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.executions.executionDigestsLoaded.numExecutions).toBe(
      1337
    );
  });

  it('Updates states on executionDigestsRequested', () => {
    const state = createDebuggerState({
      runs: {
        __default_debugger_run__: {
          start_time: 111,
        },
      },
      runsLoaded: {
        state: DataLoadState.LOADED,
        lastLoadedTimeInMs: 222,
      },
      activeRunId: '__default_debugger_run__',
      executions: createDebuggerExecutionsState({
        numExecutionsLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 333,
        },
        executionDigestsLoaded: {
          numExecutions: 1337,
          pageLoadedSizes: {},
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        },
      }),
    });
    const nextState = reducers(state, actions.executionDigestsRequested());
    expect(nextState.executions.executionDigestsLoaded.state).toBe(
      DataLoadState.LOADING
    );
    expect(
      nextState.executions.executionDigestsLoaded.lastLoadedTimeInMs
    ).toBeNull();
    expect(nextState.executions.executionDigestsLoaded.numExecutions).toBe(
      1337
    );
    expect(nextState.executions.executionDigestsLoaded.pageLoadedSizes).toEqual(
      {}
    );
  });

  it('On executionDigestsLoaded: correct digests & page sizes updates', () => {
    const pageSize = 100;
    const numExecutions = 1337;
    const state = createDigestsStateWhileLoadingExecutionDigests(
      pageSize,
      numExecutions
    );
    const excutionDigestsResponse: ExecutionDigestsResponse = {
      begin: 0,
      end: pageSize,
      num_digests: numExecutions,
      execution_digests: [],
    };
    for (let i = 0; i < 100; ++i) {
      excutionDigestsResponse.execution_digests.push({
        op_type: `Op${i}`,
        output_tensor_device_ids: [`de${i}`],
      });
    }
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.executionDigestsLoaded(excutionDigestsResponse)
    );
    expect(nextState.executions.executionDigestsLoaded.state).toBe(
      DataLoadState.LOADED
    );
    expect(
      nextState.executions.executionDigestsLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.executions.executionDigestsLoaded.numExecutions).toEqual(
      numExecutions
    );
    // The first page is loaded in full.
    expect(nextState.executions.executionDigestsLoaded.pageLoadedSizes).toEqual(
      {0: 100}
    );
    // The detailed digest data should be recorded.
    expect(Object.keys(nextState.executions.executionDigests).length).toBe(100);
    for (let i = 0; i < 100; ++i) {
      expect(nextState.executions.executionDigests[i].op_type).toBe(`Op${i}`);
      expect(
        nextState.executions.executionDigests[i].output_tensor_device_ids
      ).toEqual([`de${i}`]);
    }
  });

  it('On executionDigestsLoaded: Incomplete 1st page --> larger 1st page', () => {
    const pageSize = 100;
    const numExecutions = 4;
    const state = createDigestsStateWhileLoadingExecutionDigests(
      pageSize,
      numExecutions,
      {
        0: {op_type: 'Relu', output_tensor_device_ids: ['a']},
        1: {op_type: 'Identity', output_tensor_device_ids: ['a']},
      },
      {
        0: 2 /* Previously loaded incomplete first page. */,
      }
    );
    const excutionDigestsResponse: ExecutionDigestsResponse = {
      begin: 0,
      end: 4,
      num_digests: numExecutions,
      execution_digests: [
        {op_type: 'MatMul', output_tensor_device_ids: ['a']},
        {op_type: 'BiasAdd', output_tensor_device_ids: ['a']},
        {op_type: 'Relu', output_tensor_device_ids: ['a']},
        {op_type: 'Identity', output_tensor_device_ids: ['a']},
      ],
    };
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.executionDigestsLoaded(excutionDigestsResponse)
    );
    expect(nextState.executions.executionDigestsLoaded.state).toBe(
      DataLoadState.LOADED
    );
    expect(
      nextState.executions.executionDigestsLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.executions.executionDigestsLoaded.numExecutions).toBe(
      numExecutions
    );
    // The first page is expanded.
    expect(nextState.executions.executionDigestsLoaded.pageLoadedSizes).toEqual(
      {0: 4}
    );
    // The detailed digest data should be recorded.
    expect(Object.keys(nextState.executions.executionDigests).length).toBe(4);
    expect(nextState.executions.executionDigests[0]).toEqual({
      op_type: 'MatMul',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[1]).toEqual({
      op_type: 'BiasAdd',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[2]).toEqual({
      op_type: 'Relu',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[3]).toEqual({
      op_type: 'Identity',
      output_tensor_device_ids: ['a'],
    });
  });

  it('On executionDigestsLoaded: Adding a new page before existing', () => {
    const pageSize = 2;
    const numExecutions = 4;
    const state = createDigestsStateWhileLoadingExecutionDigests(
      pageSize,
      numExecutions,
      {
        2: {op_type: 'Relu', output_tensor_device_ids: ['a']},
        3: {op_type: 'Identity', output_tensor_device_ids: ['a']},
      },
      {
        1: 2 /* Previously loaded 2nd page. */,
      }
    );
    const excutionDigestsResponse: ExecutionDigestsResponse = {
      begin: 0,
      end: 2,
      num_digests: numExecutions,
      execution_digests: [
        {op_type: 'MatMul', output_tensor_device_ids: ['a']},
        {op_type: 'BiasAdd', output_tensor_device_ids: ['a']},
        {op_type: 'Relu', output_tensor_device_ids: ['a']},
        {op_type: 'Identity', output_tensor_device_ids: ['a']},
      ],
    };
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.executionDigestsLoaded(excutionDigestsResponse)
    );
    expect(nextState.executions.executionDigestsLoaded.state).toBe(
      DataLoadState.LOADED
    );
    expect(
      nextState.executions.executionDigestsLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    expect(nextState.executions.executionDigestsLoaded.numExecutions).toBe(
      numExecutions
    );
    // The first page is expanded.
    expect(nextState.executions.executionDigestsLoaded.pageLoadedSizes).toEqual(
      {0: 2, 1: 2}
    );
    // The detailed digest data should be recorded.
    expect(Object.keys(nextState.executions.executionDigests).length).toEqual(
      4
    );
    expect(nextState.executions.executionDigests[0]).toEqual({
      op_type: 'MatMul',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[1]).toEqual({
      op_type: 'BiasAdd',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[2]).toEqual({
      op_type: 'Relu',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[3]).toEqual({
      op_type: 'Identity',
      output_tensor_device_ids: ['a'],
    });
  });

  it('On executionDigestsLoaded: Adding a new page after existing', () => {
    const pageSize = 2;
    const numExecutions = 4;
    const state = createDigestsStateWhileLoadingExecutionDigests(
      pageSize,
      numExecutions,
      {
        0: {op_type: 'MatMul', output_tensor_device_ids: ['a']},
        1: {op_type: 'BiasAdd', output_tensor_device_ids: ['a']},
      },
      {
        0: 2 /* Previously loaded 1st page. */,
      }
    );
    const excutionDigestsResponse: ExecutionDigestsResponse = {
      begin: 2,
      end: 4,
      num_digests: numExecutions + 1, // Total execution count has updated.
      execution_digests: [
        {op_type: 'Relu', output_tensor_device_ids: ['a']},
        {op_type: 'Identity', output_tensor_device_ids: ['a']},
      ],
    };
    const t0 = Date.now();
    const nextState = reducers(
      state,
      actions.executionDigestsLoaded(excutionDigestsResponse)
    );
    expect(nextState.executions.executionDigestsLoaded.state).toBe(
      DataLoadState.LOADED
    );
    expect(
      nextState.executions.executionDigestsLoaded.lastLoadedTimeInMs
    ).toBeGreaterThanOrEqual(t0);
    // Update in total execution count should be reflected.
    expect(nextState.executions.executionDigestsLoaded.numExecutions).toBe(
      numExecutions + 1
    );
    // The first page is expanded.
    expect(nextState.executions.executionDigestsLoaded.pageLoadedSizes).toEqual(
      {0: 2, 1: 2}
    );
    // The detailed digest data should be recorded.
    expect(Object.keys(nextState.executions.executionDigests).length).toBe(4);
    expect(nextState.executions.executionDigests[0]).toEqual({
      op_type: 'MatMul',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[1]).toEqual({
      op_type: 'BiasAdd',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[2]).toEqual({
      op_type: 'Relu',
      output_tensor_device_ids: ['a'],
    });
    expect(nextState.executions.executionDigests[3]).toEqual({
      op_type: 'Identity',
      output_tensor_device_ids: ['a'],
    });
  });

  it('executionScrollLeft takes no effect due to left bound', () => {
    const scrollBeginIndex = 0;
    const state = createDebuggerStateWithLoadedExecutionDigests(
      scrollBeginIndex
    );
    const nextState = reducers(state, actions.executionScrollLeft());
    expect(nextState.executions.scrollBeginIndex).toBe(0);
  });

  for (const scrollBeginIndex of [1, 50, 100, 999, 1000, 1001, 1234, 1450]) {
    it(`executionScrollLeft takes effect: ${scrollBeginIndex}`, () => {
      const state = createDebuggerStateWithLoadedExecutionDigests(
        scrollBeginIndex
      );
      const nextState = reducers(state, actions.executionScrollLeft());
      expect(nextState.executions.scrollBeginIndex).toBe(scrollBeginIndex - 1);
    });
  }

  for (const scrollBeginIndex of [0, 1, 50, 100, 999, 1000, 1001, 1234, 1449]) {
    it(`executionScrollRight takes effect: ${scrollBeginIndex}`, () => {
      const state = createDebuggerStateWithLoadedExecutionDigests(
        scrollBeginIndex
      );
      const nextState = reducers(state, actions.executionScrollRight());
      expect(nextState.executions.scrollBeginIndex).toBe(scrollBeginIndex + 1);
    });
  }

  it('executionScrollRight takes no effect due to left bound', () => {
    const scrollBeginIndex = 1450;
    const state = createDebuggerStateWithLoadedExecutionDigests(
      scrollBeginIndex
    );
    const nextState = reducers(state, actions.executionScrollRight());
    expect(nextState.executions.scrollBeginIndex).toBe(1450);
  });

  it(`Updates states on executionDigestFocused: scrollBeginIndex = 0`, () => {
    const state = createDebuggerState();
    const nextState = reducers(
      state,
      actions.executionDigestFocused({
        displayIndex: 12,
      })
    );
    expect(nextState.executions.focusIndex).toBe(12);
  });

  it(`Updates states on executionDigestFocused: scrollBeginIndex > 0`, () => {
    const state = createDebuggerState({
      executions: {
        numExecutionsLoaded: {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        },
        executionDigestsLoaded: {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
          pageLoadedSizes: {},
          numExecutions: 0,
        },
        pageSize: 1000,
        displayCount: 50,
        focusIndex: null,
        scrollBeginIndex: 100,
        executionDigests: {},
        executionData: {},
      },
    });
    const nextState = reducers(
      state,
      actions.executionDigestFocused({
        displayIndex: 12,
      })
    );
    expect(nextState.executions.focusIndex).toBe(112);
  });

  for (const beginIndex of [0, 50]) {
    for (const numObjects of [1, 2, 3]) {
      it(
        `Updates states on executionDataLoaded: beginIndex=${beginIndex}; ` +
          `${numObjects} objects`,
        () => {
          const state = createDebuggerState({
            activeRunId: '__default_debugger_run__',
          });
          const executionDataObjects: Execution[] = [];
          for (let i = 0; i < numObjects; ++i) {
            executionDataObjects.push(
              createTestExecutionData({
                op_type: `OpType${numObjects}`,
                input_tensor_ids: [i * 10],
                output_tensor_ids: [i * 10 + 1],
              })
            );
          }

          const nextState = reducers(
            state,
            actions.executionDataLoaded({
              begin: beginIndex,
              end: beginIndex + numObjects,
              executions: executionDataObjects,
            })
          );
          expect(Object.keys(nextState.executions.executionData).length).toBe(
            numObjects
          );
          for (let i = beginIndex; i < numObjects; ++i) {
            expect(nextState.executions.executionData[i]).toEqual(
              executionDataObjects[i]
            );
          }
        }
      );
    }
  }

  it(`Updates states on stackFramesLoaded with all new content`, () => {
    const state = createDebuggerState({
      activeRunId: '__default_debugger_run__',
    });
    const stackFrames: StackFramesById = {
      aaa: createTestStackFrame(),
      bbb: createTestStackFrame(),
      ccc: createTestStackFrame(),
    };
    const nextState = reducers(state, actions.stackFramesLoaded({stackFrames}));
    expect(nextState.stackFrames).toEqual(stackFrames);
  });
});
