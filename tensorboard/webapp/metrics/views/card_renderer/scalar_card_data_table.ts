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
import {HeaderEditInfo} from '../../types';
import {
  ColumnHeader,
  ColumnHeaderType,
  DataTableMode,
  ScalarCardDataSeries,
  ScalarCardPoint,
  ScalarCardSeriesMetadataMap,
  SelectedStepRunData,
  SortingInfo,
  SortingOrder,
} from './scalar_card_types';
import {isDatumVisible} from './utils';

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
      (orderColumns)="orderColumns($event)"
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
  @Output() editColumnHeaders = new EventEmitter<HeaderEditInfo>();

  getMinPointInRange(
    points: ScalarCardPoint[],
    startPointIndex: number,
    endPointIndex: number
  ): ScalarCardPoint {
    let minValue = points[startPointIndex].y;
    let minValuePoint = points[startPointIndex];
    for (let i = startPointIndex; i <= endPointIndex; i++) {
      if (minValue > points[i].y) {
        minValue = points[i].y;
        minValuePoint = points[i];
      }
    }
    return minValuePoint;
  }

  getMaxPointInRange(
    points: ScalarCardPoint[],
    startPointIndex: number,
    endPointIndex: number
  ): ScalarCardPoint {
    let maxValue = points[startPointIndex].y;
    let maxValuePoint = points[startPointIndex];
    for (let i = startPointIndex; i <= endPointIndex; i++) {
      if (maxValue < points[i].y) {
        maxValue = points[i].y;
        maxValuePoint = points[i];
      }
    }
    return maxValuePoint;
  }

  getMean(
    points: ScalarCardPoint[],
    startPointIndex: number,
    endPointIndex: number
  ) {
    let sum = 0;
    for (let i = startPointIndex; i <= endPointIndex; i++) {
      sum += points[i].value;
    }
    return sum / (endPointIndex - startPointIndex + 1);
  }

  getTimeSelectionTableData(): SelectedStepRunData[] {
    if (!this.stepOrLinkedTimeSelection) {
      return [];
    }
    const startStep = this.stepOrLinkedTimeSelection.start?.step;
    const endStep = this.stepOrLinkedTimeSelection.end.step;
    const dataTableData: SelectedStepRunData[] = this.dataSeries
      .filter((datum) => {
        return isDatumVisible(datum, this.chartMetadataMap);
      })
      .map((datum) => {
        const metadata = this.chartMetadataMap[datum.id];
        let closestStartPoint: ScalarCardPoint | null = null;
        let closestStartPointIndex: number | null = null;
        if (startStep !== null && startStep !== undefined) {
          closestStartPointIndex = findClosestIndex(datum.points, startStep);
          closestStartPoint = datum.points[closestStartPointIndex];
        }
        const closestEndPointIndex = findClosestIndex(datum.points, endStep);
        const closestEndPoint = datum.points[closestEndPointIndex];
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
              selectedStepData.STEP = closestEndPoint.step;
              continue;
            case ColumnHeaderType.VALUE:
              selectedStepData.VALUE = closestEndPoint.value;
              continue;
            case ColumnHeaderType.RELATIVE_TIME:
              selectedStepData.RELATIVE_TIME = closestEndPoint.relativeTimeInMs;
              continue;
            case ColumnHeaderType.SMOOTHED:
              selectedStepData.SMOOTHED = closestEndPoint.y;
              continue;
            case ColumnHeaderType.VALUE_CHANGE:
              if (closestStartPoint === null) {
                continue;
              }
              selectedStepData.VALUE_CHANGE =
                closestEndPoint.y - closestStartPoint.y;
              continue;
            case ColumnHeaderType.START_STEP:
              if (closestStartPoint === null) {
                continue;
              }
              selectedStepData.START_STEP = closestStartPoint.step;
              continue;
            case ColumnHeaderType.END_STEP:
              selectedStepData.END_STEP = closestEndPoint.step;
              continue;
            case ColumnHeaderType.START_VALUE:
              if (closestStartPoint === null) {
                continue;
              }
              selectedStepData.START_VALUE = closestStartPoint.y;
              continue;
            case ColumnHeaderType.END_VALUE:
              selectedStepData.END_VALUE = closestEndPoint.y;
              continue;
            case ColumnHeaderType.MIN_VALUE:
              if (closestStartPointIndex === null) {
                continue;
              }
              selectedStepData.MIN_VALUE = this.getMinPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).y;
              continue;
            case ColumnHeaderType.MAX_VALUE:
              if (closestStartPointIndex === null) {
                continue;
              }
              selectedStepData.MAX_VALUE = this.getMaxPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).y;
              continue;
            case ColumnHeaderType.PERCENTAGE_CHANGE:
              if (closestStartPoint === null) {
                continue;
              }
              selectedStepData.PERCENTAGE_CHANGE =
                (closestEndPoint.y - closestStartPoint.y) / closestStartPoint.y;
              continue;
            case ColumnHeaderType.STEP_AT_MAX:
              if (closestStartPointIndex === null) {
                continue;
              }
              selectedStepData.STEP_AT_MAX = this.getMaxPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).step;
              continue;
            case ColumnHeaderType.STEP_AT_MIN:
              if (closestStartPointIndex === null) {
                continue;
              }
              selectedStepData.STEP_AT_MIN = this.getMinPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).step;
              continue;
            case ColumnHeaderType.MEAN:
              if (closestStartPointIndex === null) {
                continue;
              }
              selectedStepData.MEAN = this.getMean(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              );
              continue;
            case ColumnHeaderType.RAW_CHANGE:
              if (closestStartPoint === null) {
                continue;
              }
              selectedStepData.RAW_CHANGE =
                closestEndPoint.value - closestStartPoint.value;
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

  orderColumns(headers: ColumnHeader[]) {
    this.editColumnHeaders.emit({
      headers: headers,
      dataTableMode:
        this.stepOrLinkedTimeSelection.start !== null
          ? DataTableMode.RANGE
          : DataTableMode.SINGLE,
    });
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
