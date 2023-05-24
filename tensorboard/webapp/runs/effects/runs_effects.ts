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
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {forkJoin, merge, Observable, of, throwError} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {areSameRouteKindAndExperiments} from '../../app_routing';
import {navigated} from '../../app_routing/actions';
import {State} from '../../app_state';
import * as coreActions from '../../core/actions';
import {
  getActiveRoute,
  getExperimentIdsFromRoute,
  getRuns,
  getRunsLoadState,
} from '../../selectors';
import {DataLoadState, LoadState} from '../../types/data';
import * as actions from '../actions';
import {
  HparamsAndMetadata,
  Run,
  RunsDataSource,
} from '../data_source/runs_data_source_types';
import {ExperimentIdToRunsAndMetadata} from '../types';

/**
 * Runs effect for fetching data from the backend.
 */
@Injectable()
export class RunsEffects {
  /**
   * Ensures runs are loaded when a run table is shown.
   *
   * @export
   */
  loadRunsOnRunTableShown$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.runTableShown),
        mergeMap(({experimentIds}) => {
          const experimentsToFetch$ = this.getExperimentsWithLoadState(
            experimentIds,
            (state) => {
              return (
                state === DataLoadState.FAILED ||
                state === DataLoadState.NOT_LOADED
              );
            }
          );
          return experimentsToFetch$.pipe(
            filter((experimentIds) => !!experimentIds.length),
            mergeMap((experimentIdsToBeFetched) => {
              return this.fetchAllRunsList(
                experimentIds,
                experimentIdsToBeFetched
              );
            })
          );
        })
      ),
    {dispatch: false}
  );

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly runsDataSource: RunsDataSource
  ) {}

  private getRunsListLoadState(experimentId: string): Observable<LoadState> {
    return this.store.select(getRunsLoadState, {experimentId}).pipe(take(1));
  }

  private getExperimentsWithLoadState(
    experimentIds: string[],
    loadStateMatcher: (loadState: DataLoadState) => boolean
  ) {
    return forkJoin(
      experimentIds.map((eid) => {
        return this.getRunsListLoadState(eid);
      })
    ).pipe(
      map((loadStates) => {
        return experimentIds.filter((unused, index) => {
          return loadStateMatcher(loadStates[index].state);
        });
      })
    );
  }

  private readonly experimentsWithStaleRunsOnRouteChange$ = this.actions$.pipe(
    ofType(navigated),
    withLatestFrom(this.store.select(getActiveRoute)),
    distinctUntilChanged(([, prevRoute], [, currRoute]) => {
      return areSameRouteKindAndExperiments(prevRoute, currRoute);
    }),
    withLatestFrom(this.store.select(getExperimentIdsFromRoute)),
    filter(([, experimentIds]) => !!experimentIds),
    map(([, experimentIds]) => experimentIds!),
    mergeMap((experimentIds) => {
      return this.getExperimentsWithLoadState(experimentIds, (state) => {
        return (
          state === DataLoadState.FAILED || state === DataLoadState.NOT_LOADED
        );
      }).pipe(
        map((experimentIdsToBeFetched) => {
          return {experimentIds, experimentIdsToBeFetched};
        })
      );
    })
  );

  private readonly experimentsWithStaleRunsOnReload$ = this.actions$.pipe(
    ofType(coreActions.reload, coreActions.manualReload),
    withLatestFrom(this.store.select(getExperimentIdsFromRoute)),
    filter(([, experimentIds]) => !!experimentIds),
    map(([, experimentIds]) => experimentIds!),
    mergeMap((experimentIds) => {
      return this.getExperimentsWithLoadState(experimentIds, (state) => {
        return state !== DataLoadState.LOADING;
      }).pipe(
        map((experimentIdsToBeFetched) => {
          return {experimentIds, experimentIdsToBeFetched};
        })
      );
    })
  );

  /**
   * Fetches runs on navigation or in-app reload.
   *
   * @export
   */
  loadRunsOnNavigationOrReload$ = createEffect(
    () => {
      return merge(
        this.experimentsWithStaleRunsOnRouteChange$,
        this.experimentsWithStaleRunsOnReload$
      ).pipe(
        mergeMap(({experimentIds, experimentIdsToBeFetched}) => {
          return this.fetchAllRunsList(experimentIds, experimentIdsToBeFetched);
        })
      );
    },
    {dispatch: false}
  );

  /**
   * IMPORTANT: actions are dispatched even when there are no experiments to
   * fetch.
   *
   * Observable organization:
   * 1. dispatch requested action
   * 2. make requests for experiments that require fetching while waiting for
   *    runs if already loading and return runs
   * 3. combine the result from local + server where server data takaes
   *    precedence.
   * 4. dispatch succeeded if successful. else, dispatch failed.
   */
  private fetchAllRunsList(
    experimentIds: string[],
    experimentIdsToBeFetched: string[]
  ): Observable<null> {
    return of({experimentIds, experimentIdsToBeFetched}).pipe(
      tap(() => {
        this.store.dispatch(
          actions.fetchRunsRequested({
            experimentIds,
            requestedExperimentIds: experimentIdsToBeFetched,
          })
        );
      }),
      mergeMap(() => {
        const eidsToBeFetched = new Set(experimentIdsToBeFetched);

        const fetchOrGetRuns = experimentIds.map((experimentId) => {
          if (eidsToBeFetched.has(experimentId)) {
            return this.fetchRunsForExperiment(experimentId);
          }
          return this.maybeWaitForRunsAndGetRuns(experimentId);
        });
        return forkJoin(fetchOrGetRuns);
      }),
      map((runsAndMedataList) => {
        const newRunsAndMetadata = {} as ExperimentIdToRunsAndMetadata;
        const runsForAllExperiments: Run[] = [];

        for (const runsAndMedata of runsAndMedataList) {
          runsForAllExperiments.push(...runsAndMedata.runs);
          if (runsAndMedata.fromRemote) {
            newRunsAndMetadata[runsAndMedata.experimentId] = {
              runs: runsAndMedata.runs,
              metadata: runsAndMedata.metadata,
            };
          }
        }
        return {newRunsAndMetadata, runsForAllExperiments};
      }),
      tap(({newRunsAndMetadata, runsForAllExperiments}) => {
        this.store.dispatch(
          actions.fetchRunsSucceeded({
            experimentIds,
            newRunsAndMetadata,
            runsForAllExperiments,
          })
        );
      }),
      catchError((error) => {
        this.store.dispatch(
          actions.fetchRunsFailed({
            experimentIds,
            requestedExperimentIds: experimentIdsToBeFetched,
          })
        );
        return of(null);
      }),
      map(() => null)
    );
  }

  private maybeWaitForRunsAndGetRuns(experimentId: string): Observable<{
    fromRemote: false;
    experimentId: string;
    runs: Run[];
  }> {
    return this.store.select(getRunsLoadState, {experimentId}).pipe(
      filter((loadState) => loadState.state !== DataLoadState.LOADING),
      take(1),
      mergeMap((loadState) => {
        if (loadState.state === DataLoadState.FAILED) {
          return throwError(new Error('Pending request failed'));
        }
        return of(loadState);
      }),
      withLatestFrom(this.store.select(getRuns, {experimentId})),
      map(([, runs]) => ({fromRemote: false, experimentId, runs}))
    );
  }

  private fetchRunsForExperiment(experimentId: string): Observable<{
    fromRemote: true;
    experimentId: string;
    runs: Run[];
    metadata: HparamsAndMetadata;
  }> {
    return forkJoin([
      this.runsDataSource.fetchRuns(experimentId),
      this.runsDataSource.fetchHparamsMetadata(experimentId),
    ]).pipe(
      map(([runs, metadata]) => {
        return {fromRemote: true, experimentId, runs, metadata};
      })
    );
  }
}
