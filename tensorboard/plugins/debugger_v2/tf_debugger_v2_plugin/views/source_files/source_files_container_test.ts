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
 * Unit tests for the the Source Files component and container.
 */
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {DataLoadState, State} from '../../store/debugger_types';
import {createDebuggerState, createState} from '../../testing';
import {AlertsModule} from '../alerts/alerts_module';
import {ExecutionDataModule} from '../execution_data/execution_data_module';
import {GraphExecutionsModule} from '../graph_executions/graph_executions_module';
import {InactiveModule} from '../inactive/inactive_module';
import {setUpMonacoFakes, tearDownMonacoFakes} from '../source_code/testing';
import {StackTraceModule} from '../stack_trace/stack_trace_module';
import {
  getFocusedSourceFileContent,
  getFocusedSourceLineSpec,
} from '../../store';
import {TimelineModule} from '../timeline/timeline_module';
import {SourceFilesContainer} from './source_files_container';
import {SourceFilesModule} from './source_files_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Source Files Container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    setUpMonacoFakes();
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
      providers: [provideMockStore(), DebuggerContainer],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch');
  });

  afterEach(() => {
    tearDownMonacoFakes();
  });

  it('renders no file selected when no source line is focused on', () => {
    const fixture = TestBed.createComponent(SourceFilesContainer);
    store.setState(createState(createDebuggerState()));
    fixture.detectChanges();

    const noFileSelectedElement = fixture.debugElement.query(
      By.css('.no-file-selected')
    );
    expect(noFileSelectedElement.nativeElement.innerText).toBe(
      '(No file selected)'
    );

    const sourceCodeElements = fixture.debugElement.queryAll(
      By.css('source-code-component')
    );
    expect(sourceCodeElements.length).toBe(0);
  });

  it('renders file path and editor when a file is focused on', async () => {
    const fixture = TestBed.createComponent(SourceFilesContainer);
    store.overrideSelector(getFocusedSourceFileContent, {
      loadState: DataLoadState.LOADED,
      lines: ['import tensorflow as tf', '', 'print("hello, world")'],
    });
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/home/user/main.py',
      lineno: 3,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    let fileLabelElement = fixture.debugElement.query(By.css('.file-label'));
    expect(fileLabelElement.nativeElement.innerText).toBe('/home/user/main.py');

    const sourceCodeElements = fixture.debugElement.queryAll(
      By.css('source-code-component')
    );
    expect(sourceCodeElements.length).toBe(1);

    // Check the behavior when a new file is focused on.
    store.overrideSelector(getFocusedSourceFileContent, {
      loadState: DataLoadState.LOADED,
      lines: [
        'model = tf.keras.Sequential',
        'model.add(tf.keras.layers.Dense(1))',
      ],
    });
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/home/user/model.py',
      lineno: 1,
    });
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    fileLabelElement = fixture.debugElement.query(By.css('.file-label'));
    expect(fileLabelElement.nativeElement.innerText).toBe(
      '/home/user/model.py'
    );
  });
});
