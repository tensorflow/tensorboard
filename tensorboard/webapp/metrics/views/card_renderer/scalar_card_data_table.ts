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
import {HeaderEditInfo, HeaderToggleInfo} from '../../types';
import {RunToHparamMap} from '../../../runs/types';
import {
  ScalarCardDataSeries,
  ScalarCardPoint,
  ScalarCardSeriesMetadataMap,
  SmoothedSeriesMetadata,
} from './scalar_card_types';
import {
  ColumnHeader,
  ColumnHeaderType,
  DataTableMode,
  TableData,
  SortingInfo,
  SortingOrder,
  DiscreteFilter,
  IntervalFilter,
  FilterAddedEvent,
  ReorderColumnEvent,
  AddColumnEvent,
  AddColumnSize,
} from '../../../widgets/data_table/types';
import {isDatumVisible} from './utils';
import {memoize} from '../../../util/memoize';

@Component({
  standalone: false,
  selector: 'scalar-card-data-table',
  templateUrl: 'scalar_card_data_table.ng.html',
  styleUrls: ['scalar_card_data_table.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarCardDataTable {
  @Input() chartMetadataMap!: ScalarCardSeriesMetadataMap;
  @Input() dataSeries!: ScalarCardDataSeries[];
  @Input() stepOrLinkedTimeSelection!: TimeSelection;
  @Input() columnHeaders!: ColumnHeader[];
  @Input() sortingInfo!: SortingInfo;
  @Input() columnCustomizationEnabled!: boolean;
  @Input() columnContextMenusEnabled!: boolean;
  @Input() smoothingEnabled!: boolean;
  @Input() columnFilters!: Map<string, DiscreteFilter | IntervalFilter>;
  @Input() selectableColumns!: ColumnHeader[];
  @Input() numColumnsLoaded!: number;
  @Input() numColumnsToLoad!: number;
  @Input() runToHparamMap!: RunToHparamMap;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() editColumnHeaders = new EventEmitter<HeaderEditInfo>();
  @Output() addColumn = new EventEmitter<AddColumnEvent>();
  @Output() removeColumn = new EventEmitter<HeaderToggleInfo>();
  @Output() addFilter = new EventEmitter<FilterAddedEvent>();
  @Output() loadAllColumns = new EventEmitter<null>();

  readonly ColumnHeaderType = ColumnHeaderType;
  readonly AddColumnSize = AddColumnSize;

  // Columns must be memoized to stop needless re-rendering of the content and headers in these
  // columns. This has been known to cause problems with the controls in these columns,
  // specifically the add button.
  extendHeaders = memoize(this.internalExtendHeaders);

  private internalExtendHeaders(headers: ColumnHeader[]) {
    return ([] as Array<ColumnHeader>).concat(
      [
        {
          name: 'color',
          displayName: '',
          type: ColumnHeaderType.COLOR,
          enabled: true,
        },
      ],
      headers
    );
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
            case ColumnHeaderType.HPARAM:
              const runId =
                (metadata as SmoothedSeriesMetadata).originalSeriesId ||
                metadata.id;
              selectedStepData[header.name] =
                this.runToHparamMap?.[runId]?.get(header.name) ?? '';
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

  private getDataTableMode(): DataTableMode {
    return this.stepOrLinkedTimeSelection.end
      ? DataTableMode.RANGE
      : DataTableMode.SINGLE;
  }

  onOrderColumns({source, destination, side}: ReorderColumnEvent) {
    this.editColumnHeaders.emit({
      source,
      destination,
      side,
      dataTableMode: this.getDataTableMode(),
    });
  }

  onRemoveColumn(header: ColumnHeader) {
    this.removeColumn.emit({header, dataTableMode: this.getDataTableMode()});
  }
}

function makeValueSortable(
  value: number | string | boolean | null | undefined | object
) {
  if (typeof value === 'object') {
    // The Scalar table does not currently support any objects.
    // When support is added specific sorting logic to that object type should
    // be added here.
    return -Infinity;
  }

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
