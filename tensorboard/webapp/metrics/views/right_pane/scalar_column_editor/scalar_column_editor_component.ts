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
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {
  ColumnHeader,
  DataTableMode,
  Side,
} from '../../../../widgets/data_table/types';
import {HeaderEditInfo} from '../../../types';

const preventDefault = (e: MouseEvent) => {
  e.preventDefault();
};

const getIndexOfColumn = (column: ColumnHeader, headers: ColumnHeader[]) => {
  return headers.findIndex((header) => {
    return header.name === column.name;
  });
};

enum Edge {
  TOP,
  BOTTOM,
}

@Component({
  standalone: false,
  selector: 'metrics-scalar-column-editor-component',
  templateUrl: 'scalar_column_editor_component.ng.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [`scalar_column_editor_component.css`],
})
export class ScalarColumnEditorComponent implements OnDestroy {
  DataTableMode = DataTableMode;
  draggingHeader: ColumnHeader | undefined;
  highlightedHeader: ColumnHeader | undefined;
  highlightEdge: Edge = Edge.TOP;
  @Input() rangeHeaders!: ColumnHeader[];
  @Input() singleHeaders!: ColumnHeader[];
  @Input() selectedTab!: DataTableMode;

  @Output() onScalarTableColumnEdit = new EventEmitter<HeaderEditInfo>();
  @Output() onScalarTableColumnToggled = new EventEmitter<{
    dataTableMode: DataTableMode;
    header: ColumnHeader;
  }>();
  @Output() onScalarTableColumnEditorClosed = new EventEmitter<void>();
  @Output() onTabChange = new EventEmitter<DataTableMode>();

  constructor(private readonly hostElement: ElementRef) {}

  ngOnDestroy() {
    this.hostElement.nativeElement.removeEventListener(
      'dragover',
      preventDefault
    );
  }

  tabChange(event: MatTabChangeEvent) {
    const newMode =
      event.index === 0 ? DataTableMode.SINGLE : DataTableMode.RANGE;
    this.onTabChange.emit(newMode);
  }

  dragStart(header: ColumnHeader) {
    this.draggingHeader = header;
    this.hostElement.nativeElement.addEventListener('dragover', preventDefault);
  }

  dragEnd(dataTableMode: DataTableMode) {
    if (!this.draggingHeader || !this.highlightedHeader) {
      return;
    }
    const headers = this.getHeadersForMode(dataTableMode);
    const source = {...this.draggingHeader};
    const destination = {...this.highlightedHeader};
    if (source && destination && source.name !== destination.name) {
      this.onScalarTableColumnEdit.emit({
        source,
        destination,
        side: this.highlightEdge === Edge.TOP ? Side.LEFT : Side.RIGHT,
        dataTableMode,
      });
    }

    this.draggingHeader = undefined;
    this.highlightedHeader = undefined;
    this.hostElement.nativeElement.removeEventListener(
      'dragover',
      preventDefault
    );
  }

  dragEnter(header: ColumnHeader, dataTableMode: DataTableMode) {
    if (!this.draggingHeader) {
      return;
    }

    // Highlight the position which the dragging header will go when dropped.
    const headers = this.getHeadersForMode(dataTableMode);
    if (
      getIndexOfColumn(header, headers) <
      getIndexOfColumn(this.draggingHeader, headers)
    ) {
      this.highlightEdge = Edge.TOP;
    } else {
      this.highlightEdge = Edge.BOTTOM;
    }

    this.highlightedHeader = header;
  }

  toggleHeader(header: ColumnHeader, dataTableMode: DataTableMode) {
    this.onScalarTableColumnToggled.emit({
      dataTableMode: dataTableMode,
      header,
    });
  }

  getHighlightClasses(header: ColumnHeader) {
    if (header.name !== this.highlightedHeader?.name) {
      return {};
    }

    return {
      highlighted: true,
      'highlight-top': this.highlightEdge === Edge.TOP,
      'highlight-bottom': this.highlightEdge === Edge.BOTTOM,
    };
  }

  getSelectedTabIndex() {
    return this.selectedTab === DataTableMode.SINGLE ? 0 : 1;
  }

  private getHeadersForMode(dataTableMode: DataTableMode) {
    return dataTableMode === DataTableMode.SINGLE
      ? this.singleHeaders
      : this.rangeHeaders;
  }
}
