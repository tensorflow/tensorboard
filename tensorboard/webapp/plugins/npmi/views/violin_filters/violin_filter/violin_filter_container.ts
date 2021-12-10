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
import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../../../../app_state';
import * as selectors from '../../../../../selectors';
import {getCurrentRouteRunSelection} from '../../../../../selectors';
import {RunColorScale} from '../../../../../types/ui';
import * as npmiActions from '../../../actions';
import {MetricFilter} from '../../../store/npmi_types';
import {removeHiddenAnnotations} from '../../../util/filter_annotations';
import {ViolinChartData, violinData} from '../../../util/violin_data';
import {
  getAnnotationData,
  getHiddenAnnotations,
  getShowHiddenAnnotations,
  getSidebarWidth,
} from './../../../store/npmi_selectors';

@Component({
  selector: 'npmi-violin-filter',
  template: `
    <violin-filter-component
      [metricName]="metricName"
      [filter]="filter"
      [chartData]="chartData$ | async"
      [width]="chartWidth$ | async"
      [colorScale]="runColorScale$ | async"
      (onRemove)="removeMetric()"
      (onUpdateFilter)="updateFilter($event)"
    ></violin-filter-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViolinFilterContainer implements OnInit {
  @Input() metricName!: string;
  @Input() filter!: MetricFilter;
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
  readonly chartWidth$ = this.store.pipe(select(getSidebarWidth)).pipe(
    map((width) => {
      return Math.max(150, width);
    })
  );
  chartData$?: Observable<{
    violinData: ViolinChartData;
    extremes: {min: number; max: number};
  }>;
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

  ngOnInit() {
    this.chartData$ = combineLatest([
      this.visibleAnnotations$,
      this.activeRuns$,
    ]).pipe(
      map(([visibleAnnotations, activeRuns]) => {
        return violinData(visibleAnnotations, activeRuns, this.metricName);
      })
    );
  }

  removeMetric() {
    this.store.dispatch(
      npmiActions.npmiRemoveMetricFilter({metric: this.metricName})
    );
  }

  updateFilter(filter: MetricFilter) {
    this.store.dispatch(
      npmiActions.npmiMetricFilterChanged({metric: this.metricName, ...filter})
    );
  }
}
