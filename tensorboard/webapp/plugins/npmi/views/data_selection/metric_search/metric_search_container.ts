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

import {map} from 'rxjs/operators';
import {combineLatest} from 'rxjs';

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
      (onAddFilter)="onAddFilter($event)"
    ></metric-search-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricSearchContainer {
  readonly metricsRegex$ = this.store.select(getMetricsRegex);
  readonly activeRuns$ = this.store.pipe(select(getRunSelection)).pipe(
    map((runs) => {
      const activeRuns: string[] = [];
      if (runs) {
        for (const run of runs) {
          if (run[1]) {
            activeRuns.push(run[0]);
          }
        }
      }
      return activeRuns;
    })
  );
  readonly allMetrics$ = combineLatest(
    this.activeRuns$,
    this.store.select(getRunToMetrics)
  ).pipe(
    map(([activeRuns, runToMetrics]) => {
      let metrics: string[] = [];
      for (const run of activeRuns) {
        if (runToMetrics[run]) {
          metrics = [...new Set([...metrics, ...runToMetrics[run]])];
        }
      }
      return metrics;
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
  readonly metricFilterKeys$ = this.store.pipe(select(getMetricFilters)).pipe(
    map((metricFilters) => {
      return Object.keys(metricFilters);
    })
  );
  readonly completions$ = combineLatest(
    this.allMetrics$,
    this.metricsRegex$,
    this.metricFilterKeys$
  ).pipe(
    map(([metrics, metricsRegex, metricsActive]) => {
      const filteredMetrics = metrics.filter(
        (metric: string) => !metricsActive.includes(metric)
      );
      try {
        const filterRegex = new RegExp(metricsRegex, 'i');
        return filteredMetrics
          .filter((metric: string) => filterRegex.test(metric))
          .sort();
      } catch (err) {
        return [];
      }
    })
  );

  onFilterChange(filter: string) {
    this.store.dispatch(npmiActions.npmiMetricsRegexChanged({regex: filter}));
  }

  onAddFilter(metric: string) {
    this.store.dispatch(npmiActions.npmiAddMetricFilter({metric}));
    this.store.dispatch(npmiActions.npmiMetricsRegexChanged({regex: ''}));
  }

  constructor(private readonly store: Store<State>) {}
}
