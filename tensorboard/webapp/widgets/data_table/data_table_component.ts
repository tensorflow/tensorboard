/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
  RunStepData,
} from '../../metrics/views/card_renderer/scalar_card_types';

import {
  // Formatter,
  // intlNumberFormatter,
  numberFormatter,
  relativeTimeFormatter,
  // relativeTimeFormatter,
} from '../../widgets/line_chart_v2/lib/formatter';

@Component({
  selector: 'tb-data-table',
  templateUrl: 'data_table_component.ng.html',
  styleUrls: ['data_table_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent {
  @Input() headers!: ColumnHeaders[];
  @Input() data!: RunStepData[];

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
    runStepData: RunStepData
  ): string {
    console.log('getFormattedDataForColumn', columnHeader, ', ', runStepData);
    switch (columnHeader) {
      case ColumnHeaders.RUN:
        return runStepData.metadata.displayName;
      case ColumnHeaders.VALUE:
        return numberFormatter.formatShort(runStepData.closestStartPoint.value);
      case ColumnHeaders.STEP:
        return numberFormatter.formatShort(runStepData.closestStartPoint.step);
      case ColumnHeaders.TIME:
        const time = new Date(runStepData.closestStartPoint.wallTime);
        return time.toISOString();
      case ColumnHeaders.RELATIVE_TIME:
        return relativeTimeFormatter.formatReadable(
          runStepData.closestStartPoint.relativeTimeInMs
        );
      default:
        return '';
    }
  }
}
