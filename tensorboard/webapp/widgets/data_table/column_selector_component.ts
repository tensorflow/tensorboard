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
  Component,
  EventEmitter,
  Output,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {ColumnHeader} from './types';
import {BehaviorSubject} from 'rxjs';

@Component({
  selector: 'tb-data-table-column-selector-component',
  templateUrl: 'column_selector_component.ng.html',
  styleUrls: ['column_selector_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnSelectorComponent implements OnInit, AfterViewInit {
  @Input() selectableColumns: ColumnHeader[] = [];
  @Output() columnSelected = new EventEmitter<ColumnHeader>();

  @ViewChild('search')
  private readonly searchField!: ElementRef;

  @ViewChild('columnList')
  private readonly columnList!: ElementRef;

  searchInput = '';
  selectedIndex$ = new BehaviorSubject(0);

  ngOnInit() {
    /**
     * This components supports keyboard navigation.
     * Pressing the up arrow selects the previous column.
     * Pressing the down arrow selects the next column.
     * Pressing the enter key adds the selected column.
     *
     * When the selected column is outside the visible area (due to scolling)
     * we update the scrollTop to ensure the visible area follows the selected
     * column.
     */
    this.selectedIndex$.subscribe(() => {
      if (!this.columnList) {
        return;
      }
      const selectedButton: HTMLButtonElement =
        this.columnList.nativeElement.querySelector('button.selected');
      if (!selectedButton) return;

      const scrollAreaHeight: number =
        this.columnList.nativeElement.getBoundingClientRect().height;
      const buttonHeight = selectedButton.getBoundingClientRect().height;
      const scrollTop = this.columnList.nativeElement.scrollTop;
      // If we need to scroll up.
      if (this.selectedIndex$.getValue() * buttonHeight < scrollTop) {
        this.columnList.nativeElement.scrollTop =
          this.selectedIndex$.getValue() * buttonHeight;
      }

      // If we need to scroll down.
      if (
        (this.selectedIndex$.getValue() + 1) * buttonHeight >
        scrollTop + scrollAreaHeight
      ) {
        this.columnList.nativeElement.scrollTop =
          (this.selectedIndex$.getValue() + 1) * buttonHeight -
          scrollAreaHeight;
      }
    });
  }

  ngAfterViewInit() {
    this.searchInput = '';
    this.searchField.nativeElement.focus();
    this.selectedIndex$.next(0);
  }

  focus() {
    this.searchField?.nativeElement.focus();
  }

  getFilteredColumns() {
    return this.selectableColumns.filter(
      (columnHeader) =>
        columnHeader.name.toLowerCase().match(this.searchInput.toLowerCase()) ||
        columnHeader.displayName
          .toLowerCase()
          .match(this.searchInput.toLowerCase())
    );
  }

  searchInputChanged() {
    this.selectedIndex$.next(
      Math.min(
        this.selectedIndex$.getValue(),
        this.selectableColumns.length - 1
      )
    );
  }

  selectColumn(header: ColumnHeader) {
    this.selectedIndex$.next(0);
    this.columnSelected.emit(header);
  }

  @HostListener('document:keydown.arrowup', ['$event'])
  onUpArrow() {
    this.selectedIndex$.next(Math.max(this.selectedIndex$.getValue() - 1, 0));
  }

  @HostListener('document:keydown.arrowdown', ['$event'])
  onDownArrow() {
    this.selectedIndex$.next(
      Math.min(
        this.selectedIndex$.getValue() + 1,
        this.getFilteredColumns().length - 1
      )
    );
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterPressed() {
    this.selectColumn(
      this.getFilteredColumns()[this.selectedIndex$.getValue()]
    );
  }
}
