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
import {
  ColumnHeader,
  ColumnHeaderType,
  DataTableMode,
} from '../../card_renderer/scalar_card_types';

const preventDefault = (e: MouseEvent) => {
  e.preventDefault();
};

// Move the item at sourceIndex to destinationIndex
const moveHeader = (
  sourceIndex: number,
  destinationIndex: number,
  headers: ColumnHeader[]
) => {
  const newHeaders = [...headers];
  // Delete from original location
  newHeaders.splice(sourceIndex, 1);
  // Insert at destinationIndex.
  newHeaders.splice(destinationIndex, 0, headers[sourceIndex]);
  return newHeaders;
};

const getIndexOfType = (type: ColumnHeaderType, headers: ColumnHeader[]) => {
  return headers.findIndex((header) => {
    return header.type === type;
  });
};

enum Edge {
  TOP,
  BOTTOM,
}

@Component({
  selector: 'metrics-scalar-column-editor-component',
  templateUrl: 'scalar_column_editor_component.ng.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [`scalar_column_editor_component.css`],
})
export class ScalarColumnEditorComponent implements OnDestroy {
  DataTableMode = DataTableMode;
  selectedTab: DataTableMode = DataTableMode.SINGLE;
  draggingHeaderType: ColumnHeaderType | undefined;
  highlightedHeaderType: ColumnHeaderType | undefined;
  highlightEdge: Edge = Edge.TOP;
  @Input() rangeHeaders!: ColumnHeader[];
  @Input() singleHeaders!: ColumnHeader[];

  @Output() onScalarTableColumnEdit = new EventEmitter<{
    dataTableMode: DataTableMode;
    headers: ColumnHeader[];
  }>();
  @Output() onScalarTableColumnToggled = new EventEmitter<{
    dataTableMode: DataTableMode;
    headerType: ColumnHeaderType;
  }>();
  @Output() onScalarTableColumnEditorClosed = new EventEmitter<void>();

  constructor(private readonly hostElement: ElementRef) {}

  ngOnDestroy() {
    this.hostElement.nativeElement.removeEventListener(
      'dragover',
      preventDefault
    );
  }

  dragStart(header: ColumnHeader) {
    this.draggingHeaderType = header.type;
    this.hostElement.nativeElement.addEventListener('dragover', preventDefault);
  }

  dragEnd(dataTableMode: DataTableMode) {
    if (!this.draggingHeaderType || !this.highlightedHeaderType) {
      return;
    }
    const headers = this.getHeadersForMode(dataTableMode);
    this.onScalarTableColumnEdit.emit({
      dataTableMode: dataTableMode,
      headers: moveHeader(
        getIndexOfType(this.draggingHeaderType, headers),
        getIndexOfType(this.highlightedHeaderType, headers),
        headers
      ),
    });
    this.draggingHeaderType = undefined;
    this.highlightedHeaderType = undefined;
    this.hostElement.nativeElement.removeEventListener(
      'dragover',
      preventDefault
    );
  }

  dragEnter(header: ColumnHeader, dataTableMode: DataTableMode) {
    if (!this.draggingHeaderType) {
      return;
    }

    // Highlight the position which the dragging header will go when dropped.
    const headers = this.getHeadersForMode(dataTableMode);
    if (
      getIndexOfType(header.type, headers) <
      getIndexOfType(this.draggingHeaderType, headers)
    ) {
      this.highlightEdge = Edge.TOP;
    } else {
      this.highlightEdge = Edge.BOTTOM;
    }

    this.highlightedHeaderType = header.type;
  }

  toggleHeader(header: ColumnHeader, dataTableMode: DataTableMode) {
    this.onScalarTableColumnToggled.emit({
      dataTableMode: dataTableMode,
      headerType: header.type,
    });
  }

  getHighlightClasses(header: ColumnHeader) {
    if (header.type !== this.highlightedHeaderType) {
      return {};
    }

    return {
      highlighted: true,
      'highlight-top': this.highlightEdge === Edge.TOP,
      'highlight-bottom': this.highlightEdge === Edge.BOTTOM,
    };
  }

  private getHeadersForMode(dataTableMode: DataTableMode) {
    return dataTableMode === DataTableMode.SINGLE
      ? this.singleHeaders
      : this.rangeHeaders;
  }
}
