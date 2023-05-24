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
  OnDestroy,
  Output,
} from '@angular/core';
import {
  ColumnHeader,
  ColumnHeaderType,
  TableData,
  SortingInfo,
  SortingOrder,
} from './types';
import {
  intlNumberFormatter,
  numberFormatter,
  relativeTimeFormatter,
} from '../line_chart_v2/lib/formatter';

enum Side {
  RIGHT,
  LEFT,
}

const preventDefault = function (e: MouseEvent) {
  e.preventDefault();
};

@Component({
  selector: 'tb-data-table',
  templateUrl: 'data_table_component.ng.html',
  styleUrls: ['data_table_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent implements OnDestroy {
  // The order of this array of headers determines the order which they are
  // displayed in the table.
  @Input() headers!: ColumnHeader[];
  @Input() data!: TableData[];
  @Input() sortingInfo!: SortingInfo;
  @Input() columnCustomizationEnabled!: boolean;
  @Input() smoothingEnabled!: boolean;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() orderColumns = new EventEmitter<ColumnHeader[]>();

  readonly ColumnHeaders = ColumnHeaderType;
  readonly SortingOrder = SortingOrder;
  readonly Side = Side;

  draggingHeaderName: string | undefined;
  highlightedColumnName: string | undefined;
  highlightSide: Side = Side.RIGHT;

  ngOnDestroy() {
    document.removeEventListener('dragover', preventDefault);
  }

  getFormattedDataForColumn(
    columnHeader: ColumnHeaderType,
    datum: string | number | undefined
  ): string {
    if (datum === undefined) {
      return '';
    }
    switch (columnHeader) {
      case ColumnHeaderType.RUN:
        return datum as string;
      case ColumnHeaderType.VALUE:
      case ColumnHeaderType.STEP:
      case ColumnHeaderType.SMOOTHED:
      case ColumnHeaderType.START_STEP:
      case ColumnHeaderType.END_STEP:
      case ColumnHeaderType.START_VALUE:
      case ColumnHeaderType.END_VALUE:
      case ColumnHeaderType.MIN_VALUE:
      case ColumnHeaderType.MAX_VALUE:
      case ColumnHeaderType.STEP_AT_MAX:
      case ColumnHeaderType.STEP_AT_MIN:
      case ColumnHeaderType.MEAN:
      case ColumnHeaderType.HPARAM:
        if (typeof datum === 'number') {
          return intlNumberFormatter.formatShort(datum as number);
        }
        return datum;
      case ColumnHeaderType.TIME:
        const time = new Date(datum!);
        return time.toISOString();
      case ColumnHeaderType.RELATIVE_TIME:
        return relativeTimeFormatter.formatReadable(datum as number);
      case ColumnHeaderType.VALUE_CHANGE:
        return intlNumberFormatter.formatShort(Math.abs(datum as number));
      case ColumnHeaderType.PERCENTAGE_CHANGE:
        return Math.round((datum as number) * 100).toString() + '%';
      case ColumnHeaderType.RAW_CHANGE:
        return numberFormatter.formatShort(Math.abs(datum as number));
      default:
        return '';
    }
  }

  headerClicked(name: string) {
    if (
      this.sortingInfo.name === name &&
      this.sortingInfo.order === SortingOrder.ASCENDING
    ) {
      this.sortDataBy.emit({
        name,
        order: SortingOrder.DESCENDING,
      });
      return;
    }
    this.sortDataBy.emit({
      name,
      order: SortingOrder.ASCENDING,
    });
  }

  dragStart(header: ColumnHeader) {
    this.draggingHeaderName = header.name;

    // This stop the end drag animation
    document.addEventListener('dragover', preventDefault);
  }

  dragEnd() {
    if (!this.draggingHeaderName || !this.highlightedColumnName) {
      return;
    }

    this.orderColumns.emit(
      this.moveHeader(
        this.getIndexOfHeaderWithName(this.draggingHeaderName!),
        this.getIndexOfHeaderWithName(this.highlightedColumnName!)
      )
    );
    this.draggingHeaderName = undefined;
    this.highlightedColumnName = undefined;
    document.removeEventListener('dragover', preventDefault);
  }

  dragEnter(header: ColumnHeader) {
    if (!this.draggingHeaderName) {
      return;
    }
    if (
      this.getIndexOfHeaderWithName(header.name) <
      this.getIndexOfHeaderWithName(this.draggingHeaderName!)
    ) {
      this.highlightSide = Side.LEFT;
    } else {
      this.highlightSide = Side.RIGHT;
    }
    this.highlightedColumnName = header.name;
  }

  // Move the item at sourceIndex to destinationIndex
  moveHeader(sourceIndex: number, destinationIndex: number) {
    const newHeaders = [...this.headers];
    // Delete from original location
    newHeaders.splice(sourceIndex, 1);
    // Insert at destinationIndex.
    newHeaders.splice(destinationIndex, 0, this.headers[sourceIndex]);
    return newHeaders;
  }

  getHeaderHighlightStyle(name: string) {
    if (name !== this.highlightedColumnName) {
      return {};
    }

    return {
      highlight: true,
      'highlight-border-right': this.highlightSide === Side.RIGHT,
      'highlight-border-left': this.highlightSide === Side.LEFT,
    };
  }

  showColumn(header: ColumnHeader) {
    return (
      header.enabled &&
      (this.smoothingEnabled || header.type !== ColumnHeaderType.SMOOTHED)
    );
  }

  getIndexOfHeaderWithName(name: string) {
    return this.headers.findIndex((element) => {
      return name === element.name;
    });
  }
}
