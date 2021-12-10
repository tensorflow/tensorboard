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
import {select, Store} from '@ngrx/store';
import {combineLatest} from 'rxjs';
import {map, share} from 'rxjs/operators';
import {State} from '../../../../app_state';
import {getCurrentRouteRunSelection} from '../../../../selectors';
import * as npmiActions from '../../actions';
import {
  getAnnotationData,
  getAnnotationsExpanded,
  getAnnotationSort,
  getAnnotationsRegex,
  getEmbeddingDataSet,
  getHiddenAnnotations,
  getMetricArithmetic,
  getMetricFilters,
  getRunToMetrics,
  getSelectedAnnotations,
  getShowHiddenAnnotations,
} from '../../store';
import {
  filterAnnotations,
  removeHiddenAnnotations,
} from '../../util/filter_annotations';
import {metricIsNpmiAndNotDiff} from '../../util/metric_type';
import {sortAnnotations} from '../../util/sort_annotations';

@Component({
  selector: 'npmi-annotations-list',
  template: `
    <annotations-list-component
      [annotations]="filteredAnnotations$ | async"
      [embeddingData]="embeddingData$ | async"
      [annotationsExpanded]="annotationsExpanded$ | async"
      [numAnnotations]="numAnnotations$ | async"
      [activeMetrics]="activeMetrics$ | async"
      [numActiveRuns]="numActiveRuns$ | async"
      [sortedAnnotations]="sortedAnnotations$ | async"
      [selectedAnnotations]="selectedAnnotations$ | async"
      [maxCount]="maxCount$ | async"
      (onRowClick)="rowClicked($event)"
    ></annotations-list-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationsListContainer {
  readonly annotationsExpanded$ = this.store.pipe(
    select(getAnnotationsExpanded)
  );
  readonly activeRuns$ = this.store
    .pipe(select(getCurrentRouteRunSelection))
    .pipe(
      map((runSelection) => {
        if (!runSelection) return [];
        return Array.from(runSelection.entries())
          .filter((run) => run[1])
          .map((run) => run[0]);
      })
    );
  readonly embeddingData$ = this.store.pipe(select(getEmbeddingDataSet));
  readonly numActiveRuns$ = this.activeRuns$.pipe(map((runs) => runs.length));
  readonly activeMetrics$ = combineLatest([
    this.store.select(getRunToMetrics),
    this.activeRuns$,
    this.store.select(getMetricFilters),
  ]).pipe(
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
  readonly visibleAnnotations$ = combineLatest([
    this.store.select(getAnnotationData),
    this.store.select(getHiddenAnnotations),
    this.store.select(getShowHiddenAnnotations),
  ]).pipe(
    map(([annotationData, hiddenAnnotations, showHiddenAnnotations]) => {
      return removeHiddenAnnotations(
        annotationData,
        hiddenAnnotations,
        showHiddenAnnotations
      );
    })
  );
  readonly filteredAnnotations$ = combineLatest([
    this.visibleAnnotations$,
    this.store.select(getMetricArithmetic),
    this.store.select(getMetricFilters),
    this.activeRuns$,
    this.activeMetrics$,
    this.store.select(getAnnotationsRegex),
  ])
    .pipe(
      map(
        ([
          visibleAnnotations,
          metricArithmetic,
          metricFilters,
          activeRuns,
          activeMetrics,
          annotationsRegex,
        ]) => {
          return filterAnnotations(
            visibleAnnotations,
            activeRuns,
            metricArithmetic,
            metricFilters,
            activeMetrics,
            annotationsRegex
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
  readonly sortedAnnotations$ = combineLatest([
    this.filteredAnnotations$,
    this.store.pipe(select(getAnnotationSort)),
    this.embeddingData$,
  ]).pipe(
    map(([annotations, sort, embeddingData]) => {
      return sortAnnotations(annotations, sort, embeddingData);
    })
  );
  readonly selectedAnnotations$ = this.store.pipe(
    select(getSelectedAnnotations)
  );
  readonly maxCount$ = this.filteredAnnotations$.pipe(
    map((annotations) => {
      let max = 0;
      Object.values(annotations).forEach((annotation) => {
        annotation.forEach((values) => {
          if (values.countValue) {
            max = Math.max(max, values.countValue);
          }
        });
      });
      return max;
    })
  );

  constructor(private readonly store: Store<State>) {}

  rowClicked(annotations: string[]) {
    this.store.dispatch(
      npmiActions.npmiToggleSelectedAnnotations({annotations})
    );
  }
}
