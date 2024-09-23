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
  HostListener,
  Input,
  Output,
} from '@angular/core';
import {ColumnHeader, ColumnHeaderType} from './types';
import {
  intlNumberFormatter,
  numberFormatter,
  relativeTimeFormatter,
} from '../line_chart_v2/lib/formatter';

@Component({
  standalone: false,
  selector: 'tb-data-table-content-cell',
  templateUrl: 'content_cell_component.ng.html',
  styleUrls: ['content_cell_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentCellComponent {
  @Input() header!: ColumnHeader;
  @Input() datum!: string | number;

  @Output() contextMenuOpened = new EventEmitter<MouseEvent>();

  ColumnHeaderType = ColumnHeaderType;

  getFormattedDataForColumn(): string {
    if (this.datum === undefined) {
      return '';
    }
    switch (this.header.type) {
      case ColumnHeaderType.RUN:
        return this.datum as string;
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
        if (typeof this.datum === 'number') {
          return intlNumberFormatter.formatShort(this.datum as number);
        }
        return this.datum;
      case ColumnHeaderType.TIME:
        const time = new Date(this.datum!);
        return time.toISOString();
      case ColumnHeaderType.RELATIVE_TIME:
        return relativeTimeFormatter.formatReadable(this.datum as number);
      case ColumnHeaderType.VALUE_CHANGE:
        return intlNumberFormatter.formatShort(Math.abs(this.datum as number));
      case ColumnHeaderType.PERCENTAGE_CHANGE:
        return Math.round((this.datum as number) * 100).toString() + '%';
      case ColumnHeaderType.RAW_CHANGE:
        return numberFormatter.formatShort(Math.abs(this.datum as number));
      default:
        return '';
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenuOpened(event: MouseEvent) {
    this.contextMenuOpened.emit(event);
  }
}
