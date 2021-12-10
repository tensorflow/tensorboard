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
 * Unit tests for the Execution Data Container.
 */
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {
  DataLoadState,
  State,
  TensorDebugMode,
} from '../../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createTestExecutionData,
} from '../../testing';
import {ExecutionDataContainer} from './execution_data_container';
import {ExecutionDataModule} from './execution_data_module';

describe('Execution Data Container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [CommonModule, ExecutionDataModule],
      providers: [
        provideMockStore({
          initialState: createState(createDebuggerState()),
        }),
        DebuggerContainer,
      ],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

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
              loadingRanges: [],
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
              loadingRanges: [],
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
                debug_tensor_values: [
                  [0, 0],
                  [0, 1],
                ],
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
