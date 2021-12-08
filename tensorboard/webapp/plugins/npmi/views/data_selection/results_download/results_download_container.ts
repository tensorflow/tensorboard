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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../../../../app_state';
import {getCurrentRouteRunSelection} from '../../../../../selectors';
import {
  getAnnotationData,
  getFlaggedAnnotations,
  getMetricFilters,
  getRunToMetrics,
} from '../../../store';
import {metricIsNpmiAndNotDiff} from '../../../util/metric_type';

@Component({
  selector: 'npmi-results-download',
  template: `
    <results-download-component
      [numFlaggedAnnotations]="numFlaggedAnnotations$ | async"
      [runs]="activeRuns$ | async"
      [flaggedData]="flaggedData$ | async"
      [metrics]="metrics$ | async"
    ></results-download-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsDownloadContainer {
  readonly flaggedAnnotations$ = this.store.select(getFlaggedAnnotations);
  readonly numFlaggedAnnotations$ = this.flaggedAnnotations$.pipe(
    map((flaggedAnnotations) => flaggedAnnotations.length)
  );
  readonly activeRuns$ = this.store.select(getCurrentRouteRunSelection).pipe(
    map((runSelection) => {
      if (!runSelection) return [];
      return Array.from(runSelection.entries())
        .filter((run) => run[1])
        .map((run) => run[0]);
    })
  );
  readonly flaggedData$ = combineLatest([
    this.store.select(getAnnotationData),
    this.flaggedAnnotations$,
  ]).pipe(
    map(([annotationData, flaggedAnnotations]) => {
      const flagSet = new Set(flaggedAnnotations);
      const flaggedData = Object.entries(annotationData).filter((entry) =>
        flagSet.has(entry[0])
      );
      return flaggedData;
    })
  );
  readonly metrics$ = combineLatest([
    this.store.select(getRunToMetrics),
    this.activeRuns$,
    this.store.select(getMetricFilters),
  ]).pipe(
    map(([runToMetrics, activeRuns, metricFilters]) => {
      let metrics = Object.keys(metricFilters);
      for (const run of activeRuns) {
        if (runToMetrics[run]) {
          metrics = metrics.concat(
            runToMetrics[run].filter((key) => metricIsNpmiAndNotDiff(key))
          );
        }
      }
      metrics = [...new Set(metrics)];
      return metrics;
    })
  );

  constructor(private readonly store: Store<State>) {}
}
