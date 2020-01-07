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
import {Store} from '@ngrx/store';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {map, mergeMap, withLatestFrom, filter, tap} from 'rxjs/operators';
import {
  activeRunIdChanged,
  debuggerLoaded,
  debuggerRunsRequested,
  debuggerRunsLoaded,
  executionDigestsRequested,
  executionDigestsLoaded,
  numExecutionsLoaded,
  numExecutionsRequested,
  requestExecutionDigests,
} from '../actions';
import {
  getDebuggerRunsLoaded,
  getNumExecutionsLoaded,
  getExecutionDigestsLoaded,
} from '../store/debugger_selectors';
import {
  DataLoadState,
  State,
  DebuggerRunListing,
} from '../store/debugger_types';
import {Tfdbg2HttpServerDataSource} from '../data_source/tfdbg2_data_source';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects/effects';

/**
 * Getting page indices that are missing from the data and hence need to be
 * requested.
 *
 * @param begin Beginning item index (inclusive).
 * @param end Ending item index (exclusive).
 * @param pageSize Size of each page, i.e., how many items there are in each
 *   complete page. This must be `>= end - begin`, or an Error will be
 *   thrown.
 * @param numItems: Total number of items available from the data source.
 * @param pageLoadedSizes A map from page index to how many items have been
 *   loaded for that page so far.
 * @returns An array of the page indices that are currently missing and hence
 *   should be requested from the appropriate data source.
 */
export function getMissingPages(
  begin: number,
  end: number,
  pageSize: number,
  numItems: number,
  pageLoadedSizes: {[page: number]: number}
): number[] {
  if (pageSize <= 0 || !Number.isInteger(pageSize)) {
    throw new Error(`Invalid pageSize: ${pageSize}`);
  }
  if (end > numItems) {
    throw new Error(
      `end index (${end}) exceeds total number of items (${numItems})`
    );
  }
  if (end - begin > pageSize) {
    throw new Error('begin-end span exceeds page size, which is not allowed');
  }

  // The constraint that `end - begin <= page` ensures that at most only two
  // pages need to be requested.
  const missingPages: number[] = [];
  const pageIndex0 = Math.floor(begin / pageSize);
  const anyDigestMissing0 =
    !(pageIndex0 in pageLoadedSizes) ||
    (pageLoadedSizes[pageIndex0] < pageSize &&
      pageIndex0 * pageSize + pageLoadedSizes[pageIndex0] < numItems);
  if (anyDigestMissing0) {
    missingPages.push(pageIndex0);
  }

  const pageIndex1 = Math.floor((end - 1) / pageSize);
  if (pageIndex1 !== pageIndex0) {
    const anyDigestMissing1 =
      !(pageIndex1 in pageLoadedSizes) ||
      (pageIndex1 * pageSize + pageLoadedSizes[pageIndex1] < end &&
        end < numItems);
    if (anyDigestMissing1) {
      missingPages.push(pageIndex1);
    }
  }

  return missingPages;
}

@Injectable()
export class DebuggerEffects {
  /**
   * Requires to be exported for JSCompiler. JSCompiler, otherwise,
   * think it is unused property and deadcode eliminate away.
   */
  /** @export */
  readonly loadRunListing$ = createEffect(() =>
    this.actions$.pipe(
      // TODO(cais): Explore consolidating this effect with the greater
      // webapp (in tensorboard/webapp), e.g., during PluginChanged actions.
      ofType(debuggerLoaded),
      withLatestFrom(this.store.select(getDebuggerRunsLoaded)),
      filter(([, {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(debuggerRunsRequested())),
      mergeMap(() => {
        return this.dataSource.fetchRuns().pipe(
          map(
            (runs) => {
              return debuggerRunsLoaded({runs: runs as DebuggerRunListing});
            }
            // TODO(cais): Add catchError() to pipe.
          )
        );
      })
    )
  );

  /** @export */
  readonly loadNumExecutions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(activeRunIdChanged),
      withLatestFrom(this.store.select(getNumExecutionsLoaded)),
      filter(([, loaded]) => loaded.state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(numExecutionsRequested())),
      mergeMap((props) => {
        const runId = props[0].activeRunId as string; // TODO(cais): Guard against null?
        const begin = 0;
        const end = 0;
        return this.dataSource.fetchExecutionDigests(runId, begin, end).pipe(
          map(
            (digests) => {
              return numExecutionsLoaded({numExecutions: digests.num_digests});
            }
            // TODO(cais): Add catchError() to pipe.
          )
        );
      })
    )
  );

  /** @export */
  readonly loadExecutionDigests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(requestExecutionDigests),
      withLatestFrom(this.store.select(getExecutionDigestsLoaded)),
      filter(([props, loaded]) => {
        if (loaded.state === DataLoadState.LOADING) {
          return false;
        }
        const missingPages = getMissingPages(
          props.begin,
          props.end,
          props.pageSize,
          loaded.numExecutions,
          loaded.pageLoadedSizes
        );
        return missingPages.length > 0;
      }),
      tap(() => this.store.dispatch(executionDigestsRequested())),
      mergeMap(([props, loaded]) => {
        const {runId, begin, end, pageSize} = props;
        const {pageLoadedSizes} = loaded;
        const missingPages = getMissingPages(
          begin,
          end,
          pageSize,
          loaded.numExecutions,
          pageLoadedSizes
        );
        const actualBegin = missingPages[0] * pageSize;
        const actualEnd = Math.min(
          loaded.numExecutions,
          (missingPages[missingPages.length - 1] + 1) * pageSize
        );
        return this.dataSource
          .fetchExecutionDigests(runId, actualBegin, actualEnd)
          .pipe(
            map(
              (digests) => {
                return executionDigestsLoaded(digests);
              }
              // TODO(cais): Add catchError() to pipe.
            )
          );
      })
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private dataSource: Tfdbg2HttpServerDataSource
  ) {}
}
