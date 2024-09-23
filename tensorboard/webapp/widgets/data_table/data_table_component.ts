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
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  ColumnHeader,
  DiscreteFilter,
  DiscreteFilterValue,
  FilterAddedEvent,
  IntervalFilter,
  SortingInfo,
  SortingOrder,
  ReorderColumnEvent,
  Side,
  AddColumnEvent,
  AddColumnSize,
} from './types';
import {HeaderCellComponent} from './header_cell_component';
import {Subscription} from 'rxjs';
import {first} from 'rxjs/operators';
import {ContentCellComponent} from './content_cell_component';
import {RangeValues} from '../range_input/types';
import {dataTableUtils} from './utils';
import {CustomModal, CustomModalRef} from '../custom_modal/custom_modal';

const preventDefault = function (e: MouseEvent) {
  e.preventDefault();
};

@Component({
  standalone: false,
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
  @Input() numColumnsLoaded!: number;
  @Input() hasMoreColumnsToLoad!: boolean;
  @Input() columnFilters!: Map<string, DiscreteFilter | IntervalFilter>;
  @Input() loading: boolean = false;
  @Input() shouldAddBorders: boolean = false;
  @Input() addColumnSize: AddColumnSize = AddColumnSize.DEFAULT;

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
  @Output() addColumn = new EventEmitter<AddColumnEvent>();
  @Output() addFilter = new EventEmitter<FilterAddedEvent>();
  @Output() loadAllColumns = new EventEmitter<null>();

  @ViewChild('contextMenuTemplate', {read: TemplateRef})
  contextMenuTemplate!: TemplateRef<unknown>;
  @ViewChild('filterModalTemplate', {read: TemplateRef})
  filterModalTemplate!: TemplateRef<unknown>;
  @ViewChild('columnSelectorModalTemplate', {read: TemplateRef})
  columnSelectorModalTemplate!: TemplateRef<unknown>;

  filterModalRef?: CustomModalRef | undefined;
  columnSelectorModalRef?: CustomModalRef | undefined;

  draggingHeaderName: string | undefined;
  highlightedColumnName: string | undefined;
  highlightSide: Side = Side.RIGHT;

  readonly SortingOrder = SortingOrder;
  readonly Side = Side;
  readonly AddColumnSize = AddColumnSize;

  constructor(
    private readonly customModal: CustomModal,
    private readonly viewContainerRef: ViewContainerRef
  ) {}

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
      dataTableUtils.columnToGroup(header) !==
        dataTableUtils.columnToGroup(draggingHeader)
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

  openContextMenu(header: ColumnHeader, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.contextMenuHeader = header;
    // For right clicks, open context menu near button rather than all the way outside of the
    // header cell, which looks weird.
    const descendantButton = (event.target as HTMLElement).querySelector(
      'button.context-menu-container'
    );
    const targetElement = descendantButton ?? (event.target as HTMLElement);

    this.customModal.createNextToElement(
      this.contextMenuTemplate,
      targetElement,
      this.viewContainerRef
    );
  }

  openColumnSelector({event, insertTo}: {event: MouseEvent; insertTo?: Side}) {
    event.stopPropagation();
    this.closeSubmenus();

    this.insertColumnTo = insertTo;
    this.columnSelectorModalRef = this.customModal.createNextToElement(
      this.columnSelectorModalTemplate,
      (event.target as HTMLElement).closest('button') as HTMLButtonElement,
      this.viewContainerRef
    );
    this.columnSelectorModalRef?.onClose.pipe(first()).subscribe(() => {
      this.columnSelectorModalRef = undefined;
    });
  }

  canContextMenuRemoveColumn() {
    return this.contextMenuHeader?.removable;
  }

  onRemoveColumn(header: ColumnHeader) {
    this.removeColumn.emit(header);
    this.customModal.closeAll();
  }

  onColumnAdded(header: ColumnHeader) {
    this.addColumn.emit({
      column: header,
      nextTo: this.contextMenuHeader,
      side: this.insertColumnTo,
    });
  }

  closeSubmenus() {
    if (this.filterModalRef) {
      this.customModal.close(this.filterModalRef);
    }
    if (this.columnSelectorModalRef) {
      this.customModal.close(this.columnSelectorModalRef);
    }
  }

  openFilterMenu(event: MouseEvent) {
    event.stopPropagation();
    this.closeSubmenus();

    this.filterColumn = this.contextMenuHeader;
    this.filterModalRef = this.customModal.createNextToElement(
      this.filterModalTemplate,
      (event.target as HTMLElement).closest('button') as HTMLButtonElement,
      this.viewContainerRef
    );
    this.filterModalRef?.onClose.pipe(first()).subscribe(() => {
      this.filterModalRef = undefined;
    });
  }

  getCurrentColumnFilter() {
    if (!this.filterColumn) {
      return;
    }
    return this.columnFilters.get(this.filterColumn.name);
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
