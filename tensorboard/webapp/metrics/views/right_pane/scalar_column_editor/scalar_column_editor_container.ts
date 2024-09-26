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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {map} from 'rxjs/operators';
import {State} from '../../../../app_state';
import {
  ColumnHeader,
  DataTableMode,
} from '../../../../widgets/data_table/types';
import {
  dataTableColumnOrderChanged,
  dataTableColumnToggled,
  metricsSlideoutMenuClosed,
  tableEditorTabChanged,
} from '../../../actions';
import {
  getRangeSelectionHeaders,
  getSingleSelectionHeaders,
  getTableEditorSelectedTab,
} from '../../../store/metrics_selectors';
import {HeaderEditInfo, HeaderToggleInfo} from '../../../types';

function headersWithoutRuns(headers: ColumnHeader[]) {
  return headers.filter((header) => header.type !== 'RUN');
}

@Component({
  standalone: false,
  selector: 'metrics-scalar-column-editor',
  template: `
    <metrics-scalar-column-editor-component
      [singleHeaders]="singleHeaders$ | async"
      [rangeHeaders]="rangeHeaders$ | async"
      [selectedTab]="selectedTab$ | async"
      (onScalarTableColumnToggled)="onScalarTableColumnToggled($event)"
      (onScalarTableColumnEdit)="onScalarTableColumnEdit($event)"
      (onScalarTableColumnEditorClosed)="onScalarTableColumnEditorClosed()"
      (onTabChange)="onTabChange($event)"
    >
    </metrics-scalar-column-editor-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarColumnEditorContainer {
  constructor(private readonly store: Store<State>) {
    this.singleHeaders$ = this.store
      .select(getSingleSelectionHeaders)
      .pipe(map(headersWithoutRuns));
    this.rangeHeaders$ = this.store
      .select(getRangeSelectionHeaders)
      .pipe(map(headersWithoutRuns));
    this.selectedTab$ = this.store.select(getTableEditorSelectedTab);
  }

  readonly singleHeaders$;
  readonly rangeHeaders$;
  readonly selectedTab$;

  onScalarTableColumnToggled(toggleInfo: HeaderToggleInfo) {
    this.store.dispatch(dataTableColumnToggled(toggleInfo));
  }

  onScalarTableColumnEdit(editInfo: HeaderEditInfo) {
    this.store.dispatch(dataTableColumnOrderChanged(editInfo));
  }

  onScalarTableColumnEditorClosed() {
    this.store.dispatch(metricsSlideoutMenuClosed());
  }

  onTabChange(tab: DataTableMode) {
    this.store.dispatch(tableEditorTabChanged({tab}));
  }
}
