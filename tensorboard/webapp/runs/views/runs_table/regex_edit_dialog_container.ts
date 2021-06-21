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
import {State} from '../../../app_state';
import {runGroupByChanged} from '../../actions';
import {getRegexString} from '../../store/runs_selectors';
import {GroupByKey} from '../../types';

export interface RegexDialogData {
  regexString: string;
}

@Component({
  selector: 'regex-edit-dialog',
  template: `<regex-edit-dialog-component
    [regexString]="groupByRegexString$ | async"
    (onSave)="onSave($event)"
  ></regex-edit-dialog-component>`,
})
export class RegexEditDialogContainer {
  readonly groupByRegexString$: Observable<string> = this.store.select(
    getRegexString
  );
  experimentIds: string[] = [];

  constructor(
    private readonly store: Store<State>,
    public dialogRef: MatDialogRef<RegexEditDialogContainer>,
    @Inject(MAT_DIALOG_DATA) data: {experimentIds: string[]}
  ) {
    this.experimentIds = data.experimentIds;
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
