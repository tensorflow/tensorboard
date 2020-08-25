import {Component, ChangeDetectionStrategy} from '@angular/core';

import {select, Store} from '@ngrx/store';
import {map} from 'rxjs/operators';
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
import * as npmiActions from '../../actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-annotations-list',
  template: `
    <annotations-list-component
      [annotations]="filteredAnnotations$ | async"
      [annotationsExpanded]="annotationsExpanded$ | async"
      [numAnnotations]="numAnnotations$ | async"
      [activeMetrics]="activeMetrics$ | async"
      (onToggleExpanded)="toggleExpanded()"
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
  readonly activeMetrics$ = combineLatest(
    this.store.select(getRunToMetrics),
    this.activeRuns$,
    this.store.select(getMetricFilters)
  ).pipe(
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
  ).pipe(
    map(
      ([
        visibleAnnotations,
        metricArithmetic,
        metricFilters,
        activeRuns,
        activeMetrics,
      ]) => {
        return filterAnnotations(
          visibleAnnotations,
          activeRuns,
          metricArithmetic,
          metricFilters,
          activeMetrics
        );
      }
    )
  );
  readonly numAnnotations$ = this.filteredAnnotations$.pipe(
    map((annotations) => {
      return Object.keys(annotations).length;
    })
  );

  constructor(private readonly store: Store<State>) {}

  toggleExpanded() {
    this.store.dispatch(npmiActions.npmiToggleAnnotationsExpanded());
  }
}
