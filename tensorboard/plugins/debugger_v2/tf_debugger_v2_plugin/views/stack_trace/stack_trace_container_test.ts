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
 * Unit tests for the Stack Trace Container.
 */
import {CommonModule} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {By} from '@angular/platform-browser';

import {Store} from '@ngrx/store';
import {provideMockStore, MockStore} from '@ngrx/store/testing';

import {
  setStickToBottommostFrameInFocusedFile,
  sourceLineFocused,
} from '../../actions';
import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {CodeLocationType, State} from '../../store/debugger_types';
import {
  getCodeLocationOrigin,
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
  getStickToBottommostFrameInFocusedFile,
} from '../../store';
import {
  createDebuggerState,
  createState,
  createTestStackFrame,
} from '../../testing';
import {StackTraceContainer} from './stack_trace_container';
import {StackTraceModule} from './stack_trace_module';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

describe('Stack Trace container', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DebuggerComponent, DebuggerContainer],
      imports: [CommonModule, StackTraceModule],
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

  it('shows non-empty eager stack frames; highlights focused frame', () => {
    const fixture = TestBed.createComponent(StackTraceContainer);
    store.overrideSelector(getCodeLocationOrigin, {
      codeLocationType: CodeLocationType.EXECUTION,
      opType: 'FooOp',
      executionIndex: 12,
    });
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
      By.css('.code-location-origin')
    );
    expect(stackTraceTypeElement.nativeElement.innerText.trim()).toBe(
      'Eager execution #12: FooOp'
    );
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
    expect(functionElements[0].nativeElement.innerText).toBe(stackFrame0[3]);
    expect(functionElements[1].nativeElement.innerText).toBe(stackFrame1[3]);
    expect(functionElements[2].nativeElement.innerText).toBe(stackFrame2[3]);

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
  });

  it('shows non-empty graph-op-creation stack frames; highlights focused frame', () => {
    const fixture = TestBed.createComponent(StackTraceContainer);
    store.overrideSelector(getCodeLocationOrigin, {
      codeLocationType: CodeLocationType.GRAPH_OP_CREATION,
      opType: 'FooOp',
      opName: 'scope_1/foo_2',
    });
    const stackFrame0 = createTestStackFrame();
    const stackFrame1 = createTestStackFrame();
    store.overrideSelector(getFocusedStackFrames, [stackFrame0, stackFrame1]);
    store.overrideSelector(getFocusedSourceLineSpec, {
      host_name: stackFrame0[0],
      file_path: stackFrame0[1],
      lineno: stackFrame0[2],
    });
    fixture.detectChanges();

    const stackTraceTypeElement = fixture.debugElement.query(
      By.css('.code-location-origin')
    );
    expect(stackTraceTypeElement.nativeElement.innerText.trim()).toBe(
      'Creation of graph op "scope_1/foo_2" FooOp'
    );
    const hostNameElement = fixture.debugElement.query(
      By.css('.stack-trace-host-name')
    );
    expect(hostNameElement.nativeElement.innerText).toBe(
      '(Host name: localhost)'
    );
    const stackFrameContainers = fixture.debugElement.queryAll(
      By.css('.stack-frame-container')
    );
    expect(stackFrameContainers.length).toBe(2);

    const filePathElements = fixture.debugElement.queryAll(
      By.css('.stack-frame-file-path')
    );
    expect(filePathElements.length).toBe(2);
    expect(filePathElements[0].nativeElement.innerText).toBe(
      stackFrame0[1].slice(stackFrame0[1].lastIndexOf('/') + 1)
    );
    expect(filePathElements[0].nativeElement.title).toBe(stackFrame0[1]);
    expect(filePathElements[1].nativeElement.innerText).toBe(
      stackFrame1[1].slice(stackFrame1[1].lastIndexOf('/') + 1)
    );
    expect(filePathElements[1].nativeElement.title).toBe(stackFrame1[1]);

    const linenoElements = fixture.debugElement.queryAll(
      By.css('.stack-frame-lineno')
    );
    expect(linenoElements.length).toBe(2);
    expect(linenoElements[0].nativeElement.innerText).toBe(
      `Line ${stackFrame0[2]}`
    );
    expect(linenoElements[1].nativeElement.innerText).toBe(
      `Line ${stackFrame1[2]}`
    );

    const functionElements = fixture.debugElement.queryAll(
      By.css('.stack-frame-function')
    );
    expect(functionElements.length).toBe(2);
    expect(functionElements[0].nativeElement.innerText).toBe(stackFrame0[3]);
    expect(functionElements[1].nativeElement.innerText).toBe(stackFrame1[3]);

    // Check the focused stack frame has been highlighted by CSS class.
    const focusedElements = fixture.debugElement.queryAll(
      By.css('.focused-stack-frame')
    );
    expect(focusedElements.length).toBe(1);
    const focusedFilePathElement = focusedElements[0].query(
      By.css('.stack-frame-file-path')
    );
    expect(focusedFilePathElement.nativeElement.innerText).toBe(
      stackFrame0[1].slice(stackFrame1[1].lastIndexOf('/') + 1)
    );
  });

  it('shows no-stack-trace message when no op is focused', () => {
    const fixture = TestBed.createComponent(StackTraceContainer);
    store.overrideSelector(getCodeLocationOrigin, null);
    fixture.detectChanges();
    expect(
      fixture.debugElement.query(By.css('.code-location-origin'))
    ).toBeNull();
    expect(fixture.debugElement.query(By.css('.op-type'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.op-name'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.stack-frame-array'))).toBeNull();
    const noStackTrace = fixture.debugElement.query(By.css('.no-stack-trace'));
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

  for (const stickToValue of [false, true]) {
    it(`sets stick-to-bottommost-frame slide toggle: value=${stickToValue}`, () => {
      const fixture = TestBed.createComponent(StackTraceContainer);
      store.overrideSelector(
        getStickToBottommostFrameInFocusedFile,
        stickToValue
      );
      fixture.detectChanges();

      const stickToBottommostElement = fixture.debugElement.query(
        By.css('.stick-to-bottommost-frame')
      );
      expect(
        stickToBottommostElement.nativeElement.getAttribute(
          'ng-reflect-checked'
        )
      ).toBe(stickToValue ? 'true' : 'false');
    });
  }

  it('changing stick-to-bottommost-frame slide toggle dispatches action', () => {
    const fixture = TestBed.createComponent(StackTraceContainer);
    const stickToBottommostElement = fixture.debugElement.query(
      By.css('.stick-to-bottommost-frame')
    );
    stickToBottommostElement.triggerEventHandler('change', {
      checked: true,
    } as MatSlideToggleChange);
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(
      setStickToBottommostFrameInFocusedFile({value: true})
    );
    stickToBottommostElement.triggerEventHandler('change', {
      checked: false,
    } as MatSlideToggleChange);
    fixture.detectChanges();
    expect(dispatchSpy).toHaveBeenCalledWith(
      setStickToBottommostFrameInFocusedFile({value: false})
    );
  });
});
