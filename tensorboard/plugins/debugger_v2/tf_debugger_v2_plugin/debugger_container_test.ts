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
  executionScrollToIndex,
  sourceLineFocused,
} from './actions';
import {DebuggerComponent} from './debugger_component';
import {DebuggerContainer} from './debugger_container';
import {
  CodeLocationType,
  DataLoadState,
  State,
  AlertType,
  TensorDebugMode,
} from './store/debugger_types';
import {
  getCodeLocationFocusType,
  getFocusedExecutionData,
  getFocusedGraphOpInfo,
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
} from './store';
import {
  createAlertsState,
  createDebuggerState,
  createState,
  createDebuggerExecutionsState,
  createDebuggerStateWithLoadedExecutionDigests,
  createTestExecutionData,
  createTestGraphOpInfo,
  createTestStackFrame,
} from './testing';
import {AlertsModule} from './views/alerts/alerts_module';
import {ExecutionDataContainer} from './views/execution_data/execution_data_container';
import {ExecutionDataModule} from './views/execution_data/execution_data_module';
import {GraphExecutionsModule} from './views/graph_executions/graph_executions_module';
import {GraphModule} from './views/graph/graph_module';
import {InactiveModule} from './views/inactive/inactive_module';
import {TimelineContainer} from './views/timeline/timeline_container';
import {SourceFilesModule} from './views/source_files/source_files_module';
import {StackTraceContainer} from './views/stack_trace/stack_trace_container';
import {StackTraceModule} from './views/stack_trace/stack_trace_module';
import {TimelineModule} from './views/timeline/timeline_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Debugger Container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [
        AlertsModule,
        CommonModule,
        ExecutionDataModule,
        GraphExecutionsModule,
        GraphModule,
        InactiveModule,
        SourceFilesModule,
        StackTraceModule,
        TimelineModule,
      ],
      providers: [
        provideMockStore({
          initialState: createState(createDebuggerState()),
        }),
        DebuggerContainer,
        TimelineContainer,
      ],
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

  describe('Timeline module', () => {
    it('shows loading number of executions', () => {
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

    it('hides loading number of executions', () => {
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

    it('shows correct display range for executions', () => {
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
      expect(navigationPositionInfoElement.nativeElement.innerText).toBe(
        'Execution: 977 ~ 1076 of 1500'
      );
    });

    it('left-button click dispatches executionScrollLeft action', () => {
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
      expect(dispatchSpy).toHaveBeenCalledWith(executionScrollLeft());
    });

    it('right-button click dispatches executionScrollRight action', () => {
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
      expect(dispatchSpy).toHaveBeenCalledWith(executionScrollRight());
    });

    it('displays correct op names', () => {
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

    it('displays correct InfNanAlert alert type', () => {
      const fixture = TestBed.createComponent(TimelineContainer);
      fixture.detectChanges();
      const scrollBeginIndex = 5;
      const displayCount = 4;
      const opTypes: string[] = [];
      for (let i = 0; i < 200; ++i) {
        opTypes.push(`${i}Op`);
      }
      const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
        scrollBeginIndex,
        displayCount,
        opTypes
      );
      debuggerState.alerts = createAlertsState({
        focusType: AlertType.INF_NAN_ALERT,
        executionIndices: {
          [AlertType.INF_NAN_ALERT]: [
            4, // Outside the viewing window.
            6, // Inside the viewing window; same below.
            8,
          ],
        },
      });
      store.setState(createState(debuggerState));
      fixture.detectChanges();

      const digestsWithAlert = fixture.debugElement.queryAll(
        By.css('.execution-digest.InfNanAlert')
      );
      expect(digestsWithAlert.length).toBe(2);
      expect(digestsWithAlert[0].nativeElement.innerText).toEqual('6');
      expect(digestsWithAlert[1].nativeElement.innerText).toEqual('8');
    });

    for (const numExecutions of [1, 9, 10]) {
      it(`hides slider if # of executions ${numExecutions} <= display count`, () => {
        const fixture = TestBed.createComponent(TimelineContainer);
        fixture.detectChanges();
        const scrollBeginIndex = 0;
        const displayCount = 10;
        const opTypes: string[] = new Array<string>(numExecutions);
        opTypes.fill('MatMul');
        const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
          scrollBeginIndex,
          displayCount,
          opTypes
        );
        store.setState(createState(debuggerState));
        fixture.detectChanges();

        const sliders = fixture.debugElement.queryAll(
          By.css('.timeline-slider')
        );
        expect(sliders.length).toBe(0);
      });
    }

    for (const numExecutions of [11, 12, 20]) {
      const displayCount = 10;
      for (const scrollBeginIndex of [0, 1, numExecutions - displayCount]) {
        it(
          `shows slider if # of executions ${numExecutions} > display count, ` +
            `scrollBeginIndex = ${scrollBeginIndex}`,
          () => {
            const fixture = TestBed.createComponent(TimelineContainer);
            fixture.detectChanges();
            const opTypes: string[] = new Array<string>(numExecutions);
            opTypes.fill('MatMul');
            const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
              scrollBeginIndex,
              displayCount,
              opTypes
            );
            store.setState(createState(debuggerState));
            fixture.detectChanges();

            const sliders = fixture.debugElement.queryAll(
              By.css('.timeline-slider')
            );
            expect(sliders.length).toBe(1);
            const [slider] = sliders;
            expect(slider.attributes['aria-valuemin']).toBe('0');
            expect(slider.attributes['aria-valuemax']).toBe(
              String(numExecutions - displayCount)
            );
            expect(slider.attributes['aria-valuenow']).toBe(
              String(scrollBeginIndex)
            );
          }
        );
      }
    }
  });

  for (const scrollBeginIndex of [0, 1, 5]) {
    it(`changes slider dispatches executionToScrollIndex (${scrollBeginIndex})`, () => {
      const fixture = TestBed.createComponent(TimelineContainer);
      fixture.detectChanges();
      const numExecutions = 10;
      const displayCount = 5;
      const opTypes: string[] = new Array<string>(numExecutions);
      opTypes.fill('MatMul');
      const debuggerState = createDebuggerStateWithLoadedExecutionDigests(
        scrollBeginIndex,
        displayCount,
        opTypes
      );
      store.setState(createState(debuggerState));
      fixture.detectChanges();

      const slider = fixture.debugElement.query(By.css('.timeline-slider'));

      slider.triggerEventHandler('change', {value: scrollBeginIndex});
      fixture.detectChanges();
      expect(dispatchSpy).toHaveBeenCalledWith(
        executionScrollToIndex({index: scrollBeginIndex})
      );
    });
  }

  describe('Execution Data module', () => {
    it('CURT_HEALTH TensorDebugMode, One Output', () => {
      const fixture = TestBed.createComponent(ExecutionDataContainer);
      fixture.detectChanges();

      store.setState(
        createState(
          createDebuggerState({
            executions: {
              numExecutionsLoaded: {
                state: DataLoadState.LOADED,
                lastLoadedTimeInMs: 111,
              },
              executionDigestsLoaded: {
                state: DataLoadState.LOADED,
                lastLoadedTimeInMs: 222,
                pageLoadedSizes: {0: 100},
                numExecutions: 1000,
              },
              executionDigests: {},
              pageSize: 100,
              displayCount: 50,
              scrollBeginIndex: 90,
              focusIndex: 98,
              executionData: {
                98: createTestExecutionData({
                  op_type: 'Inverse',
                  tensor_debug_mode: TensorDebugMode.CURT_HEALTH,
                  debug_tensor_values: [[0, 1]],
                }),
              },
            },
          })
        )
      );
      fixture.detectChanges();

      const opTypeElement = fixture.debugElement.query(By.css('.op-type'));
      expect(opTypeElement.nativeElement.innerText).toEqual('Inverse');
      const inputTensorsElement = fixture.debugElement.query(
        By.css('.input-tensors')
      );
      expect(inputTensorsElement.nativeElement.innerText).toEqual('1');
      const outputTensorsElement = fixture.debugElement.query(
        By.css('.output-tensors')
      );
      expect(outputTensorsElement.nativeElement.innerText).toEqual('1');
      const outputSlotElements = fixture.debugElement.queryAll(
        By.css('.output-slot-number')
      );
      expect(outputSlotElements.length).toBe(1);
      expect(outputSlotElements[0].nativeElement.innerText).toBe(
        'Output slot 0:'
      );
      const debugTensorValueElements = fixture.debugElement.queryAll(
        By.css('debug-tensor-value')
      );
      expect(debugTensorValueElements.length).toBe(1);
    });

    it('CURT_HEALTH TensorDebugMode, Two Outputs', () => {
      const fixture = TestBed.createComponent(ExecutionDataContainer);
      fixture.detectChanges();

      store.setState(
        createState(
          createDebuggerState({
            executions: {
              numExecutionsLoaded: {
                state: DataLoadState.LOADED,
                lastLoadedTimeInMs: 111,
              },
              executionDigestsLoaded: {
                state: DataLoadState.LOADED,
                lastLoadedTimeInMs: 222,
                pageLoadedSizes: {0: 100},
                numExecutions: 1000,
              },
              executionDigests: {},
              pageSize: 100,
              displayCount: 50,
              scrollBeginIndex: 90,
              focusIndex: 98,
              executionData: {
                98: createTestExecutionData({
                  op_type: 'Inverse',
                  output_tensor_ids: [10, 11],
                  tensor_debug_mode: TensorDebugMode.CURT_HEALTH,
                  debug_tensor_values: [[0, 0], [0, 1]],
                }),
              },
            },
          })
        )
      );
      fixture.detectChanges();

      const opTypeElement = fixture.debugElement.query(By.css('.op-type'));
      expect(opTypeElement.nativeElement.innerText).toEqual('Inverse');
      const inputTensorsElement = fixture.debugElement.query(
        By.css('.input-tensors')
      );
      expect(inputTensorsElement.nativeElement.innerText).toEqual('1');
      const outputTensorsElement = fixture.debugElement.query(
        By.css('.output-tensors')
      );
      expect(outputTensorsElement.nativeElement.innerText).toEqual('2');
      const outputSlotElements = fixture.debugElement.queryAll(
        By.css('.output-slot-number')
      );
      expect(outputSlotElements.length).toBe(2);
      expect(outputSlotElements[0].nativeElement.innerText).toBe(
        'Output slot 0:'
      );
      expect(outputSlotElements[1].nativeElement.innerText).toBe(
        'Output slot 1:'
      );
      const debugTensorValueElements = fixture.debugElement.queryAll(
        By.css('debug-tensor-value')
      );
      expect(debugTensorValueElements.length).toBe(2);
    });
  });

  describe('Stack Trace container', () => {
    for (const {codeLocationType, expectedTypeString} of [
      {
        codeLocationType: CodeLocationType.EXECUTION,
        expectedTypeString: 'Eager execution of',
      },
      {
        codeLocationType: CodeLocationType.GRAPH_OP_CREATION,
        expectedTypeString: 'Creation of graph op',
      },
    ]) {
      it(
        `shows non-empty stack frames; highlights focused frame; ` +
          `code location type = ${codeLocationType}`,
        () => {
          const fixture = TestBed.createComponent(StackTraceContainer);
          store.overrideSelector(getCodeLocationFocusType, codeLocationType);
          if (codeLocationType === CodeLocationType.EXECUTION) {
            store.overrideSelector(
              getFocusedExecutionData,
              createTestExecutionData({
                op_type: 'FooOp',
              })
            );
          } else if (codeLocationType === CodeLocationType.GRAPH_OP_CREATION) {
            store.overrideSelector(
              getFocusedGraphOpInfo,
              createTestGraphOpInfo({
                op_type: 'FooOp',
                op_name: 'scope_1/foo_2',
              })
            );
          }
          const stackFrame0 = createTestStackFrame();
          const stackFrame1 = createTestStackFrame();
          const stackFrame2 = createTestStackFrame();
          store.overrideSelector(getFocusedStackFrames, [
            stackFrame0,
            stackFrame1,
            stackFrame2,
          ]);
          store.overrideSelector(getFocusedSourceLineSpec, {
            host_name: stackFrame1[0],
            file_path: stackFrame1[1],
            lineno: stackFrame1[2],
          });
          fixture.detectChanges();

          const stackTraceTypeElement = fixture.debugElement.query(
            By.css('.stack-trace-type')
          );
          expect(stackTraceTypeElement.nativeElement.innerText.trim()).toBe(
            expectedTypeString
          );
          const opTypeElement = fixture.debugElement.query(By.css('.op-type'));
          expect(opTypeElement.nativeElement.innerText.trim()).toBe('FooOp');
          const opNameElement = fixture.debugElement.query(By.css('.op-name'));
          if (codeLocationType === CodeLocationType.EXECUTION) {
            // Eager ops don't have names.
            expect(opNameElement).toBeNull();
          } else {
            expect(opNameElement.nativeElement.innerText.trim()).toBe(
              '"scope_1/foo_2"'
            );
          }
          const hostNameElement = fixture.debugElement.query(
            By.css('.stack-trace-host-name')
          );
          expect(hostNameElement.nativeElement.innerText).toBe(
            '(Host name: localhost)'
          );
          const stackFrameContainers = fixture.debugElement.queryAll(
            By.css('.stack-frame-container')
          );
          expect(stackFrameContainers.length).toBe(3);

          const filePathElements = fixture.debugElement.queryAll(
            By.css('.stack-frame-file-path')
          );
          expect(filePathElements.length).toBe(3);
          expect(filePathElements[0].nativeElement.innerText).toBe(
            stackFrame0[1].slice(stackFrame0[1].lastIndexOf('/') + 1)
          );
          expect(filePathElements[0].nativeElement.title).toBe(stackFrame0[1]);
          expect(filePathElements[1].nativeElement.innerText).toBe(
            stackFrame1[1].slice(stackFrame1[1].lastIndexOf('/') + 1)
          );
          expect(filePathElements[1].nativeElement.title).toBe(stackFrame1[1]);
          expect(filePathElements[2].nativeElement.innerText).toBe(
            stackFrame2[1].slice(stackFrame2[1].lastIndexOf('/') + 1)
          );
          expect(filePathElements[2].nativeElement.title).toBe(stackFrame2[1]);

          const linenoElements = fixture.debugElement.queryAll(
            By.css('.stack-frame-lineno')
          );
          expect(linenoElements.length).toBe(3);
          expect(linenoElements[0].nativeElement.innerText).toBe(
            `Line ${stackFrame0[2]}`
          );
          expect(linenoElements[1].nativeElement.innerText).toBe(
            `Line ${stackFrame1[2]}`
          );
          expect(linenoElements[2].nativeElement.innerText).toBe(
            `Line ${stackFrame2[2]}`
          );

          const functionElements = fixture.debugElement.queryAll(
            By.css('.stack-frame-function')
          );
          expect(functionElements.length).toBe(3);
          expect(functionElements[0].nativeElement.innerText).toBe(
            stackFrame0[3]
          );
          expect(functionElements[1].nativeElement.innerText).toBe(
            stackFrame1[3]
          );
          expect(functionElements[2].nativeElement.innerText).toBe(
            stackFrame2[3]
          );

          // Check the focused stack frame has been highlighted by CSS class.
          const focusedElements = fixture.debugElement.queryAll(
            By.css('.focused-stack-frame')
          );
          expect(focusedElements.length).toBe(1);
          const focusedFilePathElement = focusedElements[0].query(
            By.css('.stack-frame-file-path')
          );
          expect(focusedFilePathElement.nativeElement.innerText).toBe(
            stackFrame1[1].slice(stackFrame1[1].lastIndexOf('/') + 1)
          );
        }
      );
    }

    it('shows no-stack-trace message when no op is focused', () => {
      const fixture = TestBed.createComponent(StackTraceContainer);
      store.overrideSelector(getCodeLocationFocusType, null);
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('.stack-trace-type'))
      ).toBeNull();
      expect(fixture.debugElement.query(By.css('.op-type'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.op-name'))).toBeNull();
      expect(
        fixture.debugElement.query(By.css('.stack-frame-array'))
      ).toBeNull();
      const noStackTrace = fixture.debugElement.query(
        By.css('.no-stack-trace')
      );
      expect(noStackTrace.nativeElement.innerText).toMatch(
        /to show .* stack trace/
      );
    });

    it('does not highlight any frame when there is no frame focus', () => {
      const fixture = TestBed.createComponent(StackTraceContainer);
      const stackFrame0 = createTestStackFrame();
      const stackFrame1 = createTestStackFrame();
      const stackFrame2 = createTestStackFrame();
      store.overrideSelector(getFocusedStackFrames, [
        stackFrame0,
        stackFrame1,
        stackFrame2,
      ]);
      store.overrideSelector(getFocusedSourceLineSpec, null);
      fixture.detectChanges();

      // Check that no stack frame has been highlighted by CSS class.
      const focusedElements = fixture.debugElement.queryAll(
        By.css('.focused-stack-frame')
      );
      expect(focusedElements.length).toBe(0);
    });

    it('Shows loading state when stack-trace data is unavailable', () => {
      const fixture = TestBed.createComponent(StackTraceContainer);
      store.overrideSelector(getFocusedStackFrames, []);
      fixture.detectChanges();

      const stackFrameContainers = fixture.debugElement.queryAll(
        By.css('.stack-frame-container')
      );
      expect(stackFrameContainers.length).toBe(0);
    });

    it('Emits sourceLineFocused when line number is clicked', () => {
      const fixture = TestBed.createComponent(StackTraceContainer);
      const stackFrame0 = createTestStackFrame();
      const stackFrame1 = createTestStackFrame();
      const stackFrame2 = createTestStackFrame();
      store.overrideSelector(getFocusedStackFrames, [
        stackFrame0,
        stackFrame1,
        stackFrame2,
      ]);
      fixture.detectChanges();

      const linenoElements = fixture.debugElement.queryAll(
        By.css('.stack-frame-lineno')
      );
      linenoElements[1].nativeElement.click();
      fixture.detectChanges();
      expect(dispatchSpy).toHaveBeenCalledWith(
        sourceLineFocused({
          sourceLineSpec: {
            host_name: stackFrame1[0],
            file_path: stackFrame1[1],
            lineno: stackFrame1[2],
          },
        })
      );
    });
  });
});
