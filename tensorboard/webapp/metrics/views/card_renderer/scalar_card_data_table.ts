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
  ColumnHeaders,
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
      [headers]="dataHeaders"
      [data]="getTimeSelectionTableData()"
      [sortingInfo]="sortingInfo"
      (sortDataBy)="sortDataBy.emit($event)"
    ></tb-data-table>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardDataTable {
  @Input() chartMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() dataSeries!: ScalarCardDataSeries[];
  @Input() stepOrLinkedTimeSelection!: TimeSelection;
  @Input() dataHeaders!: ColumnHeaders[];
  @Input() sortingInfo!: SortingInfo;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();

  getMinValueInRange(
    points: ScalarCardPoint[],
    startPointIndex: number,
    endPointIndex: number
  ): number {
    let minValue = points[startPointIndex].value;
    for (let i = startPointIndex; i <= endPointIndex; i++) {
      if (minValue > points[i].value) {
        minValue = points[i].value;
      }
    }
    return minValue;
  }

  getMaxValueInRange(
    points: ScalarCardPoint[],
    startPointIndex: number,
    endPointIndex: number
  ): number {
    let maxValue = points[startPointIndex].value;
    for (let i = startPointIndex; i <= endPointIndex; i++) {
      if (maxValue < points[i].value) {
        maxValue = points[i].value;
      }
    }
    return maxValue;
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
        const selectedStepData: SelectedStepRunData = {};
        selectedStepData.COLOR = metadata.color;
        selectedStepData.DISPLAY_NAME = metadata.displayName;
        for (const header of this.dataHeaders) {
          switch (header) {
            case ColumnHeaders.RUN:
              let alias = '';
              if (metadata.alias) {
                alias = `${metadata.alias.aliasNumber} ${metadata.alias.aliasText}/`;
              }
              selectedStepData.RUN = `${alias}${metadata.displayName}`;
              continue;
            case ColumnHeaders.STEP:
              selectedStepData.STEP = closestStartPoint.step;
              continue;
            case ColumnHeaders.VALUE:
              selectedStepData.VALUE = closestStartPoint.value;
              continue;
            case ColumnHeaders.RELATIVE_TIME:
              selectedStepData.RELATIVE_TIME =
                closestStartPoint.relativeTimeInMs;
              continue;
            case ColumnHeaders.SMOOTHED:
              selectedStepData.SMOOTHED = closestStartPoint.y;
              continue;
            case ColumnHeaders.VALUE_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.VALUE_CHANGE =
                closestEndPoint.value - closestStartPoint.value;
              continue;
            case ColumnHeaders.START_STEP:
              selectedStepData.START_STEP = closestStartPoint.step;
              continue;
            case ColumnHeaders.END_STEP:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.END_STEP = closestEndPoint.step;
              continue;
            case ColumnHeaders.START_VALUE:
              selectedStepData.START_VALUE = closestStartPoint.value;
              continue;
            case ColumnHeaders.END_VALUE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.END_VALUE = closestEndPoint.value;
              continue;
            case ColumnHeaders.MIN_VALUE:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData.MIN_VALUE = this.getMinValueInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              );
              continue;
            case ColumnHeaders.MAX_VALUE:
              if (!closestEndPointIndex) {
                continue;
              }
              selectedStepData.MAX_VALUE = this.getMaxValueInRange(
                datum.points,
                closestStartPointIndex,
                closestEndPointIndex
              );
              continue;
            case ColumnHeaders.PERCENTAGE_CHANGE:
              if (!closestEndPoint) {
                continue;
              }
              selectedStepData.PERCENTAGE_CHANGE =
                (closestEndPoint.value - closestStartPoint.value) /
                closestStartPoint.value;
              continue;
            default:
              continue;
          }
        }
        return selectedStepData;
      });
    dataTableData.sort(
      (point1: SelectedStepRunData, point2: SelectedStepRunData) => {
        const p1 = getSortableValue(point1, this.sortingInfo.header);
        const p2 = getSortableValue(point2, this.sortingInfo.header);
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

function getSortableValue(point: SelectedStepRunData, header: ColumnHeaders) {
  switch (header) {
    // The value shown in the "RUN" column is a string concatenation of Alias Id + Alias + Run Name
    // but we would actually prefer to sort by just the run name.
    case ColumnHeaders.RUN:
      return makeValueSortable(point[ColumnHeaders.DISPLAY_NAME]);
    default:
      return makeValueSortable(point[header]);
  }
}
