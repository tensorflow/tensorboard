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
import {toSignal} from '@angular/core/rxjs-interop';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {filter, map, shareReplay, startWith, take} from 'rxjs/operators';
import {RouteKind} from '../../../app_routing/types';
import {State} from '../../../app_state';
import {
  getDashboardExperimentNames,
  getEnableColorByExperiment,
  getRegisteredRouteKinds,
} from '../../../selectors';
import {runGroupByChanged} from '../../actions';
import {
  getColorGroupRegexString,
  getRunGroupBy,
} from '../../store/runs_selectors';
import {GroupBy, GroupByKey} from '../../types';

/**
 * Renders run grouping menu controls.
 */
@Component({
  standalone: false,
  selector: 'runs-group-menu-button',
  template: `
    <runs-group-menu-button-component
      [regexString]="groupByRegexString()"
      [selectedGroupBy]="selectedGroupBy()"
      [lastRegexGroupByKey]="lastRegexGroupByKey()"
      [showExperimentsGroupBy]="showExperimentsGroupBy()"
      [experimentIds]="experimentIds"
      (onGroupByChange)="onGroupByChange($event)"
    ></runs-group-menu-button-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsGroupMenuButtonContainer {
  @Input() experimentIds!: string[];

  constructor(private readonly store: Store<State>) {
    this.showExperimentsGroupBy = toSignal(
      this.store.select(getRegisteredRouteKinds).pipe(
        map((registeredRouteKinds) => {
          return registeredRouteKinds.has(RouteKind.COMPARE_EXPERIMENT);
        })
      ),
      {requireSync: true}
    );
    this.selectedGroupBy = this.store.selectSignal(getRunGroupBy);
    this.lastRegexGroupByKey = toSignal(
      this.store.select(getRunGroupBy).pipe(
        map((group) => group.key),
        filter(
          (key) => key === GroupByKey.REGEX || key === GroupByKey.REGEX_BY_EXP
        ),
        startWith(GroupByKey.REGEX)
      ),
      {requireSync: true}
    );
    this.groupByRegexString = this.store.selectSignal(getColorGroupRegexString);
    this.expNameByExpId$ = this.store.select(getDashboardExperimentNames);
  }

  readonly showExperimentsGroupBy;

  readonly selectedGroupBy;

  readonly lastRegexGroupByKey;

  readonly groupByRegexString;

  readonly expNameByExpId$: Observable<Record<string, string>>;

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
