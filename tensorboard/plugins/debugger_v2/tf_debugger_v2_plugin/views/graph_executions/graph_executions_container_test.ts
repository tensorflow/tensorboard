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
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {State} from '../../store/debugger_types';
import {createDebuggerState, createState} from '../../testing';
import {AlertsModule} from '../alerts/alerts_module';
import {ExecutionDataModule} from '../execution_data/execution_data_module';
import {InactiveModule} from '../inactive/inactive_module';
import {SourceFilesModule} from '../source_files/source_files_module';
import {StackTraceModule} from '../stack_trace/stack_trace_module';
import {TimelineModule} from '../timeline/timeline_module';
import {GraphExecutionsContainer} from './graph_executions_container';
import {GraphExecutionsModule} from './graph_executions_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';
import {getNumGraphExecutions} from '../../store';

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

  it('renders number of graph executions', () => {
    const fixture = TestBed.createComponent(GraphExecutionsContainer);
    store.overrideSelector(getNumGraphExecutions, 120);
    fixture.detectChanges();

    const titleElement = fixture.debugElement.query(
      By.css('.graph-executions-title')
    );
    expect(titleElement.nativeElement.innerText).toBe('Graph Executions (120)');
  });
});
