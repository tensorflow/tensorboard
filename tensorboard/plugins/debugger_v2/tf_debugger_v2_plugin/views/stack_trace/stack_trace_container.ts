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

import {CodeLocationType, State} from '../../store/debugger_types';
import {sourceLineFocused} from '../../actions';
import {
  getCodeLocationOrigin,
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
  getStickToBottommostFrameInFocusedFile,
} from '../../store';
import {StackFrameForDisplay} from './stack_trace_component';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
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
  readonly codeLocationType$ = this.store.pipe(
    select(
      createSelector(
        getCodeLocationOrigin,
        (originInfo): CodeLocationType | null => {
          return originInfo === null ? null : originInfo.codeLocationType;
        }
      )
    )
  );

  readonly opType$ = this.store.pipe(
    select(
      createSelector(
        getCodeLocationOrigin,
        (originInfo): string | null => {
          return originInfo === null ? null : originInfo.opType;
        }
      )
    )
  );

  readonly opName$ = this.store.pipe(
    select(
      createSelector(
        getCodeLocationOrigin,
        (originInfo): string | null => {
          if (
            originInfo === null ||
            originInfo.codeLocationType !== CodeLocationType.GRAPH_OP_CREATION
          ) {
            return null;
          }
          return originInfo.opName;
        }
      )
    )
  );

  readonly executionIndex$ = this.store.pipe(
    select(
      createSelector(
        getCodeLocationOrigin,
        (originInfo): number | null => {
          if (
            originInfo === null ||
            originInfo.codeLocationType !== CodeLocationType.EXECUTION
          ) {
            return null;
          }
          return originInfo.executionIndex;
        }
      )
    )
  );

  readonly stickToBottommostFrameInFocusedFile$ = this.store.pipe(
    select(getStickToBottommostFrameInFocusedFile)
  );

  readonly stackFramesForDisplay$ = this.store.pipe(
    select(
      createSelector(
        getFocusedStackFrames,
        getFocusedSourceLineSpec,
        (stackFrames, focusedSourceLineSpec): StackFrameForDisplay[] | null => {
          if (stackFrames === null) {
            return null;
          }
          const output: StackFrameForDisplay[] = [];
          // Correctly label all the stack frames for display.
          for (const stackFrame of stackFrames) {
            const [host_name, file_path, lineno, function_name] = stackFrame;
            const pathItems = file_path.split('/');
            const concise_file_path = pathItems[pathItems.length - 1];
            const belongsToFocusedFile =
              focusedSourceLineSpec !== null &&
              host_name === focusedSourceLineSpec.host_name &&
              file_path === focusedSourceLineSpec.file_path;
            const focused =
              belongsToFocusedFile && lineno === focusedSourceLineSpec!.lineno;
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

  constructor(private readonly store: Store<State>) {}

  onSourceLineClicked(args: {
    host_name: string;
    file_path: string;
    lineno: number;
  }) {
    this.store.dispatch(sourceLineFocused({sourceLineSpec: args}));
  }
}
