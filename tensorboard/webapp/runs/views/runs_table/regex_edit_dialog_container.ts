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
import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';

import {State} from '../../../app_state';
import {runGroupByChanged} from '../../actions';
import {
  getColorGroupRegexString,
  getRunIds,
  getRuns,
} from '../../store/runs_selectors';
import {GroupByKey} from '../../types';
import {Run} from '../../store/runs_types';
import {groupRuns} from '../../store/utils';
import {CHART_COLOR_PALLETE} from '../../../util/colors';

@Component({
  selector: 'regex-edit-dialog',
  template: `<regex-edit-dialog-component
    [regexString]="groupByRegexString$ | async"
    [colorRunsMap]="colorRunsMap"
    (onSave)="onSave($event)"
    (regexInputOnChange)="generateColorRunMap($event)"
  ></regex-edit-dialog-component>`,
})
export class RegexEditDialogContainer {
  readonly groupByRegexString$: Observable<string> = this.store.select(
    getColorGroupRegexString
  );
  experimentIds: string[];
  allRuns: Run[] = [];
  runIdToEid: Record<string, string> = {};
  colorRunsMap: [string, Run[]][] = [];

  constructor(
    private readonly store: Store<State>,
    public dialogRef: MatDialogRef<RegexEditDialogContainer>,
    @Inject(MAT_DIALOG_DATA) data: {experimentIds: string[]}
  ) {
    this.experimentIds = data.experimentIds;
  }

  ngOnInit() {
    this.experimentIds.forEach((experimentId) => {
      this.store
        .select(getRunIds, {experimentId})
        .pipe(
          tap((runIds) => {
            runIds.forEach((runId) => {
              this.runIdToEid[runId] = experimentId;
            });
          })
        )
        .subscribe(() => {});

      this.store
        .select(getRuns, {experimentId})
        .pipe(
          tap((runs) => {
            this.allRuns = this.allRuns.concat(runs);
          })
        )
        .subscribe(() => {});
    });
  }

  generateColorRunMap(regexString: string) {
    const groupBy = {
      key: GroupByKey.REGEX,
      regexString,
    };
    const groups = groupRuns(groupBy, this.allRuns, this.runIdToEid);
    const groupKeyToColorString = new Map<string, string>();
    this.colorRunsMap = [];
    Object.entries(groups.matches).forEach(([groupId, runs]) => {
      const color =
        groupKeyToColorString.get(groupId) ??
        CHART_COLOR_PALLETE[
          groupKeyToColorString.size % CHART_COLOR_PALLETE.length
        ];
      groupKeyToColorString.set(groupId, color);
      this.colorRunsMap.push([color, runs as Run[]]);
    });
  }

  onSave(regexString: string): void {
    this.store.dispatch(
      runGroupByChanged({
        experimentIds: this.experimentIds,
        groupBy: {key: GroupByKey.REGEX, regexString: regexString},
      })
    );
  }
}
