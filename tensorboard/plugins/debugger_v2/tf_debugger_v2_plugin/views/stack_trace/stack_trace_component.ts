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
import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {CodeLocationType} from '../../store/debugger_types';

export interface StackFrameForDisplay {
  host_name: string;
  file_path: string;
  concise_file_path: string;
  lineno: number;
  function_name: string;
  // Whether the stack frame is a part of the focused file.
  // Being a part of the focused file is a necessary but insufficient
  // condition for being the focused stack frame (see `focused` below).
  belongsToFocusedFile: boolean;
  // Whether the stack frame is the one being focused on (e.g.,
  // being viewed in the source code viewer). If this field is `true`,
  // `belongsToFocusedFile` must also be `true`.
  focused: boolean;
}

@Component({
  standalone: false,
  selector: 'stack-trace-component',
  templateUrl: './stack_trace_component.ng.html',
  styleUrls: ['./stack_trace_component.css'],
})
export class StackTraceComponent implements AfterViewChecked {
  @Input()
  codeLocationType!: CodeLocationType | null;

  @Input()
  opType!: string | null;

  // Index of eager (top-level) execution, not `null` only for
  // `CodeLocationType.GRAPH_OP_CREATION`.
  @Input()
  opName!: string | null;

  // Index of eager (top-level) execution, not `null` only for
  // `CodeLocationType.EXECUTION`.
  @Input()
  executionIndex!: number | null;

  @Input()
  stickToBottommostFrameInFocusedFile!: boolean;

  @Input()
  stackFramesForDisplay: StackFrameForDisplay[] | null = null;

  @Output()
  onSourceLineClicked = new EventEmitter<StackFrameForDisplay>();

  @ViewChild('stackFrameArray')
  private readonly stackFrameArray!: ElementRef<HTMLDivElement>;

  CodeLocationType = CodeLocationType;

  ngAfterViewChecked(): void {
    if (this.stackFrameArray === undefined) {
      return;
    }
    const stackElement = this.stackFrameArray.nativeElement;
    const focusedFrameElement: HTMLElement | null =
      stackElement.querySelector(`.focused-stack-frame`);
    if (focusedFrameElement !== null) {
      // Scroll the focused frame into view when there is a focused frame.
      this.scrollToElement(stackElement, focusedFrameElement);
      return;
    }
    const lastFrameElement: HTMLElement | null = stackElement.querySelector(
      '.stack-frame-container:last-child'
    );
    if (lastFrameElement !== null) {
      this.scrollToElement(stackElement, lastFrameElement);
    }
  }

  scrollToElement(parentElement: HTMLElement, element: HTMLElement): void {
    parentElement.scrollTop = element.offsetTop;
  }
}
