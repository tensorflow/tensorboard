/* Copyright 2026 The TensorFlow Authors. All Rights Reserved.

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
import {combineLatest, EMPTY, from, of} from 'rxjs';
import {
  catchError,
  filter,
  first,
  map,
  mergeMap,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import {navigated} from '../../app_routing/actions';
import {State} from '../../app_state';
import {getExperimentIdsFromRoute} from '../../selectors';
import {DataLoadState} from '../../types/data';
import {
  getMetricsScalarSmoothing,
  getMetricsSymlogLinearThreshold,
  getMetricsTagFilter,
  getPinnedCardsWithMetadata,
  getUnresolvedImportedPinnedCards,
  getSuperimposedCardsWithMetadata,
  getMetricsYAxisScale,
  getMetricsXAxisScale,
  getTagAxisScales,
  getTagSymlogLinearThresholds,
} from '../../metrics/store/metrics_selectors';
import {
  getRunColorOverride,
  getRunSelectionMap,
  getGroupKeyToColorIdMap,
  getRunUserSetGroupBy,
  getRunSelectorRegexFilter,
  getDashboardRuns,
  getRunsLoadState,
} from '../../runs/store/runs_selectors';
import {CardIdWithMetadata, CardUniqueInfo} from '../../metrics/types';
import {GroupBy, GroupByKey} from '../../runs/types';
import {ProfileDataSource} from '../data_source/profile_data_source';
import * as profileActions from '../actions/profile_actions';
import * as metricsActions from '../../metrics/actions';
import * as runsActions from '../../runs/actions';
import {
  ProfileData,
  ProfileGroupBy,
  RunColorEntry,
  GroupColorEntry,
  RunSelectionEntryType,
  ProfileSource,
  createEmptyProfile,
  nameToScaleType,
  scaleTypeToName,
  PROFILE_VERSION,
  AxisScaleName,
  TagAxisScale,
} from '../types';
import {
  isSampledPlugin,
  isSingleRunPlugin,
} from '../../metrics/data_source/types';
import {ScaleType} from '../../widgets/line_chart_v2/lib/scale_types';
import * as profileSelectors from '../store/profile_selectors';

function buildTagAxisScalesForProfile(
  tagAxisScales: Record<string, {yAxisScale: ScaleType; xAxisScale: ScaleType}>
): Record<string, TagAxisScale> {
  const result: Record<string, TagAxisScale> = {};
  for (const [tag, scales] of Object.entries(tagAxisScales)) {
    const entry: TagAxisScale = {};
    if (scales.yAxisScale !== ScaleType.LINEAR) {
      entry.y = scaleTypeToName(scales.yAxisScale);
    }
    if (scales.xAxisScale !== ScaleType.LINEAR) {
      entry.x = scaleTypeToName(scales.xAxisScale);
    }
    if (entry.y || entry.x) {
      result[tag] = entry;
    }
  }
  return result;
}

const RUN_SELECTION_STORAGE_KEY = '_tb_run_selection.v1';

function hasStoredRunSelection(): boolean {
  const raw = window.localStorage.getItem(RUN_SELECTION_STORAGE_KEY);
  if (!raw) {
    return false;
  }
  try {
    const parsed = JSON.parse(raw) as {runSelection?: unknown};
    return Array.isArray(parsed.runSelection) && parsed.runSelection.length > 0;
  } catch {
    return false;
  }
}

/**
 * Effects for profile management.
 */
@Injectable()
export class ProfileEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly profileDataSource: ProfileDataSource
  ) {}

  /**
   * Load profile list on navigation.
   */
  loadProfileListOnNavigation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(navigated),
      take(1), // Only load once on initial navigation
      map(() => profileActions.profileListRequested())
    )
  );

  /**
   * Load the profile list from localStorage.
   */
  loadProfileList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileListRequested),
      map(() => {
        const profiles = this.profileDataSource.listProfiles();
        return profileActions.profileListLoaded({profiles});
      })
    )
  );

  /**
   * Load a specific profile from localStorage.
   */
  loadProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileLoadRequested),
      map(({name}) => {
        const profile = this.profileDataSource.loadProfile(name);
        if (profile) {
          return profileActions.profileLoaded({profile});
        }
        return profileActions.profileLoadFailed({
          name,
          error: `Profile "${name}" not found`,
        });
      })
    )
  );

  /**
   * Activate a loaded profile by applying its settings.
   */
  activateLoadedProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileLoaded),
      map(({profile}) =>
        profileActions.profileActivated({
          profile,
          source: ProfileSource.LOCAL,
        })
      )
    )
  );

  fetchDefaultProfilesOnNavigation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(navigated),
      withLatestFrom(
        this.store.select(getExperimentIdsFromRoute),
        this.store.select(profileSelectors.getDefaultProfiles)
      ),
      mergeMap(([, experimentIds, defaultProfiles]) => {
        if (!experimentIds) {
          return EMPTY;
        }
        const missingExperimentIds = experimentIds.filter(
          (experimentId: string) => !defaultProfiles.has(experimentId)
        );
        return from(missingExperimentIds).pipe(
          map((experimentId: string) =>
            profileActions.defaultProfileFetchRequested({experimentId})
          )
        );
      })
    )
  );

  /**
   * Apply default profile when BOTH conditions are met:
   * 1. Runs have been loaded (fetchRunsSucceeded)
   * 2. Default profile has been fetched (defaultProfileFetched with a profile)
   *
   * Uses combineLatest to wait for both, and first() to only apply once.
   */
  applyDefaultProfile$ = createEffect(() =>
    combineLatest([
      // Wait for runs to load
      this.actions$.pipe(ofType(runsActions.fetchRunsSucceeded), take(1)),
      // Wait for default profile to be fetched
      this.actions$.pipe(
        ofType(profileActions.defaultProfileFetched),
        filter(({profile}) => Boolean(profile)),
        take(1)
      ),
    ]).pipe(
      first(), // Only emit once when both conditions are met
      withLatestFrom(
        this.store.select(profileSelectors.getActiveProfileName),
        this.store.select(getExperimentIdsFromRoute)
      ),
      map(([[, {profile}], activeProfileName, experimentIds]) => {
        // Check both NgRx state and localStorage for active profile name.
        const localActiveProfile =
          this.profileDataSource.getActiveProfileName();

        // Check if user has any saved state - don't overwrite their state.
        const savedPinsRaw = window.localStorage.getItem('tb-saved-pins');
        const hasSavedPins =
          savedPinsRaw &&
          (() => {
            try {
              const pins = JSON.parse(savedPinsRaw) as unknown;
              return Array.isArray(pins) && pins.length > 0;
            } catch {
              return false;
            }
          })();

        const profileIndexRaw =
          window.localStorage.getItem('_tb_profiles_index');
        const hasLocalProfiles =
          profileIndexRaw &&
          (() => {
            try {
              const index = JSON.parse(profileIndexRaw) as unknown;
              return Array.isArray(index) && index.length > 0;
            } catch {
              return false;
            }
          })();

        const superimposedCardsRaw = window.localStorage.getItem(
          '_tb_superimposed_cards.v1'
        );
        const hasSuperimposedCards =
          superimposedCardsRaw &&
          (() => {
            try {
              const data = JSON.parse(superimposedCardsRaw) as {
                cards?: unknown;
              };
              return Array.isArray(data?.cards) && data.cards.length > 0;
            } catch {
              return false;
            }
          })();

        const hasStoredAxisScales = Boolean(
          window.localStorage.getItem('_tb_axis_scales.v1')
        );

        if (
          activeProfileName ||
          localActiveProfile ||
          hasSavedPins ||
          hasLocalProfiles ||
          hasSuperimposedCards ||
          hasStoredAxisScales ||
          !experimentIds ||
          experimentIds.length !== 1
        ) {
          return null;
        }

        return profileActions.profileActivated({
          profile: profile as ProfileData,
          source: ProfileSource.BACKEND,
        });
      }),
      filter(
        (
          action
        ): action is ReturnType<typeof profileActions.profileActivated> =>
          action !== null
      )
    )
  );

  /**
   * Apply profile settings to metrics state.
   */
  applyProfileToMetrics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileActivated),
      map(({profile, source}) => {
        // Check if user has a tag filter stored in localStorage.
        // If so, prefer that over the profile's tag filter.
        let tagFilter = profile.tagFilter;
        const storedTagFilter =
          window.localStorage.getItem('_tb_tag_filter.v1');
        if (storedTagFilter) {
          try {
            const parsed = JSON.parse(storedTagFilter) as {value?: string};
            if (typeof parsed.value === 'string') {
              // User has explicitly set/cleared the tag filter - use that instead
              tagFilter = parsed.value;
            }
          } catch {
            // Invalid JSON, use profile's tagFilter
          }
        }

        // Handle pinned cards:
        // Always sync to localStorage so pins persist across refreshes.
        // For BACKEND profiles, this is safe because they only apply when
        // there's no existing user state (checked in applyDefaultProfile effects).
        const pinnedCards = profile.pinnedCards;

        window.localStorage.setItem(
          'tb-saved-pins',
          JSON.stringify(pinnedCards)
        );

        return metricsActions.profileMetricsSettingsApplied({
          pinnedCards,
          superimposedCards: profile.superimposedCards.map((card) => ({
            id: card.id,
            title: card.title,
            tags: card.tags,
            runId: card.runId,
          })),
          tagFilter,
          smoothing: profile.smoothing,
          yAxisScale: profile.yAxisScale
            ? nameToScaleType(profile.yAxisScale)
            : ScaleType.LINEAR,
          xAxisScale: profile.xAxisScale
            ? nameToScaleType(profile.xAxisScale)
            : ScaleType.LINEAR,
          tagAxisScales: profile.tagAxisScales
            ? Object.fromEntries(
                Object.entries(profile.tagAxisScales).map(([tag, entry]) => [
                  tag,
                  {
                    yAxisScale: entry.y
                      ? nameToScaleType(entry.y)
                      : ScaleType.LINEAR,
                    xAxisScale: entry.x
                      ? nameToScaleType(entry.x)
                      : ScaleType.LINEAR,
                  },
                ])
              )
            : {},
          ...(profile.symlogLinearThreshold !== undefined
            ? {symlogLinearThreshold: profile.symlogLinearThreshold}
            : {}),
          ...(profile.tagSymlogLinearThresholds !== undefined
            ? {tagSymlogLinearThresholds: profile.tagSymlogLinearThresholds}
            : {}),
        });
      })
    )
  );

  /**
   * Apply profile settings to runs state.
   */
  applyProfileToRuns$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileActivated),
      map(({profile}) => {
        let groupBy: GroupBy | null = null;
        if (profile.groupBy) {
          if (
            profile.groupBy.key === GroupByKey.REGEX ||
            profile.groupBy.key === GroupByKey.REGEX_BY_EXP
          ) {
            groupBy = {
              key: profile.groupBy.key,
              regexString: profile.groupBy.regexString || '',
            };
          } else {
            groupBy = {
              key: profile.groupBy.key,
            };
          }
        }
        return runsActions.profileRunsSettingsApplied({
          runColors: profile.runColors,
          groupColors: profile.groupColors,
          groupBy,
          runFilter: profile.runFilter,
        });
      })
    )
  );

  applyProfileRunSelection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileActivated),
      filter(({profile}) => profile.runSelection !== undefined),
      filter(({source}) => {
        if (source === ProfileSource.BACKEND) {
          return !hasStoredRunSelection();
        }
        return true;
      }),
      withLatestFrom(this.store.select(getDashboardRuns)),
      map(([{profile}, runs]) => {
        const runSelection = profile.runSelection ?? [];
        const selectionMap = new Map<string, boolean>();
        const runIdsByName = new Map<string, string[]>();

        for (const run of runs) {
          const names = runIdsByName.get(run.name);
          if (names) {
            names.push(run.id);
          } else {
            runIdsByName.set(run.name, [run.id]);
          }
        }

        for (const entry of runSelection) {
          if (entry.type === RunSelectionEntryType.RUN_ID) {
            selectionMap.set(entry.value, entry.selected);
            continue;
          }
          const matchingRunIds = runIdsByName.get(entry.value) ?? [];
          for (const runId of matchingRunIds) {
            selectionMap.set(runId, entry.selected);
          }
        }

        // Runs not explicitly listed in the profile selection should be visible
        // by default. Only runs explicitly set to false should be hidden.
        for (const run of runs) {
          if (!selectionMap.has(run.id)) {
            selectionMap.set(run.id, true);
          }
        }

        return runsActions.runSelectionStateLoaded({
          runSelection: Array.from(selectionMap.entries()),
        });
      })
    )
  );

  /**
   * Save the current state as a profile.
   */
  saveProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileSaveRequested),
      withLatestFrom(
        this.store.select(getPinnedCardsWithMetadata),
        this.store.select(getUnresolvedImportedPinnedCards),
        this.store.select(getSuperimposedCardsWithMetadata),
        this.store.select(getRunColorOverride),
        this.store.select(getGroupKeyToColorIdMap),
        this.store.select(getMetricsTagFilter),
        this.store.select(getRunSelectorRegexFilter),
        this.store.select(getMetricsScalarSmoothing),
        this.store.select(getMetricsSymlogLinearThreshold),
        this.store.select(getRunUserSetGroupBy),
        this.store.select(getRunSelectionMap),
        this.store.select(getDashboardRuns),
        this.store.select(getMetricsYAxisScale),
        this.store.select(getMetricsXAxisScale),
        this.store.select(getTagAxisScales),
        this.store.select(getTagSymlogLinearThresholds)
      ),
      map(
        ([
          {name},
          pinnedCards,
          unresolvedPinnedCards,
          superimposedCards,
          runColorOverrides,
          groupKeyToColorId,
          tagFilter,
          runFilter,
          smoothing,
          symlogLinearThreshold,
          groupBy,
          runSelectionMap,
          runs,
          yAxisScale,
          xAxisScale,
          tagAxisScales,
          tagSymlogLinearThresholds,
        ]) => {
          // Convert pinned cards to CardUniqueInfo format
          const pinnedCardsInfo: CardUniqueInfo[] = pinnedCards.map((card) => {
            const info: CardUniqueInfo = {
              plugin: card.plugin,
              tag: card.tag,
            };
            if (isSingleRunPlugin(card.plugin) && card.runId) {
              info.runId = card.runId;
            }
            if (isSampledPlugin(card.plugin) && card.sample !== undefined) {
              info.sample = card.sample;
            }
            if (card.tags !== undefined) {
              info.tags = [...card.tags];
            }
            if (card.title !== undefined) {
              info.title = card.title;
            }
            return info;
          });

          // Include unresolved imported pinned cards
          const allPinnedCards = [...pinnedCardsInfo, ...unresolvedPinnedCards];

          // Convert run colors Map to array
          const runColors: RunColorEntry[] = Array.from(
            runColorOverrides.entries()
          ).map(([runId, color]) => ({runId, color}));

          // Convert group colors Map to array
          const groupColors: GroupColorEntry[] = Array.from(
            groupKeyToColorId.entries()
          ).map(([groupKey, colorId]) => ({groupKey, colorId}));

          // Convert groupBy to ProfileGroupBy
          let profileGroupBy: ProfileGroupBy | null = null;
          if (groupBy) {
            profileGroupBy = {key: groupBy.key};
            if (
              groupBy.key === GroupByKey.REGEX ||
              groupBy.key === GroupByKey.REGEX_BY_EXP
            ) {
              profileGroupBy.regexString = groupBy.regexString;
            }
          }

          const runSelection = runs.map((run) => ({
            type: RunSelectionEntryType.RUN_ID,
            value: run.id,
            selected: Boolean(runSelectionMap.get(run.id)),
          }));

          const profile: ProfileData = {
            version: PROFILE_VERSION,
            name,
            lastModifiedTimestamp: Date.now(),
            pinnedCards: allPinnedCards,
            runColors,
            groupColors,
            superimposedCards: [...superimposedCards],
            runSelection,
            tagFilter,
            runFilter,
            smoothing,
            symlogLinearThreshold,
            groupBy: profileGroupBy,
            yAxisScale: scaleTypeToName(yAxisScale),
            xAxisScale: scaleTypeToName(xAxisScale),
            tagAxisScales: buildTagAxisScalesForProfile(tagAxisScales),
            ...(Object.keys(tagSymlogLinearThresholds).length > 0
              ? {tagSymlogLinearThresholds}
              : {}),
          };

          // Save to localStorage
          this.profileDataSource.saveProfile(profile);
          this.profileDataSource.setActiveProfileName(name);

          // Also sync tb-saved-pins to match the profile's pinned cards.
          // This ensures consistency between the profile system and the
          // independent pin storage system.
          window.localStorage.setItem(
            'tb-saved-pins',
            JSON.stringify(allPinnedCards)
          );

          return profileActions.profileSaved({profile});
        }
      )
    )
  );

  /**
   * Delete a profile from localStorage.
   */
  deleteProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileDeleteRequested),
      map(({name}) => {
        this.profileDataSource.deleteProfile(name);
        return profileActions.profileDeleted({name});
      })
    )
  );

  /**
   * Export a profile to JSON.
   */
  exportProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileExportRequested),
      map(({name}) => {
        const profile = this.profileDataSource.loadProfile(name);
        if (!profile) {
          return profileActions.profileLoadFailed({
            name,
            error: `Profile "${name}" not found`,
          });
        }
        const json = this.profileDataSource.exportProfile(profile);
        return profileActions.profileExported({name, json});
      })
    )
  );

  /**
   * Import a profile from JSON.
   */
  importProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileImportRequested),
      map(({json, newName}) => {
        const profile = this.profileDataSource.importProfile(json);
        if (!profile) {
          return profileActions.profileImportFailed({
            error: 'Invalid profile format',
          });
        }

        // Use provided name or generate a unique one
        const finalName =
          newName || this.profileDataSource.generateUniqueName(profile.name);
        const profileToSave: ProfileData = {
          ...profile,
          name: finalName,
          lastModifiedTimestamp: Date.now(),
        };

        this.profileDataSource.saveProfile(profileToSave);

        return profileActions.profileImported({profile: profileToSave});
      })
    )
  );

  /**
   * Clear all profiles from localStorage.
   */
  clearAllProfiles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profilesClearAllRequested),
      map(() => {
        this.profileDataSource.clearAllProfiles();
        return profileActions.profilesClearedAll();
      })
    )
  );

  /**
   * Fetch default profile from backend.
   */
  fetchDefaultProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.defaultProfileFetchRequested),
      switchMap(({experimentId}) =>
        this.profileDataSource.fetchDefaultProfile(experimentId).pipe(
          map((profile) =>
            profileActions.defaultProfileFetched({profile, experimentId})
          ),
          catchError(() =>
            of(
              profileActions.defaultProfileFetched({
                profile: null,
                experimentId,
              })
            )
          )
        )
      )
    )
  );

  /**
   * Rename a profile.
   */
  renameProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileRenameRequested),
      map(({oldName, newName}) => {
        const profile = this.profileDataSource.loadProfile(oldName);
        if (!profile) {
          return profileActions.profileLoadFailed({
            name: oldName,
            error: `Profile "${oldName}" not found`,
          });
        }

        // Delete old profile
        this.profileDataSource.deleteProfile(oldName);

        // Save with new name
        const renamedProfile: ProfileData = {
          ...profile,
          name: newName,
          lastModifiedTimestamp: Date.now(),
        };
        this.profileDataSource.saveProfile(renamedProfile);

        // Update active profile name if it was the renamed profile
        if (this.profileDataSource.getActiveProfileName() === oldName) {
          this.profileDataSource.setActiveProfileName(newName);
        }

        return profileActions.profileRenamed({
          oldName,
          newName,
          profile: renamedProfile,
        });
      })
    )
  );

  /**
   * Load active profile on startup.
   */
  loadActiveProfileOnStartup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(profileActions.profileListLoaded),
      map(() => {
        const activeProfileName = this.profileDataSource.getActiveProfileName();
        if (activeProfileName) {
          return profileActions.profileLoadRequested({
            name: activeProfileName,
          });
        }
        // Return a no-op action if no active profile
        return {type: '[Profile] No Active Profile'};
      }),
      filter((action) => action.type !== '[Profile] No Active Profile')
    )
  );

  /**
   * Download the exported profile JSON as a file.
   */
  downloadExportedProfile$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(profileActions.profileExported),
        tap(({name, json}) => {
          const blob = new Blob([json], {type: 'application/json'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${name.replace(/[^a-z0-9]/gi, '_')}_profile.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        })
      ),
    {dispatch: false}
  );
}
