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
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {select, Store} from '@ngrx/store';

import {map, combineLatest} from 'rxjs/operators';

import {State} from '../../../../../app_state';
import {
  getMetricFilters,
  getMetricsRegex,
  getRunToMetrics,
} from '../../../store';
import {getRunSelection} from '../../../../../core/store/core_selectors';
import * as npmiActions from '../../../actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-metric-search',
  template: `
    <metric-search-component
      [regexFilterValue]="metricsRegex$ | async"
      [completions]="completions$ | async"
      [isRegexFilterValid]="isMetricsFilterValid$ | async"
      (onRegexFilterValueChange)="onFilterChange($event)"
    ></metric-search-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricSearchContainer {
  readonly metricsRegex$ = this.store.select(getMetricsRegex);
  readonly activeRuns$ = this.store.pipe(select(getRunSelection)).pipe(
    map((runs) => {
      let activeRuns: string[] = [];
      if (runs) {
        for (let run of runs) {
          if (run[1]) {
            activeRuns.push(run[0]);
          }
        }
      }
      return activeRuns;
    })
  );
  readonly getRunToMetrics$ = this.store.pipe(select(getRunToMetrics));
  readonly completions$ = this.store
    .pipe(select(getRunToMetrics))
    .pipe(
      combineLatest(this.activeRuns$),
      map(([runToMetrics, activeRuns]) => {
        const metrics: string[] = [];
        for (const run of activeRuns) {
          if (runToMetrics[run]) {
            for (const metric of runToMetrics[run]) {
              if (!metrics.includes(metric)) {
                metrics.push(metric);
              }
            }
          }
        }
        return metrics;
      })
    )
    .pipe(
      combineLatest(this.store.pipe(select(getMetricFilters))),
      map(([metrics, metricFilters]) => {
        const metricsActive = Object.keys(metricFilters);
        return metrics.filter(
          (metric: string) => !metricsActive.includes(metric)
        );
      })
    )
    .pipe(
      combineLatest(this.metricsRegex$),
      map(([metrics, regexFilterValue]) => {
        try {
          const filterRegex = new RegExp(regexFilterValue, 'i');
          return metrics
            .filter((metric: string) => filterRegex.test(metric))
            .sort();
        } catch (err) {
          return metrics.sort();
        }
      })
    );
  readonly isMetricsFilterValid$ = this.metricsRegex$.pipe(
    map((filterString) => {
      try {
        // tslint:disable-next-line:no-unused-expression Check for validity of filter.
        new RegExp(filterString);
        return true;
      } catch (err) {
        return false;
      }
    })
  );
  onFilterChange(filter: string) {
    this.store.dispatch(npmiActions.npmiMetricsRegexChanged({regex: filter}));
  }

  constructor(private readonly store: Store<State>) {}
}
