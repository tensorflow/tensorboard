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
import {By} from '@angular/platform-browser';
import {Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {sourceLineFocused} from '../../actions';
import {DebuggerComponent} from '../../debugger_component';
import {DebuggerContainer} from '../../debugger_container';
import {
  getCodeLocationOrigin,
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
  getStickToBottommostFrameInFocusedFile,
} from '../../store';
import {CodeLocationType, State} from '../../store/debugger_types';
import {
  createDebuggerState,
  createState,
  createTestStackFrame,
} from '../../testing';
import {StackTraceComponent} from './stack_trace_component';
import {StackTraceContainer} from './stack_trace_container';
import {StackTraceModule} from './stack_trace_module';

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

  afterEach(() => {
    store?.resetSelectors();
  });

  for (const stickToBottommostFrame of [false, true]) {
    it(
      `shows non-empty eager stack frames; highlights focused frame: ` +
        `stickToBottommostFrame=${stickToBottommostFrame}`,
      () => {
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
        store.overrideSelector(getFocusedSourceLineSpec, stackFrame1);
        store.overrideSelector(
          getStickToBottommostFrameInFocusedFile,
          stickToBottommostFrame
        );
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
          stackFrame0.file_path.slice(
            stackFrame0.file_path.lastIndexOf('/') + 1
          )
        );
        expect(filePathElements[0].nativeElement.title).toBe(
          stackFrame0.file_path
        );
        expect(filePathElements[1].nativeElement.innerText).toBe(
          stackFrame1.file_path.slice(
            stackFrame1.file_path.lastIndexOf('/') + 1
          )
        );
        expect(filePathElements[1].nativeElement.title).toBe(
          stackFrame1.file_path
        );
        expect(filePathElements[2].nativeElement.innerText).toBe(
          stackFrame2.file_path.slice(
            stackFrame2.file_path.lastIndexOf('/') + 1
          )
        );
        expect(filePathElements[2].nativeElement.title).toBe(
          stackFrame2.file_path
        );

        const linenoElements = fixture.debugElement.queryAll(
          By.css('.stack-frame-lineno')
        );
        expect(linenoElements.length).toBe(3);
        expect(linenoElements[0].nativeElement.innerText).toBe(
          `Line ${stackFrame0.lineno}`
        );
        expect(linenoElements[1].nativeElement.innerText).toBe(
          `Line ${stackFrame1.lineno}`
        );
        expect(linenoElements[2].nativeElement.innerText).toBe(
          `Line ${stackFrame2.lineno}`
        );

        const functionElements = fixture.debugElement.queryAll(
          By.css('.stack-frame-function')
        );
        expect(functionElements.length).toBe(3);
        expect(functionElements[0].nativeElement.innerText).toBe(
          stackFrame0.function_name
        );
        expect(functionElements[1].nativeElement.innerText).toBe(
          stackFrame1.function_name
        );
        expect(functionElements[2].nativeElement.innerText).toBe(
          stackFrame2.function_name
        );

        // Check the focused stack frame has been highlighted by CSS class.
        const focusedElements = fixture.debugElement.queryAll(
          By.css('.focused-stack-frame')
        );
        expect(focusedElements.length).toBe(1);
        const stickToBottomIndicator = focusedElements[0].query(
          By.css('.stick-to-bottommost-indicator')
        );
        expect(stickToBottomIndicator !== null).toBe(stickToBottommostFrame);
        const focusedFilePathElement = focusedElements[0].query(
          By.css('.stack-frame-file-path')
        );
        expect(focusedFilePathElement.nativeElement.innerText).toBe(
          stackFrame1.file_path.slice(
            stackFrame1.file_path.lastIndexOf('/') + 1
          )
        );
      }
    );
  }

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
    store.overrideSelector(getFocusedSourceLineSpec, stackFrame0);
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
      stackFrame0.file_path.slice(stackFrame0.file_path.lastIndexOf('/') + 1)
    );
    expect(filePathElements[0].nativeElement.title).toBe(stackFrame0.file_path);
    expect(filePathElements[1].nativeElement.innerText).toBe(
      stackFrame1.file_path.slice(stackFrame1.file_path.lastIndexOf('/') + 1)
    );
    expect(filePathElements[1].nativeElement.title).toBe(stackFrame1.file_path);

    const linenoElements = fixture.debugElement.queryAll(
      By.css('.stack-frame-lineno')
    );
    expect(linenoElements.length).toBe(2);
    expect(linenoElements[0].nativeElement.innerText).toBe(
      `Line ${stackFrame0.lineno}`
    );
    expect(linenoElements[1].nativeElement.innerText).toBe(
      `Line ${stackFrame1.lineno}`
    );

    const functionElements = fixture.debugElement.queryAll(
      By.css('.stack-frame-function')
    );
    expect(functionElements.length).toBe(2);
    expect(functionElements[0].nativeElement.innerText).toBe(
      stackFrame0.function_name
    );
    expect(functionElements[1].nativeElement.innerText).toBe(
      stackFrame1.function_name
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
      stackFrame0.file_path.slice(stackFrame1.file_path.lastIndexOf('/') + 1)
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
        stackFrame: stackFrame1,
      })
    );
  });

  it('scroll to the last frame when no frame is in focus', () => {
    const fixture = TestBed.createComponent(StackTraceComponent);
    const component = fixture.componentInstance;
    component.codeLocationType = CodeLocationType.EXECUTION;
    component.opType = 'FooOp';
    component.opName = null;
    component.executionIndex = 3;
    component.stickToBottommostFrameInFocusedFile = false;
    component.stackFramesForDisplay = [
      {
        host_name: 'localhost',
        file_path: '/tmp/main.py',
        concise_file_path: 'main.py',
        lineno: 5,
        function_name: 'func1',
        belongsToFocusedFile: false,
        focused: false,
      },
      {
        host_name: 'localhost',
        file_path: '/tmp/main.py',
        concise_file_path: 'main.py',
        lineno: 10,
        function_name: 'func1',
        belongsToFocusedFile: false,
        focused: false,
      },
    ];
    fixture.detectChanges();

    const scrollSpy = spyOn(component, 'scrollToElement');
    component.ngAfterViewChecked();
    const stackElement = fixture.debugElement.query(
      By.css('.stack-frame-array')
    );
    const lastFrameElement = fixture.debugElement.query(
      By.css('.stack-frame-container:last-child')
    );
    expect(scrollSpy).toHaveBeenCalledWith(
      stackElement.nativeElement,
      lastFrameElement.nativeElement
    );
  });

  it('scroll to the focused frame when a frame is in focus', () => {
    const fixture = TestBed.createComponent(StackTraceComponent);
    const component = fixture.componentInstance;
    component.codeLocationType = CodeLocationType.EXECUTION;
    component.opType = 'FooOp';
    component.opName = null;
    component.executionIndex = 3;
    component.stickToBottommostFrameInFocusedFile = false;
    component.stackFramesForDisplay = [
      {
        host_name: 'localhost',
        file_path: '/tmp/main.py',
        concise_file_path: 'main.py',
        lineno: 5,
        function_name: 'func1',
        belongsToFocusedFile: true,
        focused: true,
      },
      {
        host_name: 'localhost',
        file_path: '/tmp/main.py',
        concise_file_path: 'main.py',
        lineno: 10,
        function_name: 'func1',
        belongsToFocusedFile: false,
        focused: false,
      },
    ];
    fixture.detectChanges();

    const scrollSpy = spyOn(component, 'scrollToElement');
    component.ngAfterViewChecked();
    const stackElement = fixture.debugElement.query(
      By.css('.stack-frame-array')
    );
    const focusedFrameElement = fixture.debugElement.query(
      By.css('.focused-stack-frame')
    );
    expect(scrollSpy).toHaveBeenCalledWith(
      stackElement.nativeElement,
      focusedFrameElement.nativeElement
    );
  });
});
