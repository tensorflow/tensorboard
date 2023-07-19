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
import {forkJoin, Observable, of} from 'rxjs';
import {catchError, map, mergeMap, tap} from 'rxjs/operators';

import {State} from '../../app_state';
import * as actions from '../actions';
import {
  HparamsAndMetadata,
  Run,
  RunsDataSource,
} from '../data_source/runs_data_source_types';
import {ExperimentIdToRunsAndMetadata} from '../types';

type RunsAndMetadata = {
  experimentId: string;
  runs: Run[];
} & (
  | {
      fromRemote: false;
    }
  | {
      fromRemote: true;
      metadata: HparamsAndMetadata;
    }
);

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
          return this.fetchAllRunsList(experimentIds);
        })
      ),
    {dispatch: false}
  );

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly runsDataSource: RunsDataSource
  ) {}

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
  private fetchAllRunsList(experimentIds: string[]): Observable<null> {
    return of({experimentIds}).pipe(
      tap(() => {
        this.store.dispatch(
          actions.fetchRunsRequested({
            experimentIds,
            requestedExperimentIds: experimentIds,
          })
        );
      }),
      mergeMap(() => {
        return this.fetchRunsAndHparamsForExperiments(experimentIds);
      }),
      map((runsAndMedataList: RunsAndMetadata[]) => {
        const newRunsAndMetadata: ExperimentIdToRunsAndMetadata = {};
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
            requestedExperimentIds: experimentIds,
          })
        );
        return of(null);
      }),
      map(() => null)
    );
  }

  private fetchRunsForExperiments(
    experimentIds: string[]
  ): Observable<Record<string, Run[]>> {
    return forkJoin(
      experimentIds.map((eid) =>
        this.runsDataSource.fetchRuns(eid).pipe(map((run) => [eid, run]))
      )
    ).pipe(
      map(([...eidRunPairs]) => {
        return Object.fromEntries(eidRunPairs as Array<[string, Run[]]>);
      })
    );
  }

  private fetchRunsAndHparamsForExperiments(
    experimentIds: string[]
  ): Observable<RunsAndMetadata[]> {
    if (!experimentIds.length) return of([]);
    return forkJoin([
      this.runsDataSource.fetchHparamsMetadata(experimentIds),
      this.fetchRunsForExperiments(experimentIds),
    ]).pipe(
      map(([metadata, eidToRuns]) => {
        return experimentIds.map((experimentId) => ({
          fromRemote: true,
          experimentId,
          runs: eidToRuns[experimentId],
          metadata,
        }));
      })
    );
  }
}
