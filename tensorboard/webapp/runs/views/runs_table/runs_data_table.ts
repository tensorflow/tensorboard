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
  FilterAddedEvent,
  DiscreteFilter,
  IntervalFilter,
  ReorderColumnEvent,
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
  @Input() experimentIds!: string[];
  @Input() regexFilter!: string;
  @Input() isFullScreen!: boolean;
  @Input() selectableColumns!: ColumnHeader[];
  @Input() loading!: boolean;
  @Input() columnFilters!: Map<string, DiscreteFilter | IntervalFilter>;

  ColumnHeaderType = ColumnHeaderType;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() orderColumns = new EventEmitter<ReorderColumnEvent>();
  @Output() onSelectionToggle = new EventEmitter<string>();
  @Output() onAllSelectionToggle = new EventEmitter<string[]>();
  @Output() onRegexFilterChange = new EventEmitter<string>();
  @Output() toggleFullScreen = new EventEmitter();
  @Output() onRunColorChange = new EventEmitter<{
    runId: string;
    newColor: string;
  }>();
  @Output() addColumn = new EventEmitter<{
    header: ColumnHeader;
    index?: number | undefined;
  }>();
  @Output() removeColumn = new EventEmitter<ColumnHeader>();
  @Output() onSelectionDblClick = new EventEmitter<string>();
  @Output() addFilter = new EventEmitter<FilterAddedEvent>();

  // These columns must be stored and reused to stop needless re-rendering of
  // the content and headers in these columns. This has been known to cause
  // problems with the controls in these columns, specifically the color picker.
  beforeColumns = [
    {
      name: 'selected',
      displayName: '',
      type: ColumnHeaderType.CUSTOM,
      enabled: true,
    },
  ];

  afterColumns = [
    {
      name: 'color',
      displayName: '',
      type: ColumnHeaderType.COLOR,
      enabled: true,
    },
  ];

  getHeaders() {
    return ([] as Array<ColumnHeader>).concat(
      this.beforeColumns,
      this.headers,
      this.afterColumns
    );
  }

  selectionClick(event: MouseEvent, runId: string) {
    // Prevent checkbox from switching checked state on its own.
    event.preventDefault();

    // event.details on mouse click events gives the number of clicks in quick
    // succession. This logic is used to differentiate between single and double
    // clicks.
    // Note: This means any successive click after the second are noops.
    if (event.detail === 1) {
      this.onSelectionToggle.emit(runId);
    }
    if (event.detail === 2) {
      this.onSelectionDblClick.emit(runId);
    }
  }

  allRowsSelected() {
    return this.data?.every((row) => row['selected']);
  }

  someRowsSelected() {
    return this.data?.some((row) => row['selected']);
  }

  handleSelectAll(event: MouseEvent) {
    event.preventDefault();
    this.onAllSelectionToggle.emit(this.data?.map((row) => row.id));
  }

  onFilterKeyUp(event: KeyboardEvent) {
    const input = event.target! as HTMLInputElement;
    this.onRegexFilterChange.emit(input.value);
  }

  /**
   * Using the `trackBy` directive allows you to control when an element contained
   * by an `ngFor` is rerendered. In this case it is important that changes to
   * the `color` attribute do NOT trigger rerenders because doing so will recreate
   * and close the colorPicker.
   */
  trackByRuns(index: number, data: TableData) {
    const dataWithoutColor = {...data};
    delete dataWithoutColor['color'];
    return JSON.stringify(dataWithoutColor);
  }
}
