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
import {Observable} from 'rxjs';
import {State} from '../../../../app_state';
import {dataTableColumnEdited, dataTableColumnToggled} from '../../../actions';
import {
  getRangeSelectionHeaders,
  getSingleSelectionHeaders,
} from '../../../store/metrics_selectors';
import {
  ColumnHeader,
  ColumnHeaderType,
  DataTableMode,
} from '../../card_renderer/scalar_card_types';

@Component({
  selector: 'metrics-scalar-column-editor',
  template: `
    <metrics-scalar-column-editor-component
      [singleHeaders]="singleHeaders$ | async"
      [rangeHeaders]="rangeHeaders$ | async"
      (onScalarTableColumnToggled)="onScalarTableColumnToggled($event)"
      (onScalarTableColumnEdit)="onScalarTableColumnEdit($event)"
    >
    </metrics-scalar-column-editor-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScalarColumnEditorContainer {
  constructor(private readonly store: Store<State>) {}

  readonly singleHeaders$ = this.store.select(getSingleSelectionHeaders);
  readonly rangeHeaders$ = this.store.select(getRangeSelectionHeaders);

  onScalarTableColumnToggled({
    dataTableMode,
    headerType,
  }: {
    dataTableMode: DataTableMode;
    headerType: ColumnHeaderType;
  }) {
    this.store.dispatch(dataTableColumnToggled({dataTableMode, headerType}));
  }

  onScalarTableColumnEdit({
    dataTableMode,
    headers,
  }: {
    dataTableMode: DataTableMode;
    headers: ColumnHeader[];
  }) {
    this.store.dispatch(dataTableColumnEdited({dataTableMode, headers}));
  }
}
