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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {createSelector, select, Store} from '@ngrx/store';
import {
  executionDigestFocused,
  executionScrollLeft,
  executionScrollRight,
  executionScrollToIndex,
} from '../../actions';
import {
  getActiveRunId,
  getDisplayCount,
  getExecutionPageSize,
  getExecutionScrollBeginIndex,
  getFocusAlertTypesOfVisibleExecutionDigests,
  getFocusedExecutionDisplayIndex,
  getFocusedExecutionIndex,
  getNumExecutions,
  getNumExecutionsLoaded,
  getVisibleExecutionDigests,
} from '../../store';
import {
  DataLoadState,
  ExecutionDigest,
  State,
} from '../../store/debugger_types';
import {ExecutionDigestForDisplay} from './timeline_component';

const FUNCTION_OP_TYPE_PREFIXES: string[] = [
  '__forward_',
  '__backward_',
  '__inference_',
];

/**
 * Get a display version of the execution digest.
 * @param executionDigest
 * @param strLen
 */
function getExecutionDigestForDisplay(
  executionDigest: ExecutionDigest | null,
  strLen = 1
): ExecutionDigestForDisplay {
  if (!executionDigest) {
    // The execution digest at this index hasn't been loaded from the data source.
    return {
      op_type: '(N/A)',
      short_op_type: '..',
      is_graph: false,
    };
  }
  const functionPrefixes = FUNCTION_OP_TYPE_PREFIXES.filter((prefix) =>
    executionDigest.op_type.startsWith(prefix)
  );
  if (functionPrefixes.length) {
    // This is the execution of a tf.function (FuncGraph).
    const functionNameWithSuffix = executionDigest.op_type.slice(
      functionPrefixes[0].length
    );
    return {
      op_type: executionDigest.op_type,
      short_op_type: functionNameWithSuffix.slice(0, strLen),
      is_graph: true,
    };
  } else {
    return {
      op_type: executionDigest.op_type,
      short_op_type: executionDigest.op_type.slice(0, strLen),
      is_graph: false,
    };
  }
}

@Component({
  standalone: false,
  selector: 'tf-debugger-v2-timeline',
  template: `
    <timeline-component
      [activeRunId]="activeRunId$ | async"
      [loadingNumExecutions]="loadingNumExecutions$ | async"
      [numExecutions]="numExecutions$ | async"
      [scrollBeginIndex]="scrollBeginIndex$ | async"
      [scrollBeginIndexUpperLimit]="scrollBeginIndexUpperLimit$ | async"
      [pageSize]="pageSize$ | async"
      [displayCount]="displayCount$ | async"
      [displayExecutionDigests]="displayExecutionDigests$ | async"
      [displayFocusedAlertTypes]="displayFocusedAlertTypes$ | async"
      [focusedExecutionIndex]="focusedExecutionIndex$ | async"
      [focusedExecutionDisplayIndex]="focusedExecutionDisplayIndex$ | async"
      (onNavigateLeft)="onNavigateLeft()"
      (onNavigateRight)="onNavigateRight()"
      (onExecutionDigestClicked)="onExecutionDigestClicked($event)"
      (onSliderChange)="onSliderChange($event)"
    ></timeline-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineContainer {
  readonly activeRunId$;

  readonly loadingNumExecutions$;

  readonly scrollBeginIndex$;

  readonly scrollBeginIndexUpperLimit$;

  readonly pageSize$;

  readonly displayCount$;

  readonly displayExecutionDigests$;

  readonly displayFocusedAlertTypes$;

  readonly focusedExecutionIndex$;

  readonly focusedExecutionDisplayIndex$;

  readonly numExecutions$;

  constructor(private readonly store: Store<State>) {
    this.activeRunId$ = this.store.pipe(select(getActiveRunId));
    this.loadingNumExecutions$ = this.store.pipe(
      select(
        createSelector(getNumExecutionsLoaded, (loaded) => {
          return loaded.state == DataLoadState.LOADING;
        })
      )
    );
    this.scrollBeginIndex$ = this.store.pipe(
      select(getExecutionScrollBeginIndex)
    );
    this.scrollBeginIndexUpperLimit$ = this.store.pipe(
      select(
        createSelector(
          getNumExecutions,
          getDisplayCount,
          (numExecutions, displayCount) => {
            return Math.max(0, numExecutions - displayCount);
          }
        )
      )
    );
    this.pageSize$ = this.store.pipe(select(getExecutionPageSize));
    this.displayCount$ = this.store.pipe(select(getDisplayCount));
    this.displayExecutionDigests$ = this.store.pipe(
      select(
        createSelector(getVisibleExecutionDigests, (visibleDigests) => {
          return visibleDigests.map((digest) =>
            getExecutionDigestForDisplay(digest)
          );
        })
      )
    );
    this.displayFocusedAlertTypes$ = this.store.pipe(
      select(getFocusAlertTypesOfVisibleExecutionDigests)
    );
    this.focusedExecutionIndex$ = this.store.pipe(
      select(getFocusedExecutionIndex)
    );
    this.focusedExecutionDisplayIndex$ = this.store.pipe(
      select(getFocusedExecutionDisplayIndex)
    );
    this.numExecutions$ = this.store.pipe(select(getNumExecutions));
  }

  onNavigateLeft() {
    this.store.dispatch(executionScrollLeft());
  }

  onNavigateRight() {
    this.store.dispatch(executionScrollRight());
  }

  onExecutionDigestClicked(index: number) {
    this.store.dispatch(executionDigestFocused({displayIndex: index}));
  }

  onSliderChange(value: number) {
    this.store.dispatch(executionScrollToIndex({index: value}));
  }
}

export const TEST_ONLY = {
  getExecutionDigestForDisplay,
};
