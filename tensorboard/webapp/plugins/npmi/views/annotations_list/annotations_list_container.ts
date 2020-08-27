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
import {map, share} from 'rxjs/operators';
import {combineLatest} from 'rxjs';

import {State} from '../../../../app_state';
import {
  getAnnotationData,
  getMetricArithmetic,
  getMetricFilters,
  getRunToMetrics,
  getShowHiddenAnnotations,
  getHiddenAnnotations,
  getAnnotationsExpanded,
} from '../../store';
import {getRunSelection} from '../../../../core/store/core_selectors';
import {
  filterAnnotations,
  removeHiddenAnnotations,
} from '../../util/filter_annotations';
import {metricIsNpmiAndNotDiff} from '../../util/metric_type';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-annotations-list',
  template: `
    <annotations-list-component
      [annotations]="filteredAnnotations$ | async"
      [annotationsExpanded]="annotationsExpanded$ | async"
      [numAnnotations]="numAnnotations$ | async"
      [activeMetrics]="activeMetrics$ | async"
    ></annotations-list-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListContainer {
  readonly annotationsExpanded$ = this.store.pipe(
    select(getAnnotationsExpanded)
  );
  readonly activeRuns$ = this.store.pipe(select(getRunSelection)).pipe(
    map((runSelection) => {
      if (!runSelection) return [];
      return Array.from(runSelection.entries())
        .filter((run) => run[1])
        .map((run) => run[0]);
    })
  );
  readonly activeMetrics$ = combineLatest(
    this.store.select(getRunToMetrics),
    this.activeRuns$,
    this.store.select(getMetricFilters)
  ).pipe(
    map(([runToMetrics, activeRuns, metricFilters]) => {
      let metrics: string[] = [];
      for (const run of activeRuns) {
        if (runToMetrics[run]) {
          metrics = metrics.concat(
            runToMetrics[run].filter((key) => metricIsNpmiAndNotDiff(key))
          );
        }
      }
      metrics = [...new Set([...Object.keys(metricFilters), ...metrics])];
      return metrics;
    })
  );
  readonly visibleAnnotations$ = combineLatest(
    this.store.select(getAnnotationData),
    this.store.select(getHiddenAnnotations),
    this.store.select(getShowHiddenAnnotations)
  ).pipe(
    map(([annotationData, hiddenAnnotations, showHiddenAnnotations]) => {
      return removeHiddenAnnotations(
        annotationData,
        hiddenAnnotations,
        showHiddenAnnotations
      );
    })
  );
  readonly filteredAnnotations$ = combineLatest(
    this.visibleAnnotations$,
    this.store.select(getMetricArithmetic),
    this.store.select(getMetricFilters),
    this.activeRuns$,
    this.activeMetrics$
  )
    .pipe(
      map(
        ([
          visibleAnnotations,
          metricArithmetic,
          metricFilters,
          activeRuns,
          activeMetrics,
        ]) => {
          console.log('test');
          return filterAnnotations(
            visibleAnnotations,
            activeRuns,
            metricArithmetic,
            metricFilters,
            activeMetrics
          );
        }
      )
    )
    .pipe(share());
  readonly numAnnotations$ = this.filteredAnnotations$.pipe(
    map((annotations) => {
      return Object.keys(annotations).length;
    })
  );

  constructor(private readonly store: Store<State>) {}
}
