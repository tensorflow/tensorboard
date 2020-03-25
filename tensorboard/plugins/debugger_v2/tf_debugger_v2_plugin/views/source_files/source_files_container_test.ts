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
import {InactiveModule} from '../inactive/inactive_module';
import * as loadMonacoShim from '../source_code/load_monaco_shim';
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

  class FakeRange {
    constructor(
      readonly startLineNumber: number,
      readonly startColumn: number,
      readonly endLineNumber: number,
      readonly endColumn: number
    ) {}
  }

  let loadMonacoSpy: jasmine.Spy;
  // TODO(cais): Explore better typing by depending on 3rd-party libraries.
  let editorSpy: jasmine.SpyObj<any>;
  let monaco: any;
  function setUpMonacoFakes() {
    async function fakeLoadMonaco() {
      monaco = {
        editor: {
          create: () => {
            editorSpy = jasmine.createSpyObj('editorSpy', [
              'deltaDecorations',
              'revealLineInCenter',
              'setValue',
            ]);
            return editorSpy;
          },
          ScrollType: {
            Immediate: 1,
            Smooth: 0,
          },
        },
        Range: FakeRange,
      };
      loadMonacoShim.windowWithRequireAndMonaco.monaco = monaco;
    }
    loadMonacoSpy = spyOn(loadMonacoShim, 'loadMonaco').and.callFake(
      fakeLoadMonaco
    );
  }

  function tearDownMonacoFakes() {
    if (loadMonacoShim.windowWithRequireAndMonaco.monaco !== undefined) {
      delete loadMonacoShim.windowWithRequireAndMonaco.monaco;
    }
  }

  beforeEach(async () => {
    setUpMonacoFakes();
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [
        AlertsModule,
        CommonModule,
        ExecutionDataModule,
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
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    let fileLabelElement = fixture.debugElement.query(By.css('.file-label'));
    expect(fileLabelElement.nativeElement.innerText).toBe('/home/user/main.py');
    expect(loadMonacoSpy).toHaveBeenCalledTimes(1);
    expect(editorSpy.setValue).not.toHaveBeenCalled();
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      3,
      monaco.editor.ScrollType.Smooth
    );
    expect(editorSpy.deltaDecorations).toHaveBeenCalledTimes(1);

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
    // Switching to a different file relies on setValue() to render the code
    // of the new file.
    expect(editorSpy.setValue).toHaveBeenCalledTimes(1);
    expect(editorSpy.setValue).toHaveBeenCalledWith(
      'model = tf.keras.Sequential\nmodel.add(tf.keras.layers.Dense(1))'
    );
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledTimes(2);
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      1,
      monaco.editor.ScrollType.Smooth
    );
    expect(editorSpy.deltaDecorations).toHaveBeenCalledTimes(2);
  });

  it('switching to a different line in the same file', async () => {
    const fixture = TestBed.createComponent(SourceFilesContainer);
    store.overrideSelector(getFocusedSourceFileContent, {
      loadState: DataLoadState.LOADED,
      lines: ['import tensorflow as tf', '', 'print("hello, world")'],
    });
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/home/user/main.py',
      lineno: 2,
    });
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    // Check the behavior when a new file is focused on.
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/home/user/main.py',
      lineno: 1, // Focusing on a different line of the same file.
    });
    store.refreshState();
    fixture.detectChanges();
    await fixture.whenStable();

    const fileLabelElement = fixture.debugElement.query(By.css('.file-label'));
    expect(fileLabelElement.nativeElement.innerText).toBe('/home/user/main.py');
    // setValue() shouldn't have been called because there is no change in file
    // content.
    expect(editorSpy.setValue).toHaveBeenCalledTimes(0);
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledTimes(2);
    // This is the call for the old lineno.
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      2,
      monaco.editor.ScrollType.Smooth
    );
    // This is the call for the new lineno.
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      1,
      monaco.editor.ScrollType.Smooth
    );
  });
});
