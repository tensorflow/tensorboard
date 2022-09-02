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
import {
  ColumnHeaders,
  SelectedStepRunData,
  SortingInfo,
  SortingOrder,
} from '../../metrics/views/card_renderer/scalar_card_types';
import {
  intlNumberFormatter,
  numberFormatter,
  relativeTimeFormatter,
} from '../line_chart_v2/lib/formatter';

@Component({
  selector: 'tb-data-table',
  templateUrl: 'data_table_component.ng.html',
  styleUrls: ['data_table_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent {
  // The order of this array of headers determines the order which they are
  // displayed in the table.
  @Input() headers!: ColumnHeaders[];
  @Input() data!: SelectedStepRunData[];
  @Input() sortingInfo!: SortingInfo;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();

  readonly ColumnHeaders = ColumnHeaders;
  readonly SortingOrder = SortingOrder;

  getHeaderTextColumn(columnHeader: ColumnHeaders): string {
    switch (columnHeader) {
      case ColumnHeaders.RUN:
        return 'Run';
      case ColumnHeaders.VALUE:
        return 'Value';
      case ColumnHeaders.STEP:
        return 'Step';
      case ColumnHeaders.TIME:
        return 'Time';
      case ColumnHeaders.RELATIVE_TIME:
        return 'Relative';
      case ColumnHeaders.SMOOTHED:
        return 'Smoothed';
      case ColumnHeaders.VALUE_CHANGE:
        return 'Value';
      case ColumnHeaders.START_STEP:
        return 'Start Step';
      case ColumnHeaders.END_STEP:
        return 'End Step';
      case ColumnHeaders.START_VALUE:
        return 'Start Value';
      case ColumnHeaders.END_VALUE:
        return 'End Value';
      case ColumnHeaders.MIN_VALUE:
        return 'Min';
      case ColumnHeaders.MAX_VALUE:
        return 'Max';
      case ColumnHeaders.PERCENTAGE_CHANGE:
        return '%';
      default:
        return '';
    }
  }

  getFormattedDataForColumn(
    columnHeader: ColumnHeaders,
    selectedStepRunData: SelectedStepRunData
  ): string {
    switch (columnHeader) {
      case ColumnHeaders.RUN:
        if (selectedStepRunData.RUN === undefined) {
          return '';
        }
        return selectedStepRunData.RUN as string;
      case ColumnHeaders.VALUE:
        if (selectedStepRunData.VALUE === undefined) {
          return '';
        }
        return numberFormatter.formatShort(selectedStepRunData.VALUE as number);
      case ColumnHeaders.STEP:
        if (selectedStepRunData.STEP === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.STEP as number
        );
      case ColumnHeaders.TIME:
        if (selectedStepRunData.TIME === undefined) {
          return '';
        }
        const time = new Date(selectedStepRunData.TIME!);
        return time.toISOString();
      case ColumnHeaders.RELATIVE_TIME:
        if (selectedStepRunData.RELATIVE_TIME === undefined) {
          return '';
        }
        return relativeTimeFormatter.formatReadable(
          selectedStepRunData.RELATIVE_TIME as number
        );
      case ColumnHeaders.SMOOTHED:
        if (selectedStepRunData.SMOOTHED === undefined) {
          return '';
        }
        return numberFormatter.formatShort(
          selectedStepRunData.SMOOTHED as number
        );
      case ColumnHeaders.VALUE_CHANGE:
        if (selectedStepRunData.VALUE_CHANGE === undefined) {
          return '';
        }
        return numberFormatter.formatShort(
          Math.abs(selectedStepRunData.VALUE_CHANGE as number)
        );
      case ColumnHeaders.START_STEP:
        if (selectedStepRunData.START_STEP === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.START_STEP as number
        );
      case ColumnHeaders.END_STEP:
        if (selectedStepRunData.END_STEP === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.END_STEP as number
        );
      case ColumnHeaders.START_VALUE:
        if (selectedStepRunData.START_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.START_VALUE as number
        );
      case ColumnHeaders.END_VALUE:
        if (selectedStepRunData.END_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.END_VALUE as number
        );
      case ColumnHeaders.MIN_VALUE:
        if (selectedStepRunData.MIN_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.MIN_VALUE as number
        );
      case ColumnHeaders.MAX_VALUE:
        if (selectedStepRunData.MAX_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.MAX_VALUE as number
        );
      case ColumnHeaders.PERCENTAGE_CHANGE:
        if (selectedStepRunData.PERCENTAGE_CHANGE === undefined) {
          return '';
        }
        return (
          Math.round(
            (selectedStepRunData.PERCENTAGE_CHANGE as number) * 100
          ).toString() + '%'
        );
      default:
        return '';
    }
  }

  headerClicked(header: ColumnHeaders) {
    if (
      this.sortingInfo.header === header &&
      this.sortingInfo.order === SortingOrder.ASCENDING
    ) {
      this.sortDataBy.emit({header, order: SortingOrder.DESCENDING});
      return;
    }
    this.sortDataBy.emit({header, order: SortingOrder.ASCENDING});
  }
}
