/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
  Input,
  OnDestroy,
} from '@angular/core';
import {
  ColumnHeaderType,
  ColumnHeader,
} from '../../metrics/views/card_renderer/scalar_card_types';

@Component({
  selector: 'tb-data-table-header',
  templateUrl: 'data_table_header_component.ng.html',
  styleUrls: ['data_table_header_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableHeaderComponent {
  @Input() header!: ColumnHeader;
  ColumnHeaderType = ColumnHeaderType;

  getHeaderTextColumn(columnHeader: ColumnHeaderType): string {
    switch (columnHeader) {
      case ColumnHeaderType.RUN:
        return 'Run';
      case ColumnHeaderType.VALUE:
        return 'Value';
      case ColumnHeaderType.STEP:
        return 'Step';
      case ColumnHeaderType.TIME:
        return 'Time';
      case ColumnHeaderType.RELATIVE_TIME:
        return 'Relative';
      case ColumnHeaderType.SMOOTHED:
        return 'Smoothed';
      case ColumnHeaderType.VALUE_CHANGE:
        return 'Value';
      case ColumnHeaderType.START_STEP:
        return 'Start Step';
      case ColumnHeaderType.END_STEP:
        return 'End Step';
      case ColumnHeaderType.START_VALUE:
        return 'Start Value';
      case ColumnHeaderType.END_VALUE:
        return 'End Value';
      case ColumnHeaderType.MIN_VALUE:
        return 'Min';
      case ColumnHeaderType.MAX_VALUE:
        return 'Max';
      case ColumnHeaderType.PERCENTAGE_CHANGE:
        return '%';
      case ColumnHeaderType.STEP_AT_MAX:
        return 'Step at Max';
      case ColumnHeaderType.STEP_AT_MIN:
        return 'Step at Min';
      case ColumnHeaderType.MEAN:
        return 'Mean';
      case ColumnHeaderType.RAW_CHANGE:
        return 'Real Value';
      default:
        return '';
    }
  }

  getSpecialTypeClasses(columnHeader: ColumnHeaderType) {
    switch (columnHeader) {
      case ColumnHeaderType.STEP_AT_MIN:
        return 'step-at-min';
      case ColumnHeaderType.STEP_AT_MAX:
        return 'step-at-max';
      default:
        return '';
    }
  }
}
