/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {TimeSelection} from '../../../widgets/card_fob/card_fob_types';
import {findClosestIndex} from '../../../widgets/line_chart_v2/sub_view/line_chart_interactive_utils';
import {
  ColumnHeader,
  ColumnHeaderType,
  ScalarCardDataSeries,
  ScalarCardPoint,
  ScalarCardSeriesMetadataMap,
  SelectedStepRunData,
  SortingInfo,
  SortingOrder,
} from './scalar_card_types';

@Component({
  selector: 'scalar-card-data-table',
  template: `
    <tb-data-table
      [headers]="columnHeaders"
      [data]="getTimeSelectionTableData()"
      [sortingInfo]="sortingInfo"
      [columnCustomizationEnabled]="columnCustomizationEnabled"
      [smoothingEnabled]="smoothingEnabled"
      (sortDataBy)="sortDataBy.emit($event)"
      (orderColumns)="orderColumns.emit($event)"
    ></tb-data-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardDataTable {
  @Input() chartMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() dataSeries!: ScalarCardDataSeries[];
  @Input() stepOrLinkedTimeSelection!: TimeSelection;
  @Input() columnHeaders!: ColumnHeader[];
  @Input() sortingInfo!: SortingInfo;
  @Input() columnCustomizationEnabled!: boolean;
  @Input() smoothingEnabled!: boolean;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() orderColumns = new EventEmitter<ColumnHeader[]>();

  getMinValueInRange(
    points: ScalarCardPoint[],
    startPointIndex: number,
    endPointIndex: number,
    smoothed: boolean = false
  ): ScalarCardPoint {
    let minValue = this.maybeSmoothedValue(points[startPointIndex], smoothed);
    let minValuePoint = points[startPointIndex];
    for (let i = startPointIndex; i <= endPointIndex; i++) {
      if (minValue > this.maybeSmoothedValue(points[i], smoothed)) {
        minValue = this.maybeSmoothedValue(points[i], smoothed);
        minValuePoint = points[i];
      }
    }
    return minValuePoint;
  }

  getMaxValueInRange(
    points: ScalarCardPoint[],
    startPointIndex: number,
    endPointIndex: number,
    smoothed: boolean = false
  ): ScalarCardPoint {
    let maxValue = this.maybeSmoothedValue(points[startPointIndex], smoothed);
    let maxPoint = points[startPointIndex];
    for (let i = startPointIndex; i <= endPointIndex; i++) {
      if (maxValue < this.maybeSmoothedValue(points[i], smoothed)) {
        maxValue = this.maybeSmoothedValue(points[i], smoothed);
        maxPoint = points[i];
      }
    }
    return maxPoint;
  }

  getMean(points: ScalarCardPoint[]) {
    let sum = 0;
    points.forEach((point) => {
      sum += point.value;
    });
    return sum / points.length;
  }

  maybeSmoothedValue(point: ScalarCardPoint, smoothed: boolean) {
    return smoothed ? point.y : point.value;
  }

  getTimeSelectionTableData(): SelectedStepRunData[] {
    if (this.stepOrLinkedTimeSelection === null) {
      return [];
    }
    const startStep = this.stepOrLinkedTimeSelection.start.step;
    const endStep = this.stepOrLinkedTimeSelection.end?.step;
    const dataTableData: SelectedStepRunData[] = this.dataSeries
      .filter((datum) => {
        const metadata = this.chartMetadataMap[datum.id];
        return metadata && metadata.visible && !Boolean(metadata.aux);
      })
      .map((datum) => {
        const metadata = this.chartMetadataMap[datum.id];
        const closestStartPointIndex = findClosestIndex(
          datum.points,
          startStep
        );
        const closestStartPoint = datum.points[closestStartPointIndex];
        let closestEndPoint: ScalarCardPoint | null = null;
        let closestEndPointIndex: number | null = null;
        if (endStep !== null && endStep !== undefined) {
          closestEndPointIndex = findClosestIndex(datum.points, endStep);
          closestEndPoint = datum.points[closestEndPointIndex];
        }
        const selectedStepData: SelectedStepRunData = {
          id: datum.id,
        };
        selectedStepData.COLOR = metadata.color;
        for (const header of this.columnHeaders) {
          switch (header.type) {
            case ColumnHeaderType.RUN:
              let alias = '';
              if (metadata.alias) {
                alias = `${metadata.alias.aliasNumber} ${metadata.alias.aliasText}/`;
              }
              selectedStepData.RUN = `${alias}${metadata.displayName}`;
              continue;
            case ColumnHeaderType.STEP:
              selectedStepData.STEP = closestStartPoint.step;
              continue;
            case ColumnHeaderType.VALUE:
              selectedStepData.VALUE = closestStartPoint.value;
              continue;
            case ColumnHeaderType.RELATIVE_TIME:
              selectedStepData.RELATIVE_TIME =
                closestStartPoint.relativeTimeInMs;
              continue;
            case ColumnHeaderType.SMOOTHED:
              selectedStepData.SMOOTHED = closestStartPoint.y;
              continue;
            case ColumnHeaderType.VALUE_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.VALUE_CHANGE =
                closestEndPoint.y - closestStartPoint.y;
              continue;
            case ColumnHeaderType.START_STEP:
              selectedStepData.START_STEP = closestStartPoint.step;
              continue;
            case ColumnHeaderType.END_STEP:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.END_STEP = closestEndPoint.step;
              continue;
            case ColumnHeaderType.START_VALUE:
              selectedStepData.START_VALUE = closestStartPoint.y;
              continue;
            case ColumnHeaderType.END_VALUE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.END_VALUE = closestEndPoint.y;
              continue;
            case ColumnHeaderType.MIN_VALUE:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData.MIN_VALUE = this.getMinValueInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex,
                true
              ).y;
              continue;
            case ColumnHeaderType.MAX_VALUE:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData.MAX_VALUE = this.getMaxValueInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex,
                true
              ).y;
              continue;
            case ColumnHeaderType.PERCENTAGE_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.PERCENTAGE_CHANGE =
                (closestEndPoint.y - closestStartPoint.y) / closestStartPoint.y;
              continue;
            case ColumnHeaderType.STEP_AT_MAX:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData.STEP_AT_MAX = this.getMaxValueInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex,
                true
              ).step;
              continue;
            case ColumnHeaderType.STEP_AT_MIN:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData.STEP_AT_MIN = this.getMinValueInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex,
                true
              ).step;
              continue;
            case ColumnHeaderType.MEAN:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData.MEAN = this.getMean(datum.points);
              continue;
            case ColumnHeaderType.REAL_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.REAL_CHANGE =
                closestEndPoint.value - closestStartPoint.value;
              continue;
            case ColumnHeaderType.NONSMOOTHED_START_VALUE:
              selectedStepData.NONSMOOTHED_START_VALUE =
                closestStartPoint.value;
              continue;
            case ColumnHeaderType.NONSMOOTHED_END_VALUE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.NONSMOOTHED_END_VALUE = closestEndPoint.value;
              continue;
            default:
              continue;
          }
        }
        return selectedStepData;
      });
    dataTableData.sort(
      (point1: SelectedStepRunData, point2: SelectedStepRunData) => {
        const p1 = this.getSortableValue(point1, this.sortingInfo.header);
        const p2 = this.getSortableValue(point2, this.sortingInfo.header);
        if (p1 < p2) {
          return this.sortingInfo.order === SortingOrder.ASCENDING ? -1 : 1;
        }
        if (p1 > p2) {
          return this.sortingInfo.order === SortingOrder.ASCENDING ? 1 : -1;
        }

        return 0;
      }
    );
    return dataTableData;
  }

  private getSortableValue(
    point: SelectedStepRunData,
    header: ColumnHeaderType
  ) {
    switch (header) {
      // The value shown in the "RUN" column is a string concatenation of Alias Id + Alias + Run Name
      // but we would actually prefer to sort by just the run name.
      case ColumnHeaderType.RUN:
        return makeValueSortable(this.chartMetadataMap[point.id].displayName);
      default:
        return makeValueSortable(point[header]);
    }
  }
}

function makeValueSortable(value: number | string | null | undefined) {
  if (
    Number.isNaN(value) ||
    value === 'NaN' ||
    value === undefined ||
    value === null
  ) {
    return -Infinity;
  }
  return value;
}
