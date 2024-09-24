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
import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../../app_state';
import {ExperimentAlias} from '../../../experiments/types';
import {
  getExperimentIdForRunId,
  getExperimentIdToExperimentAliasMap,
  getRun,
} from '../../../selectors';
import {getDisplayNameForRun} from './utils';

@Component({
  standalone: false,
  selector: 'card-run-name',
  template: `
    <card-run-name-component
      [name]="name$ | async"
      [attr.title]="name$ | async"
      [experimentAlias]="experimentAlias$ | async"
    ></card-run-name-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunNameContainer implements OnInit {
  @Input() runId!: string;

  name$?: Observable<string>;
  experimentAlias$?: Observable<ExperimentAlias | null>;

  constructor(private readonly store: Store<State>) {}

  /**
   * Build observables once runId is defined (after onInit).
   */
  ngOnInit() {
    this.name$ = combineLatest([
      this.store.select(getRun, {runId: this.runId}),
    ]).pipe(
      map(([run]) => {
        return getDisplayNameForRun(this.runId, run, /*experimentAlias=*/ null);
      })
    );
    this.experimentAlias$ = combineLatest([
      this.store.select(getExperimentIdForRunId, {runId: this.runId}),
      this.store.select(getExperimentIdToExperimentAliasMap),
    ]).pipe(
      map(([experimentId, idToAlias]) => {
        return experimentId ? idToAlias[experimentId] : null;
      })
    );
  }
}
