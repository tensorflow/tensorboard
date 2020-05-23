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
  getCodeLocationFocusType,
  getFocusedExecutionData,
  getFocusedGraphOpInfo,
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
} from '../../store';
import {StackFrameForDisplay} from './stack_trace_component';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'tf-debugger-v2-stack-trace',
  template: `
    <stack-trace-component
      [stackTraceType]="stackTraceType$ | async"
      [originOpInfo]="originOpInfo$ | async"
      [stackFramesForDisplay]="stackFramesForDisplay$ | async"
      (onSourceLineClicked)="onSourceLineClicked($event)"
    ></stack-trace-component>
  `,
})
export class StackTraceContainer {
  readonly stackTraceType$ = this.store.pipe(select(getCodeLocationFocusType));

  readonly originOpInfo$ = this.store.pipe(
    select(
      createSelector(
        getCodeLocationFocusType,
        getFocusedExecutionData,
        getFocusedGraphOpInfo,
        (codeLocationFocusType, executionData, graphOpInfo) => {
          if (codeLocationFocusType === null) {
            return null;
          }
          if (codeLocationFocusType === CodeLocationType.EXECUTION) {
            if (executionData === null) {
              return null;
            }
            return {
              opType: executionData.op_type,
              opName: null,
            };
          } else {
            // This is CodeLocationType.GRAPH_OP_CREATION.
            if (graphOpInfo === null) {
              return null;
            }
            return {
              opType: graphOpInfo.op_type,
              opName: graphOpInfo.op_name,
            };
          }
        }
      )
    )
  );

  readonly stackFramesForDisplay$ = this.store.pipe(
    select(
      createSelector(
        getFocusedStackFrames,
        getFocusedSourceLineSpec,
        (stackFrames, focusedSourceLineSpec) => {
          if (stackFrames === null) {
            return null;
          }
          const output: StackFrameForDisplay[] = [];
          for (const stackFrame of stackFrames) {
            const [host_name, file_path, lineno, function_name] = stackFrame;
            const pathItems = file_path.split('/');
            const concise_file_path = pathItems[pathItems.length - 1];
            const focused =
              focusedSourceLineSpec !== null &&
              host_name === focusedSourceLineSpec.host_name &&
              file_path === focusedSourceLineSpec.file_path &&
              lineno === focusedSourceLineSpec.lineno;
            output.push({
              host_name,
              file_path,
              concise_file_path,
              lineno,
              function_name,
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
