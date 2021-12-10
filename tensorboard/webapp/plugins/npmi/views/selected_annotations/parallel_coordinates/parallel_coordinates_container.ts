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
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../../../../app_state';
import * as selectors from '../../../../../selectors';
import {getCurrentRouteRunSelection} from '../../../../../selectors';
import {RunColorScale} from '../../../../../types/ui';
import {
  getAnnotationData,
  getMetricFilters,
  getRunToMetrics,
  getSelectedAnnotations,
  getSidebarWidth,
} from '../../../store';
import {convertToCoordinateData} from '../../../util/coordinate_data';
import {
  metricIsNpmiAndNotDiff,
  stripMetricString,
} from '../../../util/metric_type';

@Component({
  selector: 'npmi-parallel-coordinates',
  template: `
    <parallel-coordinates-component
      [activeMetrics]="activeMetrics$ | async"
      [coordinateData]="coordinateData$ | async"
      [sidebarWidth]="sidebarWidth$ | async"
      [colorScale]="runColorScale$ | async"
    ></parallel-coordinates-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParallelCoordinatesContainer {
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
      return convertToCoordinateData(
        annotationData,
        selectedAnnotations,
        runs,
        metrics
      );
    })
  );
  readonly sidebarWidth$ = this.store.select(getSidebarWidth);
  readonly runColorScale$: Observable<RunColorScale> = this.store
    .select(selectors.getRunColorMap)
    .pipe(
      map((colorMap) => {
        return (runId: string) => {
          if (!colorMap.hasOwnProperty(runId)) {
            throw new Error(`[Color scale] unknown runId: ${runId}.`);
          }
          return colorMap[runId];
        };
      })
    );

  constructor(private readonly store: Store<State>) {}
}
