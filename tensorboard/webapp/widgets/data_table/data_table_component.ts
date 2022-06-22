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

import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {
  ColumnHeaders,
  SelectedStepRunData,
} from '../../metrics/views/card_renderer/scalar_card_types';
import {
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
        return numberFormatter.formatShort(selectedStepRunData.STEP as number);
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
      default:
        return '';
    }
  }
}
