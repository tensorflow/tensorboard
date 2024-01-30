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
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
} from '@angular/core';
import {
  ColumnHeader,
  ColumnHeaderType,
  DiscreteFilter,
  DiscreteFilterValue,
  FilterAddedEvent,
  IntervalFilter,
  SortingInfo,
  SortingOrder,
  ReorderColumnEvent,
  Side,
  AddColumnEvent,
} from './types';
import {HeaderCellComponent} from './header_cell_component';
import {Subscription} from 'rxjs';
import {CustomModalComponent} from '../custom_modal/custom_modal_component';
import {ColumnSelectorComponent} from './column_selector_component';
import {ContentCellComponent} from './content_cell_component';
import {RangeValues} from '../range_input/types';
import {DataTableUtils} from './utils';

const preventDefault = function (e: MouseEvent) {
  e.preventDefault();
};

@Component({
  selector: 'tb-data-table',
  templateUrl: 'data_table_component.ng.html',
  styleUrls: ['data_table_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent implements OnDestroy, AfterContentInit {
  // The order of this array of headers determines the order which they are
  // displayed in the table.
  @Input() headers!: ColumnHeader[];
  @Input() sortingInfo!: SortingInfo;
  @Input() selectableColumns?: ColumnHeader[];
  @Input() columnFilters!: Map<string, DiscreteFilter | IntervalFilter>;
  @Input() loading: boolean = false;

  @ContentChildren(HeaderCellComponent)
  headerCells!: QueryList<HeaderCellComponent>;
  headerCellSubscriptions: Subscription[] = [];
  @ContentChildren(ContentCellComponent, {descendants: true})
  contentCells!: QueryList<ContentCellComponent>;
  contentCellSubscriptions: Subscription[] = [];

  contextMenuHeader: ColumnHeader | undefined = undefined;
  insertColumnTo: Side | undefined = undefined;
  filterColumn: ColumnHeader | undefined = undefined;

  @Output() sortDataBy = new EventEmitter<SortingInfo>();
  @Output() orderColumns = new EventEmitter<ReorderColumnEvent>();
  @Output() removeColumn = new EventEmitter<ColumnHeader>();
  @Output() hideColumn = new EventEmitter<ColumnHeader>();
  @Output() addColumn = new EventEmitter<AddColumnEvent>();
  @Output() addFilter = new EventEmitter<FilterAddedEvent>();

  @ViewChild('columnSelectorModal', {static: false})
  private readonly columnSelectorModal!: CustomModalComponent;

  @ViewChild(ColumnSelectorComponent, {static: false})
  private readonly columnSelector!: ColumnSelectorComponent;

  @ViewChild('contextMenu', {static: false})
  private readonly contextMenu!: CustomModalComponent;

  @ViewChild('filterModal', {static: false})
  private readonly filterModal!: CustomModalComponent;

  readonly ColumnHeaders = ColumnHeaderType;
  readonly SortingOrder = SortingOrder;
  readonly Side = Side;

  draggingHeaderName: string | undefined;
  highlightedColumnName: string | undefined;
  highlightSide: Side = Side.RIGHT;

  ngOnDestroy() {
    document.removeEventListener('dragover', preventDefault);
    this.headerCellSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
  }

  ngAfterContentInit() {
    this.syncHeaders();
    this.headerCells.changes.subscribe(this.syncHeaders.bind(this));

    this.syncContent();
    this.contentCells.changes.subscribe(this.syncContent.bind(this));
  }

  syncHeaders() {
    this.headerCellSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.headerCellSubscriptions = [];
    this.headerCells.forEach((headerCell) => {
      this.headerCellSubscriptions.push(
        headerCell.dragStart.subscribe(this.dragStart.bind(this)),
        headerCell.dragEnter.subscribe(this.dragEnter.bind(this)),
        headerCell.dragEnd.subscribe(this.dragEnd.bind(this)),
        headerCell.headerClicked.subscribe(this.sortByHeader.bind(this)),
        headerCell.contextMenuOpened.subscribe(
          this.openContextMenu.bind(this, headerCell.header)
        )
      );
    });
  }

  syncContent() {
    this.contentCellSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.contentCellSubscriptions = this.contentCells
      .map((contentCell) => [
        contentCell.contextMenuOpened.subscribe(
          this.openContextMenu.bind(this, contentCell.header)
        ),
      ])
      .flat();
  }

  sortByHeader(name: string) {
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
    const source = this.getHeaderByName(this.draggingHeaderName);
    const destination = this.getHeaderByName(this.highlightedColumnName);
    if (source && destination && source !== destination) {
      this.orderColumns.emit({
        source,
        destination,
        side: this.highlightSide,
      });
    }

    this.draggingHeaderName = undefined;
    this.highlightedColumnName = undefined;
    document.removeEventListener('dragover', preventDefault);
    this.headerCells.forEach((headerCell) => {
      headerCell.highlightStyle$.next({});
    });
  }

  dragEnter(header: ColumnHeader) {
    if (
      !this.draggingHeaderName ||
      this.getIndexOfHeaderWithName(header.name) === -1
    ) {
      return;
    }
    const draggingHeader = this.getHeaderByName(this.draggingHeaderName);
    // Prevent drag between groups
    if (
      draggingHeader &&
      DataTableUtils.columnToGroup(header) !==
        DataTableUtils.columnToGroup(draggingHeader)
    ) {
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

    this.headerCells.forEach((headerCell) => {
      headerCell.highlightStyle$.next(
        this.getHeaderHighlightStyle(headerCell.header.name)
      );
    });
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

  getHeaderByName(name: string): ColumnHeader | undefined {
    return this.headers.find((header) => header.name === name);
  }

  getIndexOfHeaderWithName(name: string) {
    return this.headers.findIndex((element) => {
      return name === element.name;
    });
  }

  focusColumnSelector() {
    this.columnSelector.focus();
  }

  openContextMenu(header: ColumnHeader, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.columnSelectorModal?.close();
    this.filterModal?.close();

    this.contextMenuHeader = header;
    this.contextMenu.openAtPosition({
      x: event.clientX,
      y: event.clientY,
    });
  }

  onContextMenuClosed() {
    this.contextMenuHeader = undefined;
  }

  openColumnSelector(
    event: MouseEvent,
    options?: {insertTo?: Side; isSubMenu?: boolean}
  ) {
    if (options?.isSubMenu) {
      event.stopPropagation();
    }
    this.filterModal?.close();
    this.insertColumnTo = options?.insertTo;
    const rect = (
      (event.target as HTMLElement).closest('button') as HTMLButtonElement
    ).getBoundingClientRect();
    this.columnSelectorModal.openAtPosition({
      x: rect.x + rect.width,
      y: rect.y,
    });
    this.columnSelector.activate();
  }

  onColumnSelectorClosed() {
    this.insertColumnTo = undefined;
    this.columnSelector.deactivate();
  }

  canContextMenuRemoveColumn() {
    return this.contextMenuHeader?.removable;
  }

  canContextMenuInsert() {
    return (
      this.selectableColumns &&
      this.selectableColumns.length &&
      this.contextMenuHeader?.movable &&
      this.contextMenuHeader?.type === 'HPARAM'
    );
  }

  isContextMenuEmpty() {
    return (
      !this.contextMenuHeader?.removable &&
      !this.contextMenuHeader?.sortable &&
      !this.canContextMenuInsert() &&
      !this.contextMenuHeader?.filterable
    );
  }

  contextMenuHideColumn() {
    if (!this.contextMenuHeader) {
      return;
    }
    this.hideColumn.emit(this.contextMenuHeader);
    this.contextMenu.close();
    this.filterModal?.close();
  }

  contextMenuRemoveColumn() {
    if (this.contextMenuHeader === undefined) {
      return;
    }
    this.removeColumn.emit(this.contextMenuHeader);
    this.contextMenu.close();
    this.filterModal?.close();
  }

  private getInsertIndex() {
    if (
      this.contextMenuHeader === undefined ||
      this.insertColumnTo === undefined
    ) {
      return undefined;
    }

    const index = this.headers.indexOf(this.contextMenuHeader);
    if (this.insertColumnTo === Side.LEFT) {
      return index;
    }
    if (this.insertColumnTo === Side.RIGHT) {
      return Math.min(index + 1, this.headers.length);
    }

    return index;
  }

  onColumnAdded(header: ColumnHeader) {
    this.addColumn.emit({
      column: header,
      nextTo: this.contextMenuHeader,
      side: this.insertColumnTo,
    });
  }

  openFilterMenu(event: MouseEvent, header: ColumnHeader) {
    this.filterColumn = header;
    const rect = (
      (event.target as HTMLElement).closest('button') as HTMLButtonElement
    ).getBoundingClientRect();
    event.stopPropagation();
    this.columnSelectorModal?.close();
    this.filterModal.openAtPosition({
      x: rect.x + rect.width,
      y: rect.y,
    });
  }

  getCurrentColumnFilter() {
    if (!this.filterColumn) {
      return;
    }
    return this.columnFilters.get(this.filterColumn.name);
  }

  onFilterClosed() {
    this.filterColumn = undefined;
  }

  intervalFilterChanged(value: RangeValues) {
    if (!this.filterColumn) {
      return;
    }
    const filter = this.getCurrentColumnFilter();
    if (!filter) {
      return;
    }

    this.addFilter.emit({
      name: this.filterColumn.name,
      value: {
        ...filter,
        filterLowerValue: value.lowerValue,
        filterUpperValue: value.upperValue,
      } as IntervalFilter,
    });
  }

  discreteFilterChanged(value: DiscreteFilterValue) {
    if (!this.filterColumn) {
      return;
    }
    const filter = this.getCurrentColumnFilter();
    if (!filter) {
      return;
    }
    const newValues = new Set([...(filter as DiscreteFilter).filterValues]);
    if (newValues.has(value)) {
      newValues.delete(value);
    } else {
      newValues.add(value);
    }

    this.addFilter.emit({
      name: this.filterColumn.name,
      value: {
        ...filter,
        filterValues: Array.from(newValues),
      } as DiscreteFilter,
    });
  }

  includeUndefinedToggled() {
    if (!this.filterColumn) {
      return;
    }
    const filter = this.getCurrentColumnFilter();
    if (!filter) {
      return;
    }
    this.addFilter.emit({
      name: this.filterColumn.name,
      value: {
        ...filter,
        includeUndefined: !filter.includeUndefined,
      },
    });
  }
}
