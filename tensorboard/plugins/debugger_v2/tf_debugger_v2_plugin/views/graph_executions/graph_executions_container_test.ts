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
/**
 * Unit tests for the the intra-graph execution component and container.
 */
import {CommonModule} from '@angular/common';
import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';

import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {State, GraphExecution} from '../../store/debugger_types';
import {getNumGraphExecutions, getGraphExecutionData} from '../../store';
import {
  createDebuggerState,
  createState,
  createTestGraphExecution,
} from '../../testing';
import {AlertsModule} from '../alerts/alerts_module';
import {ExecutionDataModule} from '../execution_data/execution_data_module';
import {InactiveModule} from '../inactive/inactive_module';
import {SourceFilesModule} from '../source_files/source_files_module';
import {StackTraceModule} from '../stack_trace/stack_trace_module';
import {TimelineModule} from '../timeline/timeline_module';
import {GraphExecutionsContainer} from './graph_executions_container';
import {GraphExecutionsModule} from './graph_executions_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Graph Executions Container', () => {
  let store: MockStore<State>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [
        AlertsModule,
        CommonModule,
        ExecutionDataModule,
        GraphExecutionsModule,
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
      ],
    }).compileComponents();
    store = TestBed.get(Store);
  });

  it('does not render execs viewport if # execs = 0', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 0);
    fixture.autoDetectChanges();
    tick(500);

    const titleElement = fixture.debugElement.query(
      By.css('.graph-executions-title')
    );
    expect(titleElement.nativeElement.innerText).toBe('Graph Executions (0)');
    const viewPort = fixture.debugElement.query(
      By.css('.graph-executions-viewport')
    );
    expect(viewPort).toBeNull();
  }));

  it('renders # execs and execs viewport if # execs > 0; fully loaded', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 120);
    const graphExecutionData: {[index: number]: GraphExecution} = {};
    for (let i = 0; i < 120; ++i) {
      graphExecutionData[i] = createTestGraphExecution({
        op_name: `TestOp_${i}`,
        op_type: `OpType_${i}`,
      });
    }
    store.overrideSelector(getGraphExecutionData, graphExecutionData);
    fixture.autoDetectChanges();
    tick(500);

    const titleElement = fixture.debugElement.query(
      By.css('.graph-executions-title')
    );
    expect(titleElement.nativeElement.innerText).toBe('Graph Executions (120)');
    const viewPort = fixture.debugElement.query(
      By.css('.graph-executions-viewport')
    );
    expect(viewPort).not.toBeNull();
    const tensorContainers = fixture.debugElement.queryAll(
      By.css('.tensor-container')
    );
    expect(tensorContainers.length).toBeGreaterThan(0);
    const graphExecutionIndices = fixture.debugElement.queryAll(
      By.css('.graph-execution-index')
    );
    const tensorNames = fixture.debugElement.queryAll(By.css('.tensor-name'));
    const opTypes = fixture.debugElement.queryAll(By.css('.op-type'));
    expect(graphExecutionIndices.length).toBe(tensorContainers.length);
    expect(tensorNames.length).toBe(tensorContainers.length);
    expect(opTypes.length).toBe(tensorContainers.length);
    for (let i = 0; i < tensorNames.length; ++i) {
      expect(graphExecutionIndices[i].nativeElement.innerText).toBe(`${i}`);
      expect(tensorNames[i].nativeElement.innerText).toBe(`TestOp_${i}:0`);
      expect(opTypes[i].nativeElement.innerText).toBe(`OpType_${i}`);
    }
  }));

  it('renders # execs and execs viewport if # execs > 0; not loaded', fakeAsync(() => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 120);
    store.overrideSelector(getGraphExecutionData, {});
    fixture.autoDetectChanges();
    tick(500);

    const titleElement = fixture.debugElement.query(
      By.css('.graph-executions-title')
    );
    expect(titleElement.nativeElement.innerText).toBe('Graph Executions (120)');
    const viewPort = fixture.debugElement.query(
      By.css('.graph-executions-viewport')
    );
    expect(viewPort).not.toBeNull();
    const tensorContainers = fixture.debugElement.queryAll(
      By.css('.tensor-container')
    );
    expect(tensorContainers.length).toBeGreaterThan(0);
    const graphExecutionIndices = fixture.debugElement.queryAll(
      By.css('.graph-execution-index')
    );
    const loadingElements = fixture.debugElement.queryAll(
      By.css('.loading-spinner')
    );
    const tensorNames = fixture.debugElement.queryAll(By.css('.tensor-name'));
    const opTypes = fixture.debugElement.queryAll(By.css('.op-type'));
    expect(graphExecutionIndices.length).toBe(tensorContainers.length);
    expect(loadingElements.length).toBe(tensorContainers.length);
    expect(tensorNames.length).toBe(0);
    expect(opTypes.length).toBe(0);
  }));
});
