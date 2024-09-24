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
import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {map} from 'rxjs/operators';
import {State} from '../../../app_state';
import {getExperimentIdsFromRoute} from '../../../selectors';
import {RunsTableColumn} from '../runs_table/types';

@Component({
  standalone: false,
  selector: 'runs-selector',
  template: `
    <runs-selector-component
      [experimentIds]="experimentIds$ | async"
      [columns]="columns$ | async"
    ></runs-selector-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsSelectorContainer {
  readonly experimentIds$;
  readonly columns$;

  constructor(private readonly store: Store<State>) {
    this.experimentIds$ = this.store
      .select(getExperimentIdsFromRoute)
      .pipe(map((experimentIdsOrNull) => experimentIdsOrNull ?? []));
    this.columns$ = this.store.select(getExperimentIdsFromRoute).pipe(
      map((ids) => {
        return [
          RunsTableColumn.CHECKBOX,
          RunsTableColumn.RUN_NAME,
          ids && ids.length > 1 ? RunsTableColumn.EXPERIMENT_NAME : null,
          RunsTableColumn.RUN_COLOR,
        ].filter((col) => col !== null) as RunsTableColumn[];
      })
    );
  }
}
