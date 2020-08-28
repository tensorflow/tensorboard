import {Component, ChangeDetectionStrategy, Input, OnInit} from '@angular/core';
import {Store, select} from '@ngrx/store';

import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

import {State} from '../../../../../app_state';
import {getRunSelection} from '../../../../../core/store/core_selectors';
import {
  getAnnotationData,
  getHiddenAnnotations,
  getShowHiddenAnnotations,
} from './../../../store/npmi_selectors';
import {
  MetricFilter,
  AnnotationDataListing,
  ValueData,
} from '../../../store/npmi_types';
import * as npmiActions from '../../../actions';
import {removeHiddenAnnotations} from '../../../util/filter_annotations';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
import {stripMetricString} from '../../../util/metric_type';

@Component({
  selector: 'npmi-violin-filter',
  template: `
    <violin-filter-component
      [metricName]="metricName"
      [filter]="filter"
      [activeRuns]="activeRuns$ | async"
      [violinData]="filteredData$ | async"
      (onRemove)="removeMetric($event)"
    ></violin-filter-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViolinFilterContainer implements OnInit {
  @Input() metricName!: string;
  @Input() filter!: MetricFilter;
  readonly activeRuns$ = this.store.pipe(select(getRunSelection)).pipe(
    map((runSelection) => {
      if (!runSelection) return [];
      return Array.from(runSelection.entries())
        .filter((run) => run[1])
        .map((run) => run[0]);
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
  filteredData$?: Observable<{data: ValueData[]; dataNaN: ValueData[]}>;

  constructor(private readonly store: Store<State>) {}

  ngOnInit() {
    this.filteredData$ = combineLatest(
      this.visibleAnnotations$,
      this.activeRuns$
    ).pipe(
      map(([visibleAnnotations, activeRuns]) => {
        let data: ValueData[] = [];
        let dataNaN: ValueData[] = [];
        const allRuns = new Set(activeRuns);
        const strippedMetric = stripMetricString(this.metricName);
        Object.entries(visibleAnnotations).forEach((entry) => {
          let valueDataElements = entry[1];
          valueDataElements = valueDataElements.filter((valueDataElement) => {
            return (
              allRuns.has(valueDataElement.run) &&
              valueDataElement.metric === strippedMetric
            );
          });
          data = data.concat(
            valueDataElements.filter(
              (dataPoint) => dataPoint.nPMIValue !== null
            )
          );
          dataNaN = dataNaN.concat(
            valueDataElements.filter(
              (dataPoint) => dataPoint.nPMIValue === null
            )
          );
        });
        return {data: data, dataNaN: dataNaN};
      })
    );
  }

  removeMetric(metric: string) {
    this.store.dispatch(npmiActions.npmiRemoveMetricFilter({metric: metric}));
  }
}
