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
  ScalarCardDataSeries,
  ScalarCardPoint,
  ScalarCardSeriesMetadataMap,
} from './scalar_card_types';
import {
  ColumnHeader,
  ColumnHeaderType,
  DataTableMode,
  TableData,
  SortingInfo,
  SortingOrder,
} from '../../../widgets/data_table/types';
import {isDatumVisible} from './utils';

@Component({
  selector: 'scalar-card-data-table',
  templateUrl: 'scalar_card_data_table.ng.html',
  styles: [
    `
      .row-circle {
        height: 12px;
        width: 12px;
      }
      .row-circle > span {
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.4);
        display: inline-block;
        height: 10px;
        width: 10px;
        vertical-align: middle;
      }
    `,
  ],
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
  @Input() hparamsEnabled?: boolean;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() editColumnHeaders = new EventEmitter<HeaderEditInfo>();
  @Output() removeColumn = new EventEmitter<{
    headerType: ColumnHeaderType;
  }>();

  ColumnHeaderType = ColumnHeaderType;

  getHeaders(): ColumnHeader[] {
    return [
      {
        name: 'color',
        displayName: '',
        type: ColumnHeaderType.COLOR,
        enabled: true,
      },
    ].concat(this.columnHeaders);
  }
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

  getTimeSelectionTableData(): TableData[] {
    if (!this.stepOrLinkedTimeSelection) {
      return [];
    }
    const startStep = this.stepOrLinkedTimeSelection.start.step;
    const endStep = this.stepOrLinkedTimeSelection.end?.step;
    const dataTableData: TableData[] = this.dataSeries
      .filter((datum) => {
        return isDatumVisible(datum, this.chartMetadataMap);
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
        const selectedStepData: TableData = {
          id: datum.id,
          color: metadata.color,
        };
        for (const header of this.columnHeaders) {
          switch (header.type) {
            case ColumnHeaderType.RUN:
              let alias = '';
              if (metadata.alias) {
                alias = `${metadata.alias.aliasNumber} ${metadata.alias.aliasText}/`;
              }
              selectedStepData[header.name] = `${alias}${metadata.displayName}`;
              continue;
            case ColumnHeaderType.STEP:
              selectedStepData[header.name] = closestStartPoint.step;
              continue;
            case ColumnHeaderType.VALUE:
              selectedStepData[header.name] = closestStartPoint.value;
              continue;
            case ColumnHeaderType.RELATIVE_TIME:
              selectedStepData[header.name] =
                closestStartPoint.relativeTimeInMs;
              continue;
            case ColumnHeaderType.SMOOTHED:
              selectedStepData[header.name] = closestStartPoint.y;
              continue;
            case ColumnHeaderType.VALUE_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData[header.name] =
                closestEndPoint.y - closestStartPoint.y;
              continue;
            case ColumnHeaderType.START_STEP:
              selectedStepData[header.name] = closestStartPoint.step;
              continue;
            case ColumnHeaderType.END_STEP:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData[header.name] = closestEndPoint.step;
              continue;
            case ColumnHeaderType.START_VALUE:
              selectedStepData[header.name] = closestStartPoint.y;
              continue;
            case ColumnHeaderType.END_VALUE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData[header.name] = closestEndPoint.y;
              continue;
            case ColumnHeaderType.MIN_VALUE:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData[header.name] = this.getMinPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).y;
              continue;
            case ColumnHeaderType.MAX_VALUE:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData[header.name] = this.getMaxPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).y;
              continue;
            case ColumnHeaderType.PERCENTAGE_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData[header.name] =
                (closestEndPoint.y - closestStartPoint.y) / closestStartPoint.y;
              continue;
            case ColumnHeaderType.STEP_AT_MAX:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData[header.name] = this.getMaxPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).step;
              continue;
            case ColumnHeaderType.STEP_AT_MIN:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData[header.name] = this.getMinPointInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              ).step;
              continue;
            case ColumnHeaderType.MEAN:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData[header.name] = this.getMean(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              );
              continue;
            case ColumnHeaderType.RAW_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData[header.name] =
                closestEndPoint.value - closestStartPoint.value;
              continue;
            default:
              continue;
          }
        }
        return selectedStepData;
      });
    const sortingHeader = this.columnHeaders.find(
      (header) => header.name === this.sortingInfo.name
    );
    if (sortingHeader !== undefined) {
      dataTableData.sort((point1: TableData, point2: TableData) => {
        if (!sortingHeader) {
          return 0;
        }
        const p1 = this.getSortableValue(point1, sortingHeader);
        const p2 = this.getSortableValue(point2, sortingHeader);
        if (p1 < p2) {
          return this.sortingInfo.order === SortingOrder.ASCENDING ? -1 : 1;
        }
        if (p1 > p2) {
          return this.sortingInfo.order === SortingOrder.ASCENDING ? 1 : -1;
        }

        return 0;
      });
    }
    // console.log(JSON.parse(JSON.stringify(dataTableData)) as TableData[]);
    return dataTableData;
  }

  private getSortableValue(point: TableData, header: ColumnHeader) {
    // The value shown in the "RUN" column is a string concatenation of Alias Id + Alias + Run Name
    // but we would actually prefer to sort by just the run name.
    if (header.type === ColumnHeaderType.RUN) {
      return makeValueSortable(this.chartMetadataMap[point.id].displayName);
    }

    return makeValueSortable(point[header.name]);
  }

  orderColumns(headers: ColumnHeader[]) {
    this.editColumnHeaders.emit({
      headers: headers,
      dataTableMode: this.stepOrLinkedTimeSelection.end
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
