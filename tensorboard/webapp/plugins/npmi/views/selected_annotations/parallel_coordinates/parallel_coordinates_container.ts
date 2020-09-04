import {Component, ChangeDetectionStrategy} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {State} from '../../../../../app_state';

import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

import {
  getSelectedAnnotations,
  getRunToMetrics,
  getMetricFilters,
  getAnnotationData,
} from '../../../store';
import {getRunSelection} from '../../../../../core/store/core_selectors';
import {metricIsNpmiAndNotDiff} from '../../../util/metric_type';
import {coordinateData} from '../../../util/coordinate_data';
import {stripMetricString} from '../../../util/metric_type';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-parallel-coordinates',
  template: `
    <parallel-coordinates-component
      [activeMetrics]="activeMetrics$ | async"
      [coordinateData]="coordinateData$ | async"
    ></parallel-coordinates-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParallelCoordinatesContainer {
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
      return metrics.map((metric) => stripMetricString(metric));
    })
  );
  readonly coordinateData$ = combineLatest([
    this.store.select(getAnnotationData),
    this.store.select(getSelectedAnnotations),
    this.activeRuns$,
    this.activeMetrics$,
  ]).pipe(
    map(([annotationData, selectedAnnotations, runs, metrics]) => {
      return coordinateData(annotationData, selectedAnnotations, runs, metrics);
    })
  );

  constructor(private readonly store: Store<State>) {}
}
