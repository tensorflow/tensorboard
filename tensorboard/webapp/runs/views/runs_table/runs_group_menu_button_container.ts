/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {RouteKind} from '../../../app_routing/types';
import {State} from '../../../app_state';
import {
  getRegisteredRouteKinds,
  getDashboardExperimentNames,
} from '../../../selectors';
import {runGroupByChanged} from '../../actions';
import {
  getColorGroupRegexString,
  getRunGroupBy,
} from '../../store/runs_selectors';
import {GroupBy} from '../../types';

/**
 * Renders run grouping menu controls.
 */
@Component({
  selector: 'runs-group-menu-button',
  template: `
    <runs-group-menu-button-component
      [regexString]="groupByRegexString$ | async"
      [selectedGroupBy]="selectedGroupBy$ | async"
      [showExperimentsGroupBy]="showExperimentsGroupBy$ | async"
      [experimentIds]="experimentIds"
      [expNameByExpId]="expNameByExpId$ | async"
      (onGroupByChange)="onGroupByChange($event)"
    ></runs-group-menu-button-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsGroupMenuButtonContainer {
  @Input() experimentIds!: string[];

  constructor(private readonly store: Store<State>) {}

  readonly showExperimentsGroupBy$: Observable<boolean> = this.store
    .select(getRegisteredRouteKinds)
    .pipe(
      map((registeredRouteKinds) => {
        return registeredRouteKinds.has(RouteKind.COMPARE_EXPERIMENT);
      })
    );

  readonly selectedGroupBy$: Observable<GroupBy> =
    this.store.select(getRunGroupBy);

  readonly groupByRegexString$: Observable<string> = this.store.select(
    getColorGroupRegexString
  );

  readonly expNameByExpId$: Observable<Record<string, string>> =
    this.store.select(getDashboardExperimentNames);

  onGroupByChange(groupBy: GroupBy) {
    this.expNameByExpId$.pipe(take(1)).subscribe((expNameByExpId) => {
      this.store.dispatch(
        runGroupByChanged({
          experimentIds: this.experimentIds,
          groupBy,
          expNameByExpId,
        })
      );
    });
  }
}
