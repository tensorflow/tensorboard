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
  debounceTime,
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
import {RouteKind} from '../../app_routing/types';
import {State} from '../../app_state';
import * as coreActions from '../../core/actions';
import * as hparamsActions from '../../hparams/_redux/hparams_actions';
import {
  getActiveRoute,
  getDashboardExperimentNames,
  getExperimentIdsFromRoute,
  getRunColorMap,
  getRuns,
  getRunsLoadState,
} from '../../selectors';
import {DataLoadState, LoadState} from '../../types/data';
import {ColumnHeaderType} from '../../widgets/data_table/types';
import * as actions from '../actions';
import {TBRunColorDataSource} from '../data_source/run_color_data_source';
import {Run, RunsDataSource} from '../data_source/runs_data_source_types';
import {ExperimentIdToRuns} from '../types';
import {
  getDefaultRunColorIdMap,
  getGroupKeyToColorIdMap,
  getRunColorOverride,
  getRunSelectionMap,
} from '../store/runs_selectors';
import {hashColorIdToHex, resolveColorClashes} from '../../util/oklch_colors';
import {getDarkModeEnabled} from '../../feature_flag/store/feature_flag_selectors';

const RUN_COLOR_STORAGE_KEY = '_tb_run_colors.v1';
const RUN_SELECTION_STORAGE_KEY = '_tb_run_selection.v1';

/**
 * The Polymer tf-runs-selector persists its `runSelectionState` to
 * localStorage via tf-storage using base64-encoded JSON.  The key names
 * in that object are bare run names (no experiment prefix), while the
 * NgRx state uses full run IDs (`experimentId/runName`).
 *
 * To keep the two systems in sync we read from and write to both formats.
 */
const POLYMER_RUN_SELECTION_STORAGE_KEY = 'runSelectionState';

type StoredRunColorsV1 = {
  version: 1;
  runColorOverrides: Array<[runId: string, color: string]>;
  groupKeyToColorId: Array<[groupKey: string, colorId: number]>;
};

type StoredRunSelectionV1 = {
  version: 1;
  runSelection: Array<[runId: string, selected: boolean]>;
};

function safeParseStoredRunColors(
  serialized: string | null
): StoredRunColorsV1 {
  if (!serialized) {
    return {version: 1, runColorOverrides: [], groupKeyToColorId: []};
  }
  try {
    const parsed = JSON.parse(serialized) as Partial<StoredRunColorsV1>;
    if (parsed.version !== 1) {
      return {version: 1, runColorOverrides: [], groupKeyToColorId: []};
    }
    return {
      version: 1,
      runColorOverrides: Array.isArray(parsed.runColorOverrides)
        ? parsed.runColorOverrides
        : [],
      groupKeyToColorId: Array.isArray(parsed.groupKeyToColorId)
        ? parsed.groupKeyToColorId
        : [],
    };
  } catch {
    return {version: 1, runColorOverrides: [], groupKeyToColorId: []};
  }
}

function safeParseStoredRunSelection(
  serialized: string | null
): StoredRunSelectionV1 {
  if (!serialized) {
    return {version: 1, runSelection: []};
  }
  try {
    const parsed = JSON.parse(serialized) as Partial<StoredRunSelectionV1>;
    if (parsed.version !== 1) {
      return {version: 1, runSelection: []};
    }
    return {
      version: 1,
      runSelection: Array.isArray(parsed.runSelection)
        ? parsed.runSelection
        : [],
    };
  } catch {
    return {version: 1, runSelection: []};
  }
}

/**
 * Read the Polymer tf-runs-selector localStorage format.  Returns run
 * entries keyed by bare run name (no experiment prefix).
 */
function safeParsePolymerRunSelection(): Array<
  [runName: string, selected: boolean]
> {
  const raw = window.localStorage.getItem(POLYMER_RUN_SELECTION_STORAGE_KEY);
  if (!raw) return [];
  try {
    const obj = JSON.parse(atob(raw)) as Record<string, boolean>;
    return Object.entries(obj);
  } catch {
    return [];
  }
}

const POLYMER_RUN_COLOR_MAP_KEY = '_tb_run_color_map';

function persistRunColorsToLocalStorage(
  runColorOverrides: Map<string, string>,
  groupKeyToColorId: Map<string, number>,
  runColorMap: Record<string, string>
) {
  const payload: StoredRunColorsV1 = {
    version: 1,
    runColorOverrides: Array.from(runColorOverrides.entries()),
    groupKeyToColorId: Array.from(groupKeyToColorId.entries()),
  };
  window.localStorage.setItem(RUN_COLOR_STORAGE_KEY, JSON.stringify(payload));

  // Write a run-name → hex-color map so the Polymer old-style dashboards
  // (Scalars, Images, Text) display the same colors as the time-series tab.
  const polymerColorMap: Record<string, string> = {};
  for (const [runId, hex] of Object.entries(runColorMap)) {
    polymerColorMap[runIdToRunName(runId)] = hex;
  }
  window.localStorage.setItem(
    POLYMER_RUN_COLOR_MAP_KEY,
    JSON.stringify(polymerColorMap)
  );
}

function runIdToRunName(runId: string): string {
  const slashIdx = runId.indexOf('/');
  return slashIdx >= 0 ? runId.substring(slashIdx + 1) : runId;
}

function persistRunSelectionToLocalStorage(runSelection: Map<string, boolean>) {
  const payload: StoredRunSelectionV1 = {
    version: 1,
    runSelection: Array.from(runSelection.entries()),
  };
  window.localStorage.setItem(
    RUN_SELECTION_STORAGE_KEY,
    JSON.stringify(payload)
  );

  // Also write the Polymer-compatible format so that old-style plugin
  // dashboards (Scalars, Images, Text) pick up selection changes made
  // in the time-series dashboard.
  const polymerState: Record<string, boolean> = {};
  for (const [runId, selected] of runSelection) {
    polymerState[runIdToRunName(runId)] = selected;
  }
  window.localStorage.setItem(
    POLYMER_RUN_SELECTION_STORAGE_KEY,
    btoa(JSON.stringify(polymerState))
  );
}

function runToRunId(run: string, experimentId: string) {
  return `${experimentId}/${run}`;
}

/**
 * Runs effect for fetching data from the backend.
 */
@Injectable()
export class RunsEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly runsDataSource: RunsDataSource,
    private readonly runColorDataSource: TBRunColorDataSource
  ) {
    this.experimentsWithStaleRunsOnRouteChange$ = this.actions$.pipe(
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
    this.experimentsWithStaleRunsOnReload$ = this.actions$.pipe(
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
    this.loadRunsOnNavigationOrReload$ = createEffect(
      () => {
        return merge(
          this.experimentsWithStaleRunsOnRouteChange$,
          this.experimentsWithStaleRunsOnReload$
        ).pipe(
          withLatestFrom(this.store.select(getActiveRoute)),
          filter(
            ([, route]) => route !== null && route.routeKind !== RouteKind.CARD
          ),
          mergeMap(([{experimentIds, experimentIdsToBeFetched}]) => {
            return this.fetchAllRunsList(
              experimentIds,
              experimentIdsToBeFetched
            );
          })
        );
      },
      {dispatch: false}
    );
    this.removeHparamFilterWhenColumnIsRemoved$ = createEffect(
      () =>
        this.actions$.pipe(
          ofType(actions.runsTableHeaderRemoved),
          tap(({header}) => {
            if (header.type === ColumnHeaderType.HPARAM) {
              this.store.dispatch(
                hparamsActions.dashboardHparamFilterRemoved({
                  name: header.name,
                })
              );
              return;
            }
            if (header.type === ColumnHeaderType.METRIC) {
              this.store.dispatch(
                hparamsActions.dashboardMetricFilterRemoved({
                  name: header.name,
                })
              );
            }
          })
        ),
      {dispatch: false}
    );

    this.loadRunColorSettingsFromStorage$ = createEffect(() => {
      return this.actions$.pipe(
        ofType(navigated),
        map(() => {
          const stored = safeParseStoredRunColors(
            window.localStorage.getItem(RUN_COLOR_STORAGE_KEY)
          );
          return actions.runColorSettingsLoaded({
            runColorOverrides: stored.runColorOverrides,
            groupKeyToColorId: stored.groupKeyToColorId,
          });
        })
      );
    });

    this.loadRunSelectionFromStorage$ = createEffect(() => {
      return this.actions$.pipe(
        ofType(navigated),
        map(() => {
          const stored = safeParseStoredRunSelection(
            window.localStorage.getItem(RUN_SELECTION_STORAGE_KEY)
          );

          let runSelection = stored.runSelection;

          // If the NgRx format is empty, fall back to the Polymer
          // tf-runs-selector format (bare run names).  This picks up
          // selections made in old-style plugin dashboards.
          if (runSelection.length === 0) {
            runSelection = safeParsePolymerRunSelection();
          }

          // If stored selection exists but ALL runs are set to false
          // (none visible), discard it so the default behaviour (all
          // runs visible) takes over.
          const hasAnyVisibleRuns = runSelection.some(
            ([, selected]) => selected
          );
          if (runSelection.length > 0 && !hasAnyVisibleRuns) {
            return actions.runSelectionStateLoaded({
              runSelection: [],
            });
          }
          return actions.runSelectionStateLoaded({
            runSelection,
          });
        })
      );
    });

    this.persistRunColorSettings$ = createEffect(
      () => {
        return this.actions$.pipe(
          ofType(
            actions.runColorChanged,
            actions.runGroupByChanged,
            actions.fetchRunsSucceeded,
            actions.runColorSettingsLoaded,
            actions.runColorOverridesFetchedFromApi,
            actions.profileRunsSettingsApplied
          ),
          debounceTime(200),
          withLatestFrom(
            this.store.select(getRunColorOverride),
            this.store.select(getGroupKeyToColorIdMap),
            this.store.select(getRunColorMap)
          ),
          tap(([, runColorOverrides, groupKeyToColorId, runColorMap]) => {
            persistRunColorsToLocalStorage(
              runColorOverrides,
              groupKeyToColorId,
              runColorMap
            );
          })
        );
      },
      {dispatch: false}
    );

    this.persistRunSelection$ = createEffect(
      () => {
        return this.actions$.pipe(
          ofType(
            actions.runSelectionToggled,
            actions.runRangeSelectionToggled,
            actions.runPageSelectionToggled,
            actions.singleRunSelected,
            actions.fetchRunsSucceeded,
            actions.runSelectionStateLoaded
          ),
          debounceTime(200),
          withLatestFrom(this.store.select(getRunSelectionMap)),
          tap(([, runSelection]) => {
            persistRunSelectionToLocalStorage(runSelection);
          })
        );
      },
      {dispatch: false}
    );

    /**
     * After runs are loaded, compute all active run colors and detect
     * perceptual clashes (OKLAB deltaE below threshold).  For each clash,
     * pick a maximally-distant replacement color and save it as an
     * override so it persists across refreshes.
     */
    this.resolveColorClashes$ = createEffect(() => {
      return this.actions$.pipe(
        ofType(actions.fetchRunsSucceeded),
        debounceTime(300),
        withLatestFrom(
          this.store.select(getDefaultRunColorIdMap),
          this.store.select(getRunColorOverride),
          this.store.select(getDarkModeEnabled)
        ),
        filter(([, defaultMap]) => defaultMap.size > 1),
        map(([, defaultRunColorIdMap, existingOverrides, darkMode]) => {
          // Build the current runId -> hex color map.
          const runIdToColor = new Map<string, string>();
          defaultRunColorIdMap.forEach((colorId, runId) => {
            if (existingOverrides.has(runId)) {
              runIdToColor.set(runId, existingOverrides.get(runId)!);
            } else if (colorId >= 0) {
              runIdToColor.set(runId, hashColorIdToHex(colorId, darkMode));
            }
          });

          return resolveColorClashes(runIdToColor, darkMode);
        }),
        filter((overrides) => overrides.size > 0),
        map((overrides) =>
          actions.runColorSettingsLoaded({
            runColorOverrides: Array.from(overrides.entries()),
            groupKeyToColorId: [],
          })
        )
      );
    });
  }

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

  private readonly experimentsWithStaleRunsOnRouteChange$;

  private readonly experimentsWithStaleRunsOnReload$;

  /**
   * Fetches runs on navigation or in-app reload.
   *
   * @export
   */
  loadRunsOnNavigationOrReload$;

  /**
   * Removes hparam filter when column is removed.
   *
   * @export
   */
  removeHparamFilterWhenColumnIsRemoved$;

  /** @export */
  loadRunColorSettingsFromStorage$;

  /** @export */
  persistRunColorSettings$;

  /** @export */
  loadRunSelectionFromStorage$;

  /** @export */
  persistRunSelection$;

  /** @export */
  resolveColorClashes$;

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
        const newRuns: ExperimentIdToRuns = {};
        const runsForAllExperiments = [];
        const runColorOverrideEntries: Array<[string, string]> = [];

        for (const runsAndMedata of runsAndMedataList) {
          runsForAllExperiments.push(...runsAndMedata.runs);
          if (runsAndMedata.fromRemote) {
            newRuns[runsAndMedata.experimentId] = {
              runs: runsAndMedata.runs,
            };
            for (const [runName, color] of Object.entries(
              runsAndMedata.runColors
            )) {
              runColorOverrideEntries.push([
                runToRunId(runName, runsAndMedata.experimentId),
                color,
              ]);
            }
          }
        }
        return {newRuns, runsForAllExperiments, runColorOverrideEntries};
      }),
      withLatestFrom(this.store.select(getDashboardExperimentNames)),
      tap(([runsData, expNameByExpId]) => {
        const {newRuns, runsForAllExperiments, runColorOverrideEntries} =
          runsData;
        if (runColorOverrideEntries.length) {
          this.store.dispatch(
            actions.runColorOverridesFetchedFromApi({
              runColorOverrides: runColorOverrideEntries,
            })
          );
        }
        this.store.dispatch(
          actions.fetchRunsSucceeded({
            experimentIds,
            newRuns,
            runsForAllExperiments,
            expNameByExpId,
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
    runColors: Record<string, string>;
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
      map(([, runs]) => ({
        fromRemote: false,
        experimentId,
        runs,
        runColors: {},
      }))
    );
  }

  private fetchRunsForExperiment(experimentId: string): Observable<{
    fromRemote: true;
    experimentId: string;
    runs: Run[];
    runColors: Record<string, string>;
  }> {
    return forkJoin([
      this.runsDataSource.fetchRuns(experimentId),
      this.runColorDataSource
        .fetchRunColors(experimentId)
        .pipe(catchError(() => of({}))),
    ]).pipe(
      map(([runs, runColors]) => {
        return {
          fromRemote: true,
          experimentId,
          runs: runs as Run[],
          runColors,
        };
      })
    );
  }
}
