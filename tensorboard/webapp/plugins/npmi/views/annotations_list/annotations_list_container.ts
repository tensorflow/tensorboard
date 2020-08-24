import {Component, ChangeDetectionStrategy} from '@angular/core';

import {select, Store} from '@ngrx/store';
import {map, combineLatest} from 'rxjs/operators';

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
import {stripMetricString} from '../../util/metric_type';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-annotations-list',
  template: `
    <annotations-list-component
      [annotations]="annotations$ | async"
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
  readonly activeMetrics$ = this.store.pipe(select(getRunToMetrics)).pipe(
    combineLatest(this.activeRuns$, this.store.pipe(select(getMetricFilters))),
    map(([runToMetrics, activeRuns, metricFilters]) => {
      let metrics: string[] = [];
      for (const run of activeRuns) {
        if (runToMetrics[run]) {
          metrics = [...new Set([...metrics, ...runToMetrics[run]])];
        }
      }
      metrics = [
        ...new Set([
          ...Object.keys(metricFilters),
          ...metrics.filter((key) => key.startsWith('nPMI@')).map((key) => key),
        ]),
      ];
      return metrics;
    })
  );
  readonly annotations$ = this.store
    .pipe(select(getAnnotationData))
    .pipe(
      combineLatest(
        this.store.pipe(select(getHiddenAnnotations)),
        this.store.pipe(select(getShowHiddenAnnotations))
      ),
      map(([annotationData, hiddenAnnotations, showHiddenAnnotations]) => {
        return removeHiddenAnnotations(
          annotationData,
          hiddenAnnotations,
          showHiddenAnnotations
        );
      })
    )
    .pipe(
      combineLatest(
        this.activeRuns$,
        this.activeMetrics$,
        this.store.pipe(select(getMetricArithmetic)),
        this.store.pipe(select(getMetricFilters))
      ),
      map(
        ([
          visibleData,
          activeRuns,
          activeMetrics,
          metricArithmetic,
          metricFilters,
        ]) => {
          return filterAnnotations(
            visibleData,
            activeRuns,
            metricArithmetic,
            metricFilters,
            activeMetrics
          );
        }
      )
    );
  readonly numAnnotations$ = this.annotations$.pipe(
    map((annotations) => {
      return Object.keys(annotations).length;
    })
  );

  constructor(private readonly store: Store<State>) {}
}
