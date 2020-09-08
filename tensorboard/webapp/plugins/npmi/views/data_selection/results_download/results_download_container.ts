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
import {Component, ChangeDetectionStrategy, OnDestroy} from '@angular/core';
import {Store} from '@ngrx/store';

import {combineLatest, Subject} from 'rxjs';
import {takeUntil, map} from 'rxjs/operators';

import {State} from '../../../../../app_state';
import {
  getFlaggedAnnotations,
  getAnnotationData,
  getRunToMetrics,
  getMetricFilters,
} from '../../../store';
import {getRunSelection} from '../../../../../core/store/core_selectors';
import {AnnotationDataListing} from '../../../store/npmi_types';
import {metricIsNpmiAndNotDiff} from '../../../util/metric_type';
import {convertToCSVResult} from '../../../util/csv_result';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-results-download',
  template: `
    <results-download-component
      [numFlaggedAnnotations]="numFlaggedAnnotations$ | async"
      (onDownloadRequested)="downloadRequested()"
    ></results-download-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsDownloadContainer implements OnDestroy {
  private ngUnsubscribe = new Subject();
  private flaggedAnnotations: string[] = [];
  readonly flaggedAnnotations$ = this.store.select(getFlaggedAnnotations);
  readonly numFlaggedAnnotations$ = this.flaggedAnnotations$.pipe(
    map((flaggedAnnotations) => flaggedAnnotations.length)
  );
  readonly activeRuns$ = this.store.select(getRunSelection).pipe(
    map((runSelection) => {
      if (!runSelection) return [];
      return Array.from(runSelection.entries())
        .filter((run) => run[1])
        .map((run) => run[0]);
    })
  );
  private annotationData: AnnotationDataListing = {};
  private runs: string[] = [];
  private metrics: string[] = [];

  constructor(private readonly store: Store<State>) {
    this.flaggedAnnotations$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => (this.flaggedAnnotations = x));
    this.store
      .select(getAnnotationData)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => (this.annotationData = x));
    this.activeRuns$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => (this.runs = x));
    combineLatest([
      this.store.select(getRunToMetrics),
      this.activeRuns$,
      this.store.select(getMetricFilters),
    ])
      .pipe(
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
      )
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => (this.metrics = x));
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  downloadRequested() {
    const flagSet = new Set(this.flaggedAnnotations);
    const flaggedData = Object.entries(this.annotationData).filter((entry) =>
      flagSet.has(entry[0])
    );
    for (const run of this.runs) {
      const csvData = convertToCSVResult(flaggedData, run, this.metrics);
      const element = document.createElement('a');
      element.setAttribute('href', csvData);
      element.setAttribute('download', `report_${run}.csv`);
      element.click();
    }
  }
}
