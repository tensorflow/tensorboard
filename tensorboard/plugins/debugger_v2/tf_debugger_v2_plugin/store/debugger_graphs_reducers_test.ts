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
import * as actions from '../actions';
import {
  createDebuggerGraphExecutionsState,
  createDebuggerGraphsState,
  createDebuggerSourceCodeState,
  createDebuggerState,
  createTestGraphOpInfo,
  createTestStackFrame,
} from '../testing';
import {reducers} from './debugger_reducers';
import {CodeLocationType, DataLoadState} from './debugger_types';

describe('Debugger reducers', () => {
  describe('graphOpFocused', () => {
    it('sets focusedOp in graphs state from empty state', () => {
      const state = createDebuggerState();
      const nextState = reducers(
        state,
        actions.graphOpFocused({graph_id: 'g2', op_name: 'TestOp_12'})
      );
      expect(nextState.graphs.focusedOp).toEqual({
        graphId: 'g2',
        opName: 'TestOp_12',
      });
      expect(nextState.codeLocationFocusType).toBe(
        CodeLocationType.GRAPH_OP_CREATION
      );
    });

    it('sets focusedOp in graphs state from non-empty state', () => {
      const state = createDebuggerState({
        graphs: createDebuggerGraphsState({
          focusedOp: {
            graphId: 'g1',
            opName: 'TestOp_1',
          },
        }),
      });
      const nextState = reducers(
        state,
        actions.graphOpFocused({graph_id: 'g2', op_name: 'TestOp_12'})
      );
      expect(nextState.graphs.focusedOp).toEqual({
        graphId: 'g2',
        opName: 'TestOp_12',
      });
      expect(nextState.codeLocationFocusType).toBe(
        CodeLocationType.GRAPH_OP_CREATION
      );
    });

    for (const [
      stickToBottommostFrameInFocusedFile,
      stackFrameIsLoaded,
      expectedLineno,
      expectedFunctionName,
    ] of [
      [false, false, 20, 'main'],
      [false, true, 20, 'main'],
      [true, false, 20, 'main'],
      [true, true, 30, 'helper'],
    ] as Array<[boolean, boolean, number, string]>) {
      it(
        `focusLineSpec sticking behavior: ` +
          `stickToBottommostFrameInFocusedFile=` +
          `${stickToBottommostFrameInFocusedFile}; ` +
          `stackFrameIsLoaded=${stackFrameIsLoaded}`,
        () => {
          const stackFrame0 = createTestStackFrame({
            file_path: 'main.py',
            lineno: 10,
            function_name: '<module>',
          });
          const stackFrame1 = createTestStackFrame({
            file_path: 'main.py',
            lineno: 20,
            function_name: 'main',
          });
          const stackFrame2 = createTestStackFrame({
            file_path: 'main.py',
            lineno: 30,
            function_name: 'helper',
          });
          const state = createDebuggerState({
            graphs: createDebuggerGraphsState({
              ops: {
                g1: new Map([
                  [
                    'op1',
                    createTestGraphOpInfo({
                      stack_frame_ids: ['s0', 's1'],
                    }),
                  ],
                  [
                    'op2',
                    createTestGraphOpInfo({
                      stack_frame_ids: ['s0', 's2'],
                    }),
                  ],
                ]),
              },
              focusedOp: {
                graphId: 'g1',
                opName: 'op1',
              },
            }),
            stackFrames: stackFrameIsLoaded
              ? {
                  s0: stackFrame0,
                  s1: stackFrame1,
                  s2: stackFrame2,
                }
              : {
                  s0: stackFrame0,
                  s1: stackFrame1,
                },
            sourceCode: createDebuggerSourceCodeState({
              focusLineSpec: {
                host_name: 'localhost',
                file_path: 'main.py',
                lineno: 20,
                function_name: 'main',
              },
            }),
            stickToBottommostFrameInFocusedFile,
          });
          const nextState = reducers(
            state,
            actions.graphOpFocused({graph_id: 'g1', op_name: 'op2'})
          );
          expect(nextState.graphs.focusedOp).toEqual({
            graphId: 'g1',
            opName: 'op2',
          });
          expect(nextState.codeLocationFocusType).toBe(
            CodeLocationType.GRAPH_OP_CREATION
          );
          expect(nextState.sourceCode.focusLineSpec).toEqual({
            host_name: 'localhost',
            file_path: 'main.py',
            lineno: expectedLineno,
            function_name: expectedFunctionName,
          });
        }
      );
    }
  });

  describe('graphExecutionFocused', () => {
    it('sets focusIndex, focusedOp & focus type from empty state', () => {
      const state = createDebuggerState();
      const nextState = reducers(
        state,
        actions.graphExecutionFocused({
          index: 42,
          graph_id: 'g2',
          op_name: 'TestOp_12',
        })
      );
      expect(nextState.graphExecutions.focusIndex).toBe(42);
      expect(nextState.graphs.focusedOp).toEqual({
        graphId: 'g2',
        opName: 'TestOp_12',
      });
      expect(nextState.codeLocationFocusType).toBe(
        CodeLocationType.GRAPH_OP_CREATION
      );
    });

    it('sets focusIndex, focusedOp & focus type from non-empty state', () => {
      const state = createDebuggerState({
        graphExecutions: createDebuggerGraphExecutionsState({
          focusIndex: 3,
        }),
        graphs: createDebuggerGraphsState({
          focusedOp: {
            graphId: 'g1',
            opName: 'TestOp_1',
          },
        }),
      });
      const nextState = reducers(
        state,
        actions.graphExecutionFocused({
          index: 42,
          graph_id: 'g2',
          op_name: 'TestOp_12',
        })
      );
      expect(nextState.graphExecutions.focusIndex).toBe(42);
      expect(nextState.graphs.focusedOp).toEqual({
        graphId: 'g2',
        opName: 'TestOp_12',
      });
      expect(nextState.codeLocationFocusType).toBe(
        CodeLocationType.GRAPH_OP_CREATION
      );
    });
  });

  describe('graphOpInfoRequested', () => {
    it('creates key for new graph_id', () => {
      const state = createDebuggerState();
      const nextState = reducers(
        state,
        actions.graphOpInfoRequested({graph_id: 'g8', op_name: 'x'})
      );
      expect(nextState.graphs.loadingOps).toEqual({
        g8: new Map([['x', DataLoadState.LOADING]]),
      });
    });

    it('adds op to existing graph key', () => {
      const state = createDebuggerState({
        graphs: createDebuggerGraphsState({
          loadingOps: {
            g1: new Map([['Op1', DataLoadState.LOADING]]),
            g2: new Map([['Op2', DataLoadState.LOADING]]),
          },
        }),
      });
      const nextState = reducers(
        state,
        actions.graphOpInfoRequested({graph_id: 'g2', op_name: 'Op3'})
      );
      expect(nextState.graphs.loadingOps).toEqual({
        g1: new Map([['Op1', DataLoadState.LOADING]]),
        g2: new Map([
          ['Op2', DataLoadState.LOADING],
          ['Op3', DataLoadState.LOADING],
        ]),
      });
    });

    it('no effect for an already-loading op', () => {
      const state = createDebuggerState({
        graphs: createDebuggerGraphsState({
          loadingOps: {
            g1: new Map([['Op1', DataLoadState.LOADING]]),
            g2: new Map([['Op2', DataLoadState.LOADING]]),
          },
        }),
      });
      const nextState = reducers(
        state,
        actions.graphOpInfoRequested({graph_id: 'g2', op_name: 'Op2'})
      );
      expect(nextState.graphs.loadingOps).toEqual({
        g1: new Map([['Op1', DataLoadState.LOADING]]),
        g2: new Map([['Op2', DataLoadState.LOADING]]),
      });
    });
  });

  describe('graphOpInfoLoaded', () => {
    it('updates self op, 1 input op and 1 consumer op', () => {
      const opInfo0 = createTestGraphOpInfo();
      const state = createDebuggerState({
        graphs: createDebuggerGraphsState({
          ops: {
            g0: new Map([[opInfo0.op_name, opInfo0]]),
          },
          loadingOps: {
            g2: new Map([['TestOp_1', DataLoadState.LOADING]]),
          },
        }),
      });

      const opInfo1 = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      const opInfo2 = createTestGraphOpInfo({
        op_name: 'TestOp_1',
        graph_ids: ['g1', 'g2'],
      });
      opInfo1.consumers = [
        [
          {
            op_name: opInfo2.op_name,
            input_slot: 0,
          },
        ],
      ];
      opInfo2.inputs = [
        {
          op_name: opInfo1.op_name,
          output_slot: 0,
        },
      ];
      const opInfo3 = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      opInfo2.consumers = [
        [
          {
            op_name: opInfo3.op_name,
            input_slot: 0,
          },
        ],
      ];
      opInfo3.inputs = [
        {
          op_name: opInfo2.op_name,
          output_slot: 0,
        },
      ];
      const nextState = reducers(
        state,
        actions.graphOpInfoLoaded({
          graphOpInfoResponse: {
            ...opInfo2,
            inputs: [
              {
                ...opInfo2.inputs[0],
                data: opInfo1,
              },
            ],
            consumers: [
              [
                {
                  ...opInfo2.consumers[0][0],
                  data: opInfo3,
                },
              ],
            ],
          },
        })
      );

      expect(nextState.graphs.ops).toEqual({
        // Verify the old graph op data hasn't changed.
        g0: new Map([[opInfo0.op_name, opInfo0]]),
        // 'g2' is the immediately-enclosing graph of the three ops.
        g2: new Map([
          [opInfo1.op_name, opInfo1],
          [opInfo2.op_name, opInfo2],
          [opInfo3.op_name, opInfo3],
        ]),
      });
      // Verify that the input and consumer ops do not have the detailed data attached.
      expect(
        nextState.graphs.ops['g2'].get(opInfo2.op_name)!.inputs[0].data
      ).toBeUndefined();
      expect(
        nextState.graphs.ops['g2'].get(opInfo2.op_name)!.consumers[0][0].data
      ).toBeUndefined();
      expect(nextState.graphs.loadingOps).toEqual({
        g2: new Map([['TestOp_1', DataLoadState.LOADED]]),
      });
    });

    it('updates self op, 2 input ops and 2 consumer ops', () => {
      const opInfo0 = createTestGraphOpInfo();
      const state = createDebuggerState({
        graphs: createDebuggerGraphsState({
          ops: {
            // TODO(cais): Is typing necessary?
            g0: new Map([[opInfo0.op_name, opInfo0]]),
          },
          loadingOps: {
            g1: new Map([['TestOp_11', DataLoadState.LOADING]]),
            g2: new Map([
              ['TestOp_2', DataLoadState.LOADING],
              ['TestOp_22', DataLoadState.LOADING],
            ]),
          },
        }),
      });

      const opInfo1a = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      const opInfo1b = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      const opInfo2 = createTestGraphOpInfo({
        op_name: 'TestOp_2',
        graph_ids: ['g1', 'g2'],
      });
      opInfo1a.consumers = [
        [
          {
            op_name: opInfo2.op_name,
            input_slot: 0,
          },
        ],
      ];
      opInfo1b.consumers = [
        [
          {
            op_name: opInfo2.op_name,
            input_slot: 1,
          },
        ],
      ];
      opInfo2.inputs = [
        {
          op_name: opInfo1a.op_name,
          output_slot: 0,
        },
        {
          op_name: opInfo1b.op_name,
          output_slot: 0,
        },
      ];
      const opInfo3a = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      const opInfo3b = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      opInfo2.consumers = [
        [
          {
            op_name: opInfo3a.op_name,
            input_slot: 0,
          },
          {
            op_name: opInfo3b.op_name,
            input_slot: 0,
          },
        ],
      ];
      opInfo3a.inputs = [
        {
          op_name: opInfo2.op_name,
          output_slot: 0,
        },
      ];
      opInfo3b.inputs = [
        {
          op_name: opInfo2.op_name,
          output_slot: 0,
        },
      ];
      const nextState = reducers(
        state,
        actions.graphOpInfoLoaded({
          graphOpInfoResponse: {
            ...opInfo2,
            inputs: [
              {
                ...opInfo2.inputs[0],
                data: opInfo1a,
              },
              {
                ...opInfo2.inputs[1],
                data: opInfo1b,
              },
            ],
            consumers: [
              [
                {
                  ...opInfo2.consumers[0][0],
                  data: opInfo3a,
                },
                {
                  ...opInfo2.consumers[0][1],
                  data: opInfo3b,
                },
              ],
            ],
          },
        })
      );

      expect(nextState.graphs.ops).toEqual({
        // Verify the old graph op data hasn't changed.
        g0: new Map([[opInfo0.op_name, opInfo0]]),
        // 'g2' is the immediately-enclosing graph of the three ops.
        g2: new Map([
          [opInfo1a.op_name, opInfo1a],
          [opInfo1b.op_name, opInfo1b],
          [opInfo2.op_name, opInfo2],
          [opInfo3a.op_name, opInfo3a],
          [opInfo3b.op_name, opInfo3b],
        ]),
      });
      expect(nextState.graphs.loadingOps).toEqual({
        g1: new Map([['TestOp_11', DataLoadState.LOADING]]),
        g2: new Map([
          ['TestOp_2', DataLoadState.LOADED],
          ['TestOp_22', DataLoadState.LOADING],
        ]),
      });
    });

    it('updates self op and input op: no consumer op', () => {
      const opInfo0 = createTestGraphOpInfo();
      const state = createDebuggerState({
        graphs: createDebuggerGraphsState({
          ops: {
            // Pre-existing op in store.
            g0: new Map([[opInfo0.op_name, opInfo0]]),
          },
          loadingOps: {
            g2: new Map([['TestOp_3', DataLoadState.LOADING]]),
          },
        }),
      });

      const opInfo1 = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      const opInfo2 = createTestGraphOpInfo({
        op_name: 'TestOp_3',
        graph_ids: ['g1', 'g2'],
      });
      opInfo1.consumers = [
        [
          {
            op_name: opInfo2.op_name,
            input_slot: 0,
          },
        ],
      ];
      opInfo2.inputs = [
        {
          op_name: opInfo1.op_name,
          output_slot: 0,
        },
      ];
      opInfo2.consumers = []; // Has no consumers.
      const nextState = reducers(
        state,
        actions.graphOpInfoLoaded({
          graphOpInfoResponse: {
            ...opInfo2,
            inputs: [
              {
                ...opInfo2.inputs[0],
                data: opInfo1,
              },
            ],
          },
        })
      );

      expect(nextState.graphs.ops).toEqual({
        g0: new Map([[opInfo0.op_name, opInfo0]]),
        g2: new Map([
          [opInfo1.op_name, opInfo1],
          [opInfo2.op_name, opInfo2],
        ]),
      });
      expect(nextState.graphs.loadingOps).toEqual({
        g2: new Map([['TestOp_3', DataLoadState.LOADED]]),
      });
    });

    it('updates self op and consumer ops: no input ops', () => {
      const opInfo0 = createTestGraphOpInfo();
      const state = createDebuggerState({
        graphs: createDebuggerGraphsState({
          ops: {
            // Pre-existing op in store.
            g0: new Map([[opInfo0.op_name, opInfo0]]),
          },
          loadingOps: {
            g2: new Map([['TestOp_4', DataLoadState.LOADING]]),
          },
        }),
      });

      const opInfo1 = createTestGraphOpInfo({
        op_name: 'TestOp_4',
        graph_ids: ['g1', 'g2'],
      });
      opInfo1.inputs = []; // Has no inputs.
      const opInfo2 = createTestGraphOpInfo({
        graph_ids: ['g1', 'g2'],
      });
      opInfo1.consumers = [
        [
          {
            op_name: opInfo2.op_name,
            input_slot: 0,
          },
        ],
      ];
      opInfo2.inputs = [
        {
          op_name: opInfo1.op_name,
          output_slot: 0,
        },
      ];
      const nextState = reducers(
        state,
        actions.graphOpInfoLoaded({
          graphOpInfoResponse: {
            ...opInfo1,
            consumers: [
              [
                {
                  ...opInfo1.consumers[0][0],
                  data: opInfo2,
                },
              ],
            ],
          },
        })
      );

      expect(nextState.graphs.ops).toEqual({
        g0: new Map([[opInfo0.op_name, opInfo0]]),
        g2: new Map([
          [opInfo1.op_name, opInfo1],
          [opInfo2.op_name, opInfo2],
        ]),
      });
      expect(nextState.graphs.loadingOps).toEqual({
        g2: new Map([['TestOp_4', DataLoadState.LOADED]]),
      });
    });
  });
});
