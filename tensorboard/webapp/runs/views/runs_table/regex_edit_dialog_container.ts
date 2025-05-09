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
import {Component, inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {combineLatest, defer, merge, Observable, Subject} from 'rxjs';
import {
  combineLatestWith,
  debounceTime,
  filter,
  map,
  shareReplay,
  startWith,
  take,
} from 'rxjs/operators';
import {State} from '../../../app_state';
import {
  getDarkModeEnabled,
  getEnableColorByExperiment,
} from '../../../selectors';
import {selectors as settingsSelectors} from '../../../settings/';
import {runGroupByChanged} from '../../actions';
import {
  getColorGroupRegexString,
  getRunIdsForExperiment,
  getRunGroupBy,
  getRuns,
} from '../../store/runs_selectors';
import {getDashboardExperimentNames} from '../../../selectors';
import {groupRuns} from '../../store/utils';
import {GroupByKey, Run} from '../../types';
import {ColorGroup} from './regex_edit_dialog_component';

const INPUT_CHANGE_DEBOUNCE_INTERVAL_MS = 500;

@Component({
  standalone: false,
  selector: 'regex-edit-dialog',
  template: `<regex-edit-dialog-component
    [regexString]="groupByRegexString$ | async"
    [colorRunPairList]="colorRunPairList$ | async"
    [selectedGroupBy]="groupByRegexType$ | async"
    [enableColorByExperiment]="enableColorByExperiment$ | async"
    (onSave)="onSave()"
    (regexInputOnChange)="onRegexInputOnChange($event)"
    (regexTypeOnChange)="onRegexTypeOnChange($event)"
  ></regex-edit-dialog-component>`,
  styles: [
    `
      :host,
      regex-edit-dialog-component {
        display: block;
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class RegexEditDialogContainer {
  private readonly store = inject<Store<State>>(Store);
  dialogRef = inject<MatDialogRef<RegexEditDialogContainer>>(MatDialogRef);

  private readonly experimentIds: string[];
  private readonly runIdToEid$: Observable<Record<string, string>>;
  private readonly allRuns$: Observable<Run[]>;
  private readonly expNameByExpId$: Observable<Record<string, string>>;
  readonly enableColorByExperiment$: Observable<boolean>;

  // Tentative regex string and type are used because we don't want to change the state
  // every time we type in or select the dropdown option.
  private readonly tentativeRegexString$: Subject<string> =
    new Subject<string>();
  private readonly tentativeRegexType$: Subject<GroupByKey> =
    new Subject<GroupByKey>();

  readonly groupByRegexString$: Observable<string> = defer(() => {
    return merge(
      this.store.select(getColorGroupRegexString).pipe(take(1)),
      this.tentativeRegexString$
    );
  }).pipe(startWith(''), shareReplay(1));

  readonly groupByRegexType$: Observable<GroupByKey>;

  readonly colorRunPairList$: Observable<ColorGroup[]> = defer(() => {
    return this.groupByRegexString$.pipe(
      debounceTime(INPUT_CHANGE_DEBOUNCE_INTERVAL_MS),
      filter((regexString) => {
        try {
          const regex = new RegExp(regexString);
          return Boolean(regex);
        } catch (e) {
          return false;
        }
      }),
      combineLatestWith(
        this.groupByRegexType$,
        this.allRuns$,
        this.runIdToEid$,
        this.expNameByExpId$,
        this.store.select(settingsSelectors.getColorPalette),
        this.store.select(getDarkModeEnabled)
      ),
      map(
        ([
          regexString,
          regexType,
          allRuns,
          runIdToEid,
          expNameByExpId,
          colorPalette,
          darkModeEnabled,
        ]) => {
          const groupBy = {
            key: regexType,
            regexString,
          };
          const groups = groupRuns(
            groupBy,
            allRuns,
            runIdToEid,
            expNameByExpId
          );
          const groupKeyToColorString = new Map<string, string>();
          const colorRunPairList: ColorGroup[] = [];

          for (const [groupId, runs] of Object.entries(groups.matches)) {
            let colorHex: string | undefined =
              groupKeyToColorString.get(groupId);
            if (!colorHex) {
              const color =
                colorPalette.colors[
                  groupKeyToColorString.size % colorPalette.colors.length
                ];
              colorHex = darkModeEnabled ? color.darkHex : color.lightHex;
              groupKeyToColorString.set(groupId, colorHex);
            }
            colorRunPairList.push({groupId, color: colorHex, runs});
          }
          return colorRunPairList;
        }
      )
    );
  }).pipe(startWith([]));

  constructor() {
    const data = inject<{
      experimentIds: string[];
    }>(MAT_DIALOG_DATA);

    this.expNameByExpId$ = this.store.select(getDashboardExperimentNames);
    this.enableColorByExperiment$ = this.store.select(
      getEnableColorByExperiment
    );
    this.groupByRegexType$ = merge(
      this.store.select(getRunGroupBy).pipe(
        take(1),
        map((group) => group.key)
      ),
      this.tentativeRegexType$
    ).pipe(
      startWith(GroupByKey.REGEX),
      filter(
        (key) => key === GroupByKey.REGEX || key === GroupByKey.REGEX_BY_EXP
      ),
      shareReplay(1)
    );
    this.experimentIds = data.experimentIds;

    this.runIdToEid$ = combineLatest(
      this.experimentIds.map((experimentId) => {
        return this.store
          .select(getRunIdsForExperiment, {experimentId})
          .pipe(map((runIds) => ({experimentId, runIds})));
      })
    ).pipe(
      map((runIdsAndExpIdList) => {
        const runIdToEid: Record<string, string> = {};
        for (const {runIds, experimentId} of runIdsAndExpIdList) {
          for (const runId of runIds) {
            runIdToEid[runId] = experimentId;
          }
        }
        return runIdToEid;
      })
    );

    this.allRuns$ = combineLatest(
      this.experimentIds.map((experimentId) => {
        return this.store.select(getRuns, {experimentId});
      })
    ).pipe(
      map((runsList) => {
        return runsList.flat();
      })
    );
  }

  onRegexInputOnChange(regexString: string) {
    this.tentativeRegexString$.next(regexString);
  }

  onRegexTypeOnChange(regexType: GroupByKey) {
    this.tentativeRegexType$.next(regexType);
  }

  onSave(): void {
    combineLatest([
      this.groupByRegexString$,
      this.groupByRegexType$,
      this.expNameByExpId$,
    ]).subscribe(([regexString, key, expNameByExpId]) => {
      if (regexString) {
        this.store.dispatch(
          runGroupByChanged({
            experimentIds: this.experimentIds,
            groupBy: {key, regexString},
            expNameByExpId,
          })
        );
      }
    });
  }
}

export const TEST_ONLY = {
  INPUT_CHANGE_DEBOUNCE_INTERVAL_MS,
};
