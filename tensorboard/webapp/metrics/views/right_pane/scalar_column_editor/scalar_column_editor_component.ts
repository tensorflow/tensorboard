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
  DataTableMode,
} from '../../card_renderer/scalar_card_types';

const preventDefault = function (e: MouseEvent) {
  e.preventDefault();
};

enum Edge {
  TOP,
  BOTTOM,
}

const isHeaderOfType = function (type: ColumnHeaderType, header: ColumnHeader) {
  return header.type === type;
};

@Component({
  selector: 'metrics-scalar-column-editor-component',
  templateUrl: 'scalar_column_editor_component.ng.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [`scalar_column_editor_component.css`],
})
export class ScalarColumnEditorComponent implements OnDestroy {
  dataTableMode = DataTableMode;
  selectedTab: DataTableMode = DataTableMode.SINGLE;
  @Input() rangeHeaders!: ColumnHeader[];
  @Input() singleHeaders!: ColumnHeader[];

  @Output() onScalarTableColumnToggled = new EventEmitter<{
    dataTableMode: DataTableMode;
    headerType: ColumnHeaderType;
  }>();

  ngOnDestroy() {
    document.removeEventListener('dragover', preventDefault);
  }

  onTabChange(tabIndex: number) {
    switch (tabIndex) {
      case 0:
        this.selectedTab = DataTableMode.SINGLE;
        break;
      case 1:
        this.selectedTab = DataTableMode.RANGE;
        break;
    }
  }

  toggleHeader(header: ColumnHeader) {
    this.onScalarTableColumnToggled.emit({
      dataTableMode: this.selectedTab,
      headerType: header.type,
    });
  }
}
