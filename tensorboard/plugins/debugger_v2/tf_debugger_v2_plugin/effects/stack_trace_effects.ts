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
import {Injectable} from '@angular/core';
import {createSelector, select, Store} from '@ngrx/store';
import {createEffect} from '@ngrx/effects';
import {Observable} from 'rxjs';
import {filter, map, tap} from 'rxjs/operators';
import {sourceLineFocused} from '../actions';
import {
  getFocusedSourceLineSpec,
  getFocusedStackFrames,
  getStickToBottommostFrameInFocusedFile,
} from '../store/debugger_selectors';
import {StackFrame, State, SourceLineSpec} from '../store/debugger_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects/effects';

function stackFrameEqualsSourceLineSpec(
  stackFrame: StackFrame,
  spec: SourceLineSpec
) {
  const [host_name, file_path, lineno] = stackFrame;
  return (
    spec.host_name === host_name &&
    spec.file_path === file_path &&
    spec.lineno === lineno
  );
}

/**
 * Helper method for finding the bottommost stack frame in a stack trace.
 * @param stackFrames Stack frames of the stack trace to look in.
 * @param focusedSourceLineSpec The currently focuse stack frame.
 * @returns The stack frame that is in the same file as `focusedSourceLineSpec`,
 *   but at the bottommost location.
 */
function findBottommostStackFrameInFocusedFile(
  stackFrames: StackFrame[],
  focusedSourceLineSpec: SourceLineSpec | null
): StackFrame | null {
  if (focusedSourceLineSpec === null) {
    return null;
  }
  for (let i = stackFrames.length - 1; i >= 0; --i) {
    const stackFrame = stackFrames[i];
    const [host_name, file_path] = stackFrame;
    if (
      host_name === focusedSourceLineSpec.host_name &&
      file_path === focusedSourceLineSpec.file_path
    ) {
      return stackFrame;
    }
  }
  return null;
}

@Injectable()
export class StackTraceEffects {
  /** @export */
  readonly stickingToBottommostFrameEffect$: Observable<void>;

  private createStickingEffect(): Observable<void> {
    return this.store.pipe(
      select(
        createSelector(
          getFocusedStackFrames,
          getFocusedSourceLineSpec,
          getStickToBottommostFrameInFocusedFile,
          (
            stackFrames,
            focusedSourceLineSpec,
            stickToBottommostFrameInFocusedFile
          ): StackFrame | null => {
            if (
              !stickToBottommostFrameInFocusedFile ||
              stackFrames === null ||
              focusedSourceLineSpec === null
            ) {
              return null;
            }
            // Find the stackFrame that is the bottom in the focused file.
            const bottommostFrameInFocusedFile = findBottommostStackFrameInFocusedFile(
              stackFrames,
              focusedSourceLineSpec
            );
            if (
              bottommostFrameInFocusedFile !== null &&
              !stackFrameEqualsSourceLineSpec(
                bottommostFrameInFocusedFile,
                focusedSourceLineSpec
              )
            ) {
              return bottommostFrameInFocusedFile;
            } else {
              return null;
            }
          }
        )
      ),
      filter(
        (bottommostFrameInFocusedFile) => bottommostFrameInFocusedFile !== null
      ),
      tap((bottommostFrameInFocusedFile) => {
        const [host_name, file_path, lineno] = bottommostFrameInFocusedFile!;
        this.store.dispatch(
          sourceLineFocused({
            sourceLineSpec: {host_name, file_path, lineno},
          })
        );
      }),
      map(() => void null)
    );
  }

  constructor(private store: Store<State>) {
    this.stickingToBottommostFrameEffect$ = createEffect(
      () => {
        return this.createStickingEffect().pipe(map(() => void null));
      },
      {dispatch: false}
    );
  }
}
