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
  SelectedStepRunData,
  SortingInfo,
  SortingOrder,
} from '../../metrics/views/card_renderer/scalar_card_types';
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

const isHeaderOfType = function (type: ColumnHeaderType, header: ColumnHeader) {
  return header.type === type;
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
  @Input() data!: SelectedStepRunData[];
  @Input() sortingInfo!: SortingInfo;
  @Input() columnCustomizationEnabled!: boolean;
  @Input() smoothingEnabled!: boolean;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() orderColumns = new EventEmitter<ColumnHeader[]>();

  readonly ColumnHeaders = ColumnHeaderType;
  readonly SortingOrder = SortingOrder;
  readonly Side = Side;

  draggingHeaderType: ColumnHeaderType | undefined;
  highlightedColumnType: ColumnHeaderType | undefined;
  highlightSide: Side = Side.RIGHT;

  ngOnDestroy() {
    document.removeEventListener('dragover', preventDefault);
  }

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
      default:
        return '';
    }
  }

  getFormattedDataForColumn(
    columnHeader: ColumnHeaderType,
    selectedStepRunData: SelectedStepRunData
  ): string {
    switch (columnHeader) {
      case ColumnHeaderType.RUN:
        if (selectedStepRunData.RUN === undefined) {
          return '';
        }
        return selectedStepRunData.RUN as string;
      case ColumnHeaderType.VALUE:
        if (selectedStepRunData.VALUE === undefined) {
          return '';
        }
        return numberFormatter.formatShort(selectedStepRunData.VALUE as number);
      case ColumnHeaderType.STEP:
        if (selectedStepRunData.STEP === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.STEP as number
        );
      case ColumnHeaderType.TIME:
        if (selectedStepRunData.TIME === undefined) {
          return '';
        }
        const time = new Date(selectedStepRunData.TIME!);
        return time.toISOString();
      case ColumnHeaderType.RELATIVE_TIME:
        if (selectedStepRunData.RELATIVE_TIME === undefined) {
          return '';
        }
        return relativeTimeFormatter.formatReadable(
          selectedStepRunData.RELATIVE_TIME as number
        );
      case ColumnHeaderType.SMOOTHED:
        if (selectedStepRunData.SMOOTHED === undefined) {
          return '';
        }
        return numberFormatter.formatShort(
          selectedStepRunData.SMOOTHED as number
        );
      case ColumnHeaderType.VALUE_CHANGE:
        if (selectedStepRunData.VALUE_CHANGE === undefined) {
          return '';
        }
        return numberFormatter.formatShort(
          Math.abs(selectedStepRunData.VALUE_CHANGE as number)
        );
      case ColumnHeaderType.START_STEP:
        if (selectedStepRunData.START_STEP === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.START_STEP as number
        );
      case ColumnHeaderType.END_STEP:
        if (selectedStepRunData.END_STEP === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.END_STEP as number
        );
      case ColumnHeaderType.START_VALUE:
        if (selectedStepRunData.START_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.START_VALUE as number
        );
      case ColumnHeaderType.END_VALUE:
        if (selectedStepRunData.END_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.END_VALUE as number
        );
      case ColumnHeaderType.MIN_VALUE:
        if (selectedStepRunData.MIN_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.MIN_VALUE as number
        );
      case ColumnHeaderType.MAX_VALUE:
        if (selectedStepRunData.MAX_VALUE === undefined) {
          return '';
        }
        return intlNumberFormatter.formatShort(
          selectedStepRunData.MAX_VALUE as number
        );
      case ColumnHeaderType.PERCENTAGE_CHANGE:
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

  headerClicked(header: ColumnHeaderType) {
    if (
      this.sortingInfo.header === header &&
      this.sortingInfo.order === SortingOrder.ASCENDING
    ) {
      this.sortDataBy.emit({header, order: SortingOrder.DESCENDING});
      return;
    }
    this.sortDataBy.emit({header, order: SortingOrder.ASCENDING});
  }

  dragStart(header: ColumnHeader) {
    this.draggingHeaderType = header.type;

    // This stop the end drag animation
    document.addEventListener('dragover', preventDefault);
  }

  dragEnd() {
    if (!this.draggingHeaderType || !this.highlightedColumnType) {
      return;
    }

    this.orderColumns.emit(
      this.moveHeader(
        this.headers.findIndex((element) =>
          isHeaderOfType(this.draggingHeaderType!, element)
        ),
        this.headers.findIndex((element) =>
          isHeaderOfType(this.highlightedColumnType!, element)
        )
      )
    );
    this.draggingHeaderType = undefined;
    this.highlightedColumnType = undefined;
    document.removeEventListener('dragover', preventDefault);
  }

  dragEnter(header: ColumnHeader) {
    if (!this.draggingHeaderType) {
      return;
    }
    if (
      this.headers.findIndex((element) =>
        isHeaderOfType(header.type, element)
      ) <
      this.headers.findIndex((element) =>
        isHeaderOfType(this.draggingHeaderType!, element)
      )
    ) {
      this.highlightSide = Side.LEFT;
    } else {
      this.highlightSide = Side.RIGHT;
    }
    this.highlightedColumnType = header.type;
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

  getHeaderHighlightStyle(header: ColumnHeaderType) {
    if (header !== this.highlightedColumnType) {
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
}
