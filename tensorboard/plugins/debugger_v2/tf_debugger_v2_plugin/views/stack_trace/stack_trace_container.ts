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
import {Component} from '@angular/core';
import {createSelector, select, Store} from '@ngrx/store';
import {sourceLineFocused} from '../../actions';
import {
  getCodeLocationOrigin,
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
  getStickToBottommostFrameInFocusedFile,
} from '../../store';
import {CodeLocationType, State} from '../../store/debugger_types';
import {StackFrameForDisplay} from './stack_trace_component';

@Component({
  standalone: false,
  selector: 'tf-debugger-v2-stack-trace',
  template: `
    <stack-trace-component
      [codeLocationType]="codeLocationType$ | async"
      [opType]="opType$ | async"
      [opName]="opName$ | async"
      [executionIndex]="executionIndex$ | async"
      [stickToBottommostFrameInFocusedFile]="
        stickToBottommostFrameInFocusedFile$ | async
      "
      [stackFramesForDisplay]="stackFramesForDisplay$ | async"
      (onSourceLineClicked)="onSourceLineClicked($event)"
    ></stack-trace-component>
  `,
})
export class StackTraceContainer {
  readonly codeLocationType$;

  readonly opType$;

  readonly opName$;

  readonly executionIndex$;

  readonly stickToBottommostFrameInFocusedFile$;

  readonly stackFramesForDisplay$;

  constructor(private readonly store: Store<State>) {
    this.codeLocationType$ = this.store.pipe(
      select(
        createSelector(
          getCodeLocationOrigin,
          (originInfo): CodeLocationType | null => {
            return originInfo === null ? null : originInfo.codeLocationType;
          }
        )
      )
    );
    this.opType$ = this.store.pipe(
      select(
        createSelector(getCodeLocationOrigin, (originInfo): string | null => {
          return originInfo === null ? null : originInfo.opType;
        })
      )
    );
    this.opName$ = this.store.pipe(
      select(
        createSelector(getCodeLocationOrigin, (originInfo): string | null => {
          if (
            originInfo === null ||
            originInfo.codeLocationType !== CodeLocationType.GRAPH_OP_CREATION
          ) {
            return null;
          }
          return originInfo.opName;
        })
      )
    );
    this.executionIndex$ = this.store.pipe(
      select(
        createSelector(getCodeLocationOrigin, (originInfo): number | null => {
          if (
            originInfo === null ||
            originInfo.codeLocationType !== CodeLocationType.EXECUTION
          ) {
            return null;
          }
          return originInfo.executionIndex;
        })
      )
    );
    this.stickToBottommostFrameInFocusedFile$ = this.store.pipe(
      select(getStickToBottommostFrameInFocusedFile)
    );
    this.stackFramesForDisplay$ = this.store.pipe(
      select(
        createSelector(
          getFocusedStackFrames,
          getFocusedSourceLineSpec,
          (
            stackFrames,
            focusedSourceLineSpec
          ): StackFrameForDisplay[] | null => {
            if (stackFrames === null) {
              return null;
            }
            const output: StackFrameForDisplay[] = [];
            // Correctly label all the stack frames for display.
            for (const stackFrame of stackFrames) {
              const {host_name, file_path, lineno, function_name} = stackFrame;
              const pathItems = file_path.split('/');
              const concise_file_path = pathItems[pathItems.length - 1];
              const belongsToFocusedFile =
                focusedSourceLineSpec !== null &&
                host_name === focusedSourceLineSpec.host_name &&
                file_path === focusedSourceLineSpec.file_path;
              const focused =
                belongsToFocusedFile &&
                lineno === focusedSourceLineSpec!.lineno;
              output.push({
                host_name,
                file_path,
                concise_file_path,
                lineno,
                function_name,
                belongsToFocusedFile,
                focused,
              });
            }
            return output;
          }
        )
      )
    );
  }

  onSourceLineClicked(args: StackFrameForDisplay) {
    const {host_name, file_path, lineno, function_name} = args;
    const stackFrame = {host_name, file_path, lineno, function_name};
    this.store.dispatch(sourceLineFocused({stackFrame}));
  }
}
