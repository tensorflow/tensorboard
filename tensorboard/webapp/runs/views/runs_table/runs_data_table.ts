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
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  ColumnHeader,
  TableData,
  SortingInfo,
  ColumnHeaderType,
} from '../../../widgets/data_table/types';

@Component({
  selector: 'runs-data-table',
  templateUrl: 'runs_data_table.ng.html',
  styleUrls: ['runs_data_table.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsDataTable {
  @Input() headers!: ColumnHeader[];
  @Input() data!: TableData[];
  @Input() sortingInfo!: SortingInfo;

  ColumnHeaderType = ColumnHeaderType;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() orderColumns = new EventEmitter<ColumnHeader[]>();
  @Output() onSelectionToggle = new EventEmitter<string>();
  @Output() onAllSelectionToggle = new EventEmitter<string[]>();

  getHeaders() {
    return [
      {
        name: 'selected',
        displayName: '',
        type: ColumnHeaderType.CUSTOM,
        enabled: true,
      },
    ].concat(
      this.headers.concat([
        {
          name: 'color',
          displayName: '',
          type: ColumnHeaderType.COLOR,
          enabled: true,
        },
      ])
    );
  }

  getRunIds() {
    return this.data.map((row) => row.id);
  }

  allRowsSelected() {
    return this.data.every((row) => row.selected);
  }

  someRowsSelected() {
    return this.data.some((row) => row.selected);
  }

  onRunColorChange(newColor: string) {
    console.log('onRunColorChange')
  }

  test() {
    console.log('clicked');
  }
}
