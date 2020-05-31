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
import {TestBed} from '@angular/core/testing';
import {provideMockActions} from '@ngrx/effects/testing';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {ReplaySubject} from 'rxjs';
import {sourceLineFocused} from '../actions';
import {Tfdbg2HttpServerDataSource} from '../data_source/tfdbg2_data_source';
import {
  getFocusedStackFrames,
  getFocusedSourceLineSpec,
  getStickToBottommostFrameInFocusedFile,
} from '../store';
import {State} from '../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createTestStackFrame,
} from '../testing';
import {TBHttpClientTestingModule} from '../../../../webapp/webapp_data_source/tb_http_client_testing';

import {StackTraceEffects} from './stack_trace_effects';

describe('Stack trace effects', () => {
  let stackTraceEffects: StackTraceEffects;
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
        StackTraceEffects,
        Tfdbg2HttpServerDataSource,
        provideMockStore({initialState}),
      ],
    }).compileComponents();
    stackTraceEffects = TestBed.inject(StackTraceEffects);

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      dispatchedActions.push(action);
    });
    // Subscribe to the effects.
    stackTraceEffects.stickingToBottommostFrameEffect$.subscribe();
  });

  const stackFrame0 = createTestStackFrame('/tmp/file_1.py', 5);
  const stackFrame1 = createTestStackFrame('/tmp/file_2.py', 10);
  const stackFrame2 = createTestStackFrame('/tmp/file_2.py', 20);
  const stackFrame3 = createTestStackFrame('/tmp/file_3.py', 99);

  it('focuses on bottommost frame on enabling sticking-to-bottommost', () => {
    store.overrideSelector(getFocusedStackFrames, [
      stackFrame0,
      stackFrame1,
      stackFrame2,
      stackFrame3,
    ]);
    // This is a non-bottommost stack frame in the file /tmp/file_2.py.
    // We expect an action to be dispatched to focus on the bottommost frame in
    // the same file when stickToBottommostFrameInFocusedFile is enabled.
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/tmp/file_2.py',
      lineno: 10,
    });
    store.overrideSelector(getStickToBottommostFrameInFocusedFile, false);
    store.refreshState();

    store.overrideSelector(getStickToBottommostFrameInFocusedFile, true);
    store.refreshState();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      sourceLineFocused({
        sourceLineSpec: {
          host_name: 'localhost',
          file_path: '/tmp/file_2.py',
          lineno: 20,
        },
      })
    );
  });

  it('focuses on bottommost frame when focused file changes', () => {
    store.overrideSelector(getFocusedStackFrames, [
      stackFrame0,
      stackFrame1,
      stackFrame2,
    ]);
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/tmp/file_1.py',
      lineno: 5,
    }); // Focused on a stack frame in a different file, initially.
    store.overrideSelector(getStickToBottommostFrameInFocusedFile, true);
    store.refreshState();

    // `lineno: 10` is not the bottommost stack frame in the file
    // /tmp/file_2.py.
    // We assert the effect will focus onto the bottommost frame (lineno = 20).
    // instead.
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/tmp/file_2.py',
      lineno: 10,
    });
    store.refreshState();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      sourceLineFocused({
        sourceLineSpec: {
          host_name: 'localhost',
          file_path: '/tmp/file_2.py',
          lineno: 20,
        },
      })
    );
  });

  it('does not dispatch new action when new focus frame is bottommost', () => {
    store.overrideSelector(getFocusedStackFrames, [
      stackFrame0,
      stackFrame1,
      stackFrame2,
    ]);
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/tmp/file_1.py',
      lineno: 5,
    }); // Focused on a stack frame in a different file, initially.
    store.overrideSelector(getStickToBottommostFrameInFocusedFile, true);
    store.refreshState();

    // `lineno: 20` is already the bottommost stack frame in the file
    // /tmp/file_2.py.
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/tmp/file_2.py',
      lineno: 20,
    });
    store.refreshState();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('focuses on bottommost frame when stack frame changes', () => {
    store.overrideSelector(getFocusedStackFrames, [
      stackFrame0,
      stackFrame1,
      stackFrame3,
    ]);
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: 'localhost',
      file_path: '/tmp/file_2.py',
      lineno: 10,
    }); // Focused on a stackFrame1 initially; this is bottommost in the file.
    store.overrideSelector(getStickToBottommostFrameInFocusedFile, true);
    store.refreshState();

    // After the stack trace change, stackFrame1 is not longer the bottommost.
    // So we expect an adction to be dispatched to focus onto stackFrame2.
    store.overrideSelector(getFocusedStackFrames, [
      stackFrame0,
      stackFrame1,
      stackFrame2,
    ]);
    store.refreshState();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith(
      sourceLineFocused({
        sourceLineSpec: {
          host_name: 'localhost',
          file_path: '/tmp/file_2.py',
          lineno: 20,
        },
      })
    );
  });
});
