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
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Action, Store} from '@ngrx/store';
import {merge, Observable, of, timer} from 'rxjs';
import {
  debounceTime,
  delayWhen,
  filter,
  map,
  mergeMap,
  repeatWhen,
  share,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {State as AppState} from '../../../../webapp/app_state';
import {
  changePlugin,
  manualReload,
  reload,
} from '../../../../webapp/core/actions';
import {getActivePlugin} from '../../../../webapp/core/store';
import {
  alertsOfTypeLoaded,
  alertTypeFocusToggled,
  debuggerDataPollOnset,
  debuggerLoaded,
  debuggerRunsLoaded,
  debuggerRunsRequested,
  debuggerUnloaded,
  executionDataLoaded,
  executionDigestFocused,
  executionDigestsLoaded,
  executionDigestsRequested,
  executionScrollLeft,
  executionScrollRight,
  executionScrollToIndex,
  graphExecutionDataLoaded,
  graphExecutionDataRequested,
  graphExecutionFocused,
  graphExecutionScrollToIndex,
  graphOpFocused,
  graphOpInfoLoaded,
  graphOpInfoRequested,
  numAlertsAndBreakdownLoaded,
  numAlertsAndBreakdownRequested,
  numExecutionsLoaded,
  numExecutionsRequested,
  numGraphExecutionsLoaded,
  numGraphExecutionsRequested,
  sourceFileListLoaded,
  sourceFileListRequested,
  sourceFileLoaded,
  sourceFileRequested,
  sourceLineFocused,
  stackFramesLoaded,
} from '../actions';
import {
  AlertsResponse,
  SourceFileListResponse,
  Tfdbg2HttpServerDataSource,
} from '../data_source/tfdbg2_data_source';
import {
  getActiveRunId,
  getAlertsFocusType,
  getAlertsLoaded,
  getDebuggerRunListing,
  getDebuggerRunsLoaded,
  getDisplayCount,
  getExecutionDigestsLoaded,
  getExecutionPageSize,
  getExecutionScrollBeginIndex,
  getFocusedSourceFileContent,
  getFocusedSourceFileIndex,
  getGraphExecutionDataLoadingPages,
  getGraphExecutionDataPageLoadedSizes,
  getGraphExecutionDisplayCount,
  getGraphExecutionPageSize,
  getGraphExecutionScrollBeginIndex,
  getLoadedAlertsOfFocusedType,
  getLoadedExecutionData,
  getLoadedStackFrames,
  getLoadingGraphOps,
  getNumAlertsOfFocusedType,
  getNumExecutions,
  getNumExecutionsLoaded,
  getNumGraphExecutions,
  getNumGraphExecutionsLoaded,
  getPollSilenceTimeMs,
  getSourceFileListLoaded,
} from '../store/debugger_selectors';
import {beginEndRangesInclude} from '../store/debugger_store_utils';
import {
  DataLoadState,
  DebuggerRunListing,
  Execution,
  InfNanAlert,
  SourceFileSpec,
  StackFrame,
  State as DebuggerState,
} from '../store/debugger_types';
import {PLUGIN_ID} from '../types';

type State = AppState & DebuggerState;

// Minimum polling interval in milliseconds.
export const MIN_POLLING_INTERVAL_MS = 2e3;
// Maximum polling interval in miliseconds.
export const MAX_POLLING_INTERVAL_MS = 60e3;
// Backoff behavior takes effect when time since the elapsed time between the
// most recent arrival of new polling result and the most recent polling event
// exceeds `pollingBackoffFactor * minimumPollingInterval`.
export const POLLING_BACKOFF_FACTOR = 2;

/**
 * Computes the current polling interval based on the time lapsed since
 * last new polling data and the last polling event.
 *
 * This specifies a backoff behavior where a longer period of no new data
 * leads to a longer polling interval, with a ceiling as the limit.
 *
 * @param pollSilenceTime The amount of time between the most
 *   recent arrival of new polling result and the last polling event.
 * @returns The current polling interval, i.e., low bound for the time between
 *   the last polling event and the next one.
 */
export function getCurrentPollingInterval(pollSilenceTime: number): number {
  if (pollSilenceTime > MAX_POLLING_INTERVAL_MS) {
    return MAX_POLLING_INTERVAL_MS;
  } else if (
    pollSilenceTime >
    MIN_POLLING_INTERVAL_MS * POLLING_BACKOFF_FACTOR
  ) {
    return pollSilenceTime;
  } else {
    return MIN_POLLING_INTERVAL_MS;
  }
}

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
function getMissingPages(
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

  // The constraint that `end - begin <= page` guarantees that at most only two
  // pages need to be requested.
  const missingPages: number[] = [];

  // Check whether the first of the two possible pages needs to be requested.
  const firstPageIndex = Math.floor(begin / pageSize);
  if (
    !(firstPageIndex in pageLoadedSizes) ||
    (pageLoadedSizes[firstPageIndex] < pageSize &&
      firstPageIndex * pageSize + pageLoadedSizes[firstPageIndex] < numItems)
  ) {
    missingPages.push(firstPageIndex);
  }

  const secondPageIndex = Math.floor((end - 1) / pageSize);
  if (secondPageIndex !== firstPageIndex) {
    const anyDigestMissing1 =
      !(secondPageIndex in pageLoadedSizes) ||
      (secondPageIndex * pageSize + pageLoadedSizes[secondPageIndex] < end &&
        end < numItems);
    if (anyDigestMissing1) {
      missingPages.push(secondPageIndex);
    }
  }

  return missingPages;
}

/**
 * Repeat an input stream at given intervals.
 * @param stream$ The stream to repeat.
 * @param pollingIntervalStream$ The stream of polling intervals.
 *   The latest value of this stream will be used as the interval between
 *   the previous repeat and the next one.
 * @param terminationStream$ Terminate the repeat on values from this stream.
 * @returns Stream with the timed repeats.
 */
function createTimedRepeater(
  stream$: Observable<any>,
  pollingIntervalStream$: Observable<number>,
  terminationStream$: Observable<any>
): Observable<void> {
  return stream$.pipe(
    repeatWhen((completed) =>
      completed.pipe(
        withLatestFrom(pollingIntervalStream$),
        delayWhen(([, pollingInterval]) => {
          return timer(pollingInterval);
        })
      )
    ),
    takeUntil(terminationStream$),
    map(() => void null)
  );
}

@Injectable()
export class DebuggerEffects {
  /**
   * Observable that loads:
   * - runs list
   * - number of executions
   * - execution digest
   * - execution details
   */
  /** @export */
  readonly loadData$: Observable<{}>;

  private onDebuggerDataPoll(): Observable<void> {
    return this.actions$.pipe(
      ofType(debuggerLoaded),
      switchMap((action: Action) => {
        return createTimedRepeater(
          of(action),
          this.store.select(getPollSilenceTimeMs).pipe(
            map((pollSilenceTime) => {
              return getCurrentPollingInterval(pollSilenceTime);
            })
          ),
          this.actions$.pipe(ofType(debuggerUnloaded))
        );
      }),
      tap(() => this.store.dispatch(debuggerDataPollOnset())),
      map(() => void null)
    );
  }

  private onCoreReload(): Observable<void> {
    return merge(
      this.actions$.pipe(ofType(manualReload, reload)),
      // Load the debugger data if it was never loaded before and now becomes
      // an active plugin.
      this.actions$.pipe(ofType(changePlugin)).pipe(
        // We use debugger runs loaded state as a proxy to the debugger state
        // being loaded.
        withLatestFrom(this.store.select(getDebuggerRunsLoaded)),
        filter(([, loadState]) => {
          return (
            loadState.state === DataLoadState.NOT_LOADED ||
            (loadState.state === DataLoadState.FAILED &&
              loadState.lastLoadedTimeInMs === null)
          );
        })
      )
    ).pipe(
      withLatestFrom(this.store.select(getActivePlugin)),
      filter(([, plugin]) => plugin === PLUGIN_ID),
      tap(() => this.store.dispatch(debuggerDataPollOnset())),
      map(() => void null)
    );
  }

  /**
   * Request list of debugger runs.
   */
  private loadDebuggerRuns(prevStream$: Observable<void>): Observable<void> {
    return prevStream$.pipe(
      withLatestFrom(this.store.select(getDebuggerRunsLoaded)),
      filter(([, {state}]) => state !== DataLoadState.LOADING),
      tap(() => this.store.dispatch(debuggerRunsRequested())),
      mergeMap(() => {
        return this.dataSource.fetchRuns().pipe(
          tap((runs) => {
            this.store.dispatch(
              debuggerRunsLoaded({runs: runs as DebuggerRunListing})
            );
          }),
          map(() => void null)
          // TODO(cais): Add catchError() to pipe.
        );
      })
    );
  }

  /**
   * When a debugger run exists, load number of top-level executions.
   */
  private createNumExecutionLoader(prevStream$: Observable<void>) {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getDebuggerRunListing),
        this.store.select(getNumExecutionsLoaded)
      ),
      filter(([, runs, loaded]) => {
        return (
          Object.keys(runs).length > 0 && loaded.state !== DataLoadState.LOADING
        );
      }),
      tap(() => this.store.dispatch(numExecutionsRequested())),
      mergeMap(([, runs]) => {
        // TODO(cais): Handle multiple runs. Currently it is assumed that there
        // is at most only one debugger run available.
        const runId = Object.keys(runs)[0];
        const begin = 0;
        const end = 0;
        return this.dataSource.fetchExecutionDigests(runId, begin, end).pipe(
          tap((digests) => {
            this.store.dispatch(
              numExecutionsLoaded({numExecutions: digests.num_digests})
            );
          }),
          map(() => void null)
        );
        // TODO(cais): Add catchError() to pipe.
      })
    );
  }

  /**
   * When a debugger run exists, load number of intra-graph executions.
   */
  private createNumGraphExecutionLoader(prevStream$: Observable<void>) {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getDebuggerRunListing),
        this.store.select(getNumGraphExecutionsLoaded)
      ),
      filter(([, runs, loaded]) => {
        return (
          Object.keys(runs).length > 0 && loaded.state !== DataLoadState.LOADING
        );
      }),
      tap(() => this.store.dispatch(numGraphExecutionsRequested())),
      mergeMap(([, runs]) => {
        const runId = Object.keys(runs)[0];
        const begin = 0;
        const end = 0;
        return this.dataSource
          .fetchGraphExecutionDigests(runId, begin, end)
          .pipe(
            tap((digests) => {
              this.store.dispatch(
                numGraphExecutionsLoaded({
                  numGraphExecutions: digests.num_digests,
                })
              );
            }),
            map(() => void null)
          );
        // TODO(cais): Add catchError() to pipe.
      })
    );
  }

  /**
   * When a debugger run exists, load number of alerts and their breakdown.
   */
  private createNumAlertsAndBreakdownLoader(prevStream$: Observable<void>) {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getDebuggerRunListing),
        this.store.select(getAlertsLoaded)
      ),
      filter(([, runs, loaded]) => {
        return (
          Object.keys(runs).length > 0 && loaded.state !== DataLoadState.LOADING
        );
      }),
      tap(() => this.store.dispatch(numAlertsAndBreakdownRequested())),
      mergeMap(([, runs]) => {
        const runId = Object.keys(runs)[0];
        const begin = 0;
        const end = 0;
        return this.dataSource.fetchAlerts(runId, begin, end).pipe(
          tap((alerts) => {
            this.store.dispatch(
              numAlertsAndBreakdownLoaded({
                numAlerts: alerts.num_alerts,
                alertsBreakdown: alerts.alerts_breakdown,
              })
            );
          }),
          map(() => void null)
        );
      })
    );
  }

  /**
   * Emits when initial execution digests and data are required.
   *
   * These initial data loading actions are required when the number of
   * executions is greater than zero.
   */
  private createInitialExecutionDetector(
    prevStream$: Observable<void>
  ): Observable<void> {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getNumExecutions),
        this.store.select(getExecutionDigestsLoaded)
      ),
      filter(([, numExecutions, executionDigestsLoaded]) => {
        return (
          numExecutions > 0 &&
          Object.keys(executionDigestsLoaded.pageLoadedSizes).length === 0
        );
      }),
      map(() => void null)
    );
  }

  /**
   * Emits when the first page if execution digests are required to be loaded.
   */
  private createInitialExecutionDigest(
    prevStream$: Observable<void>
  ): Observable<{
    runId: string;
    begin: number;
    end: number;
  }> {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getNumExecutions),
        this.store.select(getActiveRunId),
        this.store.select(getExecutionPageSize)
      ),
      filter(([, , runId]) => runId !== null),
      map(([, numExecutions, runId, pageSize]) => {
        const begin = 0;
        const end = Math.min(numExecutions, pageSize);
        return {begin, end, runId: runId!};
      })
    );
  }

  /**
   * Emits when scrolling event leads to need to load new execution digests.
   */
  private onExecutionScroll(): Observable<{
    runId: string;
    begin: number;
    end: number;
  }> {
    return this.actions$.pipe(
      ofType(executionScrollLeft, executionScrollRight, executionScrollToIndex),
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getExecutionScrollBeginIndex),
        this.store.select(getNumExecutions),
        this.store.select(getDisplayCount),
        this.store.select(getExecutionPageSize)
      ),
      filter(([runId]) => runId !== null),
      map(
        ([
          ,
          runId,
          scrollBeginIndex,
          numExecutions,
          displayCount,
          pageSize,
        ]) => {
          const begin = scrollBeginIndex;
          const end = Math.min(numExecutions, begin + displayCount);
          return {
            runId: runId!,
            begin,
            end,
            pageSize,
          };
        }
      ),
      withLatestFrom(this.store.select(getExecutionDigestsLoaded)),
      map(([props, loaded]) => {
        return {
          props,
          loaded,
          missingPages: getMissingPages(
            props.begin,
            props.end,
            props.pageSize,
            loaded.numExecutions,
            loaded.pageLoadedSizes
          ),
        };
      }),
      filter(({missingPages}) => missingPages.length > 0),
      map(({props, loaded, missingPages}) => {
        const {runId, pageSize} = props;
        const begin = missingPages[0] * pageSize;
        const end = Math.min(
          loaded.numExecutions,
          (missingPages[missingPages.length - 1] + 1) * pageSize
        );
        return {begin, end, runId: runId!};
      })
    );
  }

  /**
   * Load execution digests.
   */
  private createExecutionDigestLoader(
    prevStream$: Observable<{
      runId: string;
      begin: number;
      end: number;
    }>
  ): Observable<void> {
    return prevStream$.pipe(
      withLatestFrom(this.store.select(getExecutionDigestsLoaded)),
      filter(([{begin, end}, loaded]) => {
        return (
          end > begin &&
          !beginEndRangesInclude(loaded.loadingRanges, begin, end)
        );
      }),
      tap(([{begin, end}]) => {
        this.store.dispatch(executionDigestsRequested({begin, end}));
      }),
      mergeMap(([{runId, begin, end}]) => {
        return this.dataSource.fetchExecutionDigests(runId, begin, end).pipe(
          tap((digests) => {
            this.store.dispatch(executionDigestsLoaded(digests));
          }),
          map(() => void null)
        );
        // TODO(cais): Add catchError() to pipe.
      })
    );
  }

  /**
   * Emits when user focses on an execution digest.
   */
  private onExecutionDigestFocused(): Observable<{
    activeRunId: string;
    loadedExecutionData: {[index: number]: Execution};
    focusIndex: number;
  }> {
    return this.actions$.pipe(
      ofType(executionDigestFocused),
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getLoadedExecutionData),
        this.store.select(getExecutionScrollBeginIndex)
      ),
      map(([props, activeRunId, loadedExecutionData, scrollBeginIndex]) => {
        const focusIndex = scrollBeginIndex + props.displayIndex;
        return {
          activeRunId: activeRunId!,
          loadedExecutionData,
          focusIndex,
        };
      })
    );
  }

  /**
   * Load detailed data about execution and the associated stack frames.
   */
  private createExecutionDataAndStackFramesLoader(
    prevStream$: Observable<{
      activeRunId: string;
      loadedExecutionData: {[index: number]: Execution};
      focusIndex: number;
    }>
  ): Observable<void> {
    return prevStream$.pipe(
      filter(({activeRunId, loadedExecutionData, focusIndex}) => {
        return (
          activeRunId !== null &&
          focusIndex !== null &&
          loadedExecutionData[focusIndex!] === undefined
        );
      }),
      mergeMap(({activeRunId, focusIndex}) => {
        const begin = focusIndex!;
        const end = begin + 1;
        return this.dataSource
          .fetchExecutionData(activeRunId!, begin, end)
          .pipe(
            tap((executionDataResponse) => {
              this.store.dispatch(executionDataLoaded(executionDataResponse));
            }),
            map((executionDataResponse) => {
              return {executionData: executionDataResponse, begin, end};
            })
          );
        // TODO(cais): Add catchError() to pipe.
      }),
      map(({executionData}) => {
        return executionData.executions[0];
      }),
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getLoadedStackFrames)
      ),
      filter(([execution, runId, loadedStackFrames]) => {
        if (runId === null) {
          return false;
        }
        for (const stackFrameId of execution.stack_frame_ids) {
          if (loadedStackFrames[stackFrameId] === undefined) {
            return true;
          }
        }
        return false;
      }),
      mergeMap(([execution, runId]) => {
        const stackFrameIds = execution.stack_frame_ids;
        // TODO(cais): Maybe omit already-loaded stack frames from request,
        // instead of loading all frames if any of them is missing.
        return this.dataSource.fetchStackFrames(runId!, stackFrameIds).pipe(
          tap((stackFramesResponse) => {
            const stackFramesById: {
              [stackFrameId: string]: StackFrame;
            } = {};
            for (let i = 0; i < stackFrameIds.length; ++i) {
              stackFramesById[stackFrameIds[i]] =
                stackFramesResponse.stack_frames[i];
            }
            this.store.dispatch(
              stackFramesLoaded({stackFrames: stackFramesById})
            );
          }),
          map(() => void null)
        );
        // TODO(cais): Add catchError() to pipe.
      })
    );
  }

  /**
   * Emits when scrolling event leads to need to load new intra-graph execution
   * data.
   *
   * The returned observable contains the
   *   - runId: active runId,
   *   - missingPage: indices of missing `GraphExecution` pages that need to be
   *     loaded by a downstream pipe.
   *   - pageSize: GraphExecution data page size.
   *   - numGraphExecutions: Current total number of `GraphExecution`s.
   */
  private onGraphExecutionScroll(): Observable<{
    runId: string;
    missingPages: number[];
    pageSize: number;
    numGraphExecutions: number;
  }> {
    return this.actions$.pipe(
      ofType(graphExecutionScrollToIndex),
      debounceTime(100),
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getNumGraphExecutions),
        this.store.select(getGraphExecutionScrollBeginIndex)
      ),
      filter(([, runId, numGraphExecutions]) => {
        return runId !== null && numGraphExecutions > 0;
      }),
      map(([, runId, numGraphExecutions, scrollBeginIndex]) => ({
        runId,
        numGraphExecutions,
        scrollBeginIndex,
      })),
      withLatestFrom(
        this.store.select(getGraphExecutionPageSize),
        this.store.select(getGraphExecutionDisplayCount),
        this.store.select(getGraphExecutionDataLoadingPages),
        this.store.select(getGraphExecutionDataPageLoadedSizes)
      ),
      map(
        ([
          {runId, numGraphExecutions, scrollBeginIndex},
          pageSize,
          displayCount,
          loadingPages,
          pageLoadedSizes,
        ]) => {
          let missingPages: number[] = getMissingPages(
            scrollBeginIndex,
            Math.min(scrollBeginIndex + displayCount, numGraphExecutions),
            pageSize,
            numGraphExecutions,
            pageLoadedSizes
          );
          // Omit pages that are already loading.
          missingPages = missingPages.filter(
            (page) => loadingPages.indexOf(page) === -1
          );
          return {
            runId: runId!,
            missingPages,
            pageSize,
            numGraphExecutions,
          };
        }
      )
    );
  }

  private loadGraphExecutionPages(
    prevStream$: Observable<{
      runId: string;
      missingPages: number[];
      pageSize: number;
      numGraphExecutions: number;
    }>
  ): Observable<void> {
    return prevStream$.pipe(
      filter(({missingPages}) => missingPages.length > 0),
      tap(({missingPages}) => {
        missingPages.forEach((pageIndex) => {
          this.store.dispatch(graphExecutionDataRequested({pageIndex}));
        });
      }),
      mergeMap(({runId, missingPages, pageSize, numGraphExecutions}) => {
        const begin = missingPages[0] * pageSize;
        const end = Math.min(
          (missingPages[missingPages.length - 1] + 1) * pageSize,
          numGraphExecutions
        );
        return this.dataSource.fetchGraphExecutionData(runId!, begin, end).pipe(
          tap((graphExecutionDataResponse) => {
            this.store.dispatch(
              graphExecutionDataLoaded(graphExecutionDataResponse)
            );
          }),
          map(() => void null)
        );
        // TODO(cais): Add catchError() to pipe.
      })
    );
  }

  /**
   * Listens to graph-op focus events.
   *
   * Load graph op info from the /graphs/op_info route when necessary.
   *
   * @returns An object with two keys for downstream consumption:
   *   - runId: the current active run ID.
   *   - stackFrameIds: the IDs of the stack frames of the op's creation.
   */
  private loadGraphOpInfo(): Observable<{
    runId: string;
    stackFrameIds: string[];
  }> {
    return this.actions$.pipe(
      ofType(graphOpFocused, graphExecutionFocused),
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getLoadingGraphOps)
      ),
      filter(([actionData, runId, loadingOps]) => {
        const {graph_id, op_name} = actionData;
        return (
          runId !== null &&
          (loadingOps[graph_id] === undefined ||
            !loadingOps[graph_id].has(op_name) ||
            !(
              loadingOps[graph_id].get(op_name) === DataLoadState.LOADING ||
              loadingOps[graph_id].get(op_name) === DataLoadState.LOADED
            ))
        );
      }),
      tap(([{graph_id, op_name}]) =>
        this.store.dispatch(
          graphOpInfoRequested({
            graph_id,
            op_name,
          })
        )
      ),
      mergeMap(([actionData, runId]) => {
        const {graph_id, op_name} = actionData;
        return this.dataSource.fetchGraphOpInfo(runId!, graph_id, op_name).pipe(
          tap((graphOpInfoResponse) =>
            this.store.dispatch(graphOpInfoLoaded({graphOpInfoResponse}))
          ),
          map((graphOpInfoResponse) => {
            return {
              runId: runId!,
              stackFrameIds: graphOpInfoResponse.stack_frame_ids,
            };
          })
        );
        // TODO(cais): Add catchError() to pipe.
      })
    );
  }

  private loadGraphOpStackFrames(
    prevStream$: Observable<{runId: string; stackFrameIds: string[]}>
  ): Observable<void> {
    return prevStream$.pipe(
      withLatestFrom(this.store.select(getLoadedStackFrames)),
      map(([{runId, stackFrameIds}, loadedStackFrames]) => {
        const missingStackFrameIds = stackFrameIds.filter(
          (stackFrameId) => loadedStackFrames[stackFrameId] === undefined
        );
        return {runId, missingStackFrameIds};
      }),
      filter(({runId, missingStackFrameIds}) => {
        return runId !== null && missingStackFrameIds.length > 0;
      }),
      mergeMap(({runId, missingStackFrameIds}) => {
        return this.dataSource
          .fetchStackFrames(runId!, missingStackFrameIds)
          .pipe(
            tap((stackFramesResponse) => {
              const stackFramesById: {
                [stackFrameId: string]: StackFrame;
              } = {};
              // TODO(cais): Do this reshaping in the backend and simplify
              // the frontend code here.
              for (let i = 0; i < missingStackFrameIds.length; ++i) {
                stackFramesById[missingStackFrameIds[i]] =
                  stackFramesResponse.stack_frames[i];
              }
              this.store.dispatch(
                stackFramesLoaded({stackFrames: stackFramesById})
              );
            }),
            map(() => void null)
          );
        // TODO(cais): Add catchError() to pipe.
      })
    );
  }

  /**
   * Emits when user focuses on an alert type.
   *
   * Returns an Observable for what additional execution digests need to be fetched.
   */
  private onAlertTypeFocused(): Observable<AlertsResponse> {
    return this.actions$.pipe(
      ofType(alertTypeFocusToggled),
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getAlertsFocusType),
        this.store.select(getNumAlertsOfFocusedType),
        this.store.select(getLoadedAlertsOfFocusedType),
        this.store.select(getAlertsLoaded)
      ),
      filter(
        ([
          ,
          runId,
          focusType,
          numAlertsOfFocusedType,
          loadedAlertsOfFocusedType,
          alertsLoaded,
        ]) => {
          return (
            runId !== null &&
            focusType !== null &&
            numAlertsOfFocusedType > 0 &&
            (loadedAlertsOfFocusedType === null ||
              Object.keys(loadedAlertsOfFocusedType).length <
                numAlertsOfFocusedType) &&
            alertsLoaded.state !== DataLoadState.LOADING
          );
        }
      ),
      tap(() => this.store.dispatch(numAlertsAndBreakdownRequested())),
      mergeMap(([, runId, focusType]) => {
        const begin = 0;
        // TODO(cais): Use smarter `end` value to reduce the amount of data
        // fetch each time.
        const end = -1;
        return this.dataSource.fetchAlerts(
          runId as string,
          begin,
          end,
          focusType!
        );
      }),
      tap(({num_alerts, alerts_breakdown, alert_type, begin, end, alerts}) => {
        this.store.dispatch(
          alertsOfTypeLoaded({
            numAlerts: num_alerts,
            alertsBreakdown: alerts_breakdown,
            alertType: alert_type!,
            begin,
            end,
            alerts,
          })
        );
      })
    );
  }

  /**
   * Compute the execution digests to fetch on focusing of an alert type.
   */
  private fetchExecutionDigestsForAlertTypeFocus(
    prevStream$: Observable<AlertsResponse>
  ): Observable<{
    runId: string;
    begin: number;
    end: number;
  }> {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getExecutionPageSize),
        this.store.select(getDisplayCount),
        this.store.select(getNumExecutions),
        this.store.select(getExecutionDigestsLoaded),
        this.store.select(getActiveRunId)
      ),
      map(
        ([
          alertsResponse,
          pageSize,
          displayCount,
          numExecutions,
          executionDigestsLoaded,
          runId,
        ]) => {
          const alert = alertsResponse.alerts[0] as InfNanAlert;
          const executionIndex = alert.execution_index;
          const missingPages = getMissingPages(
            Math.max(0, executionIndex - Math.floor(displayCount / 2)),
            Math.min(
              executionIndex + Math.floor(displayCount / 2),
              numExecutions
            ),
            pageSize,
            numExecutions,
            executionDigestsLoaded.pageLoadedSizes
          );
          if (missingPages.length === 0) {
            return {runId: runId!, begin: 0, end: 0};
          } else {
            const begin = missingPages[0] * pageSize;
            const end = Math.min(
              executionDigestsLoaded.numExecutions,
              (missingPages[missingPages.length - 1] + 1) * pageSize
            );
            return {runId: runId!, begin, end};
          }
        }
      )
    );
  }

  /**
   * Load list of source files when debugger plugin is loaded.
   */
  private loadSourceFileList(prevStream$: Observable<void>) {
    return prevStream$.pipe(
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getSourceFileListLoaded)
      ),
      filter(([, runId, sourceFileListLoadState]) => {
        return (
          runId !== null &&
          sourceFileListLoadState.state !== DataLoadState.LOADING
        );
      }),
      tap(() => this.store.dispatch(sourceFileListRequested())),
      mergeMap(([, runId]) => {
        return this.dataSource.fetchSourceFileList(runId!).pipe(
          tap((sourceFileListResponse: SourceFileListResponse) => {
            const sourceFiles: SourceFileSpec[] = [];
            sourceFileListResponse.forEach(([host_name, file_path]) => {
              sourceFiles.push({host_name, file_path});
            });
            this.store.dispatch(sourceFileListLoaded({sourceFiles}));
          }),
          map(() => void null)
          // TODO(cais): Add catchError() to pipe.
        );
      })
    );
  }

  /**
   * When the a source file is focused on, load its content from the data source.
   */
  private onSourceFileFocused(): Observable<void> {
    return this.actions$.pipe(
      ofType(sourceLineFocused),
      withLatestFrom(
        this.store.select(getActiveRunId),
        this.store.select(getFocusedSourceFileIndex),
        this.store.select(getFocusedSourceFileContent)
      ),
      map(([focus, runId, fileIndex, fileContent]) => {
        return {
          runId,
          stackFrame: focus.stackFrame,
          fileIndex,
          fileContent,
        };
      }),
      filter(({runId, fileContent}) => {
        return (
          runId !== null &&
          fileContent !== null &&
          fileContent.loadState === DataLoadState.NOT_LOADED
        );
      }),
      tap(({stackFrame}) =>
        this.store.dispatch(
          sourceFileRequested({
            host_name: stackFrame.host_name,
            file_path: stackFrame.file_path,
          })
        )
      ),
      mergeMap(({fileIndex, runId}) => {
        return this.dataSource.fetchSourceFile(runId!, fileIndex).pipe(
          tap((sourceFileResponse) => {
            this.store.dispatch(sourceFileLoaded(sourceFileResponse));
          }),
          map(() => void null)
          // TODO(cais): Add catchError() to pipe.
        );
      })
    );
  }

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private dataSource: Tfdbg2HttpServerDataSource
  ) {
    /**
     * view load and subsequent
     * backoff polls, auto and
     * manual reload events
     *  |
     *  +> fetch run-+> fetch source-file list
     *  |            +> fetch num of top-level (eager) executions
     *  |            +> fetch num of intra-graph executions
     *  |            +> fetch num alerts
     *  |                +
     *  |                +> if init load and non-zero number of execs
     *  |                    +
     *  |                    +>+-----------------------------+
     *  |  on top-level      | | fetch top-level exec digest |
     *  |  scroll -----------+>+-----------------------------+<--------+
     *  |                    |                                         |
     *  |                    +>+----------------------------------+    |
     *  |                      | fetch exec data and stack frames |    |
     *  |  on focus  +-------->+----------------------------------+    |
     *  |                                                              |
     *  |                                                              |
     *  |                                                              |
     *  +------>+ fetch alert number and breakdown                     |
     *                                                                 |
     * on alert type focus --------> fetch alerts of a type -----------+
     *
     * on source file requested ---> fetch source file
     *
     * on graph-execution scroll --> fetch graph-execution data
     *
     * on graph-op focus & graph-execution focus --> fetch graph-op info ---+
     *                                                                      |
     *                                            fetch stack frames <------+
     **/
    this.loadData$ = createEffect(
      () => {
        // This event can trigger the loading of
        //   - list of source files.
        //   - number of executions
        //   - number and breakdown of alerts.
        // Therefore it needs to be a shared observable.
        const loadRunData$ = this.loadDebuggerRuns(
          merge(this.onDebuggerDataPoll(), this.onCoreReload())
        ).pipe(share());

        const loadSourceFileList$ = this.loadSourceFileList(loadRunData$);

        const onNumExecutionLoaded$ =
          this.createNumExecutionLoader(loadRunData$);
        const onNumAlertsLoaded$ =
          this.createNumAlertsAndBreakdownLoader(loadRunData$);

        const onAlertTypeFocused$ = this.onAlertTypeFocused();
        const fetchExecutionDigestsForAlertTypeFocus$ =
          this.fetchExecutionDigestsForAlertTypeFocus(onAlertTypeFocused$);

        // This event can trigger the loading of
        //   - execution-digest
        //   - first execution data.
        // Therefore it needs to be a shared observable.
        const onInitialExecution$ = this.createInitialExecutionDetector(
          onNumExecutionLoaded$
        ).pipe(share());
        const onExcutionDigestLoaded$ = this.createExecutionDigestLoader(
          merge(
            this.onExecutionScroll(),
            this.createInitialExecutionDigest(onInitialExecution$),
            fetchExecutionDigestsForAlertTypeFocus$
          )
        );
        const onExecutionDataLoaded$ =
          this.createExecutionDataAndStackFramesLoader(
            merge(
              this.onExecutionDigestFocused(),
              onInitialExecution$.pipe(
                withLatestFrom(
                  this.store.select(getActiveRunId),
                  this.store.select(getLoadedExecutionData)
                ),
                map(([, activeRunId, loadedExecutionData]) => {
                  return {
                    activeRunId: activeRunId!,
                    loadedExecutionData,
                    focusIndex: 0,
                  };
                })
              )
            )
          );

        const onNumGraphExecutionLoaded$ =
          this.createNumGraphExecutionLoader(loadRunData$);

        const onSourceFileFocused$ = this.onSourceFileFocused();

        const onGraphExecutionScroll$ = this.loadGraphExecutionPages(
          this.onGraphExecutionScroll()
        );

        const loadGraphOpInfoAndStackTrace$ = this.loadGraphOpStackFrames(
          this.loadGraphOpInfo()
        );

        // ExecutionDigest and ExecutionData can be loaded in parallel.
        return merge(
          onNumAlertsLoaded$,
          onExcutionDigestLoaded$,
          onExecutionDataLoaded$,
          onNumGraphExecutionLoaded$,
          loadSourceFileList$,
          onSourceFileFocused$,
          onGraphExecutionScroll$,
          loadGraphOpInfoAndStackTrace$
        ).pipe(
          // createEffect expects an Observable that emits {}.
          map(() => ({}))
        );
      },
      {dispatch: false}
    );
  }
}

export const TEST_ONLY = {
  createTimedRepeater,
  getMissingPages,
};
