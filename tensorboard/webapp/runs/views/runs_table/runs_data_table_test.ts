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

import {Component, Input, ViewChild} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {RunsDataTable} from './runs_data_table';
import {DataTableModule} from '../../../widgets/data_table/data_table_module';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {
  SortingOrder,
  SortingInfo,
  TableData,
  ColumnHeader,
  ColumnHeaderType,
} from '../../../widgets/data_table/types';
import {By} from '@angular/platform-browser';
import {HeaderCellComponent} from '../../../widgets/data_table/header_cell_component';
import {DataTableComponent} from '../../../widgets/data_table/data_table_component';
import {ContentCellComponent} from '../../../widgets/data_table/content_cell_component';

@Component({
  selector: 'testable-comp',
  template: `
    <runs-data-table
      [data]="data"
      [headers]="headers"
      [sortingInfo]="sortingInfo"
      (sortDataBy)="sortDataBy($event)"
      (orderColumns)="orderColumns($event)"
    ></runs-data-table>
  `,
})
class TestableComponent {
  @ViewChild('RunsDataTable')
  dataTable!: RunsDataTable;

  @Input() headers!: ColumnHeader[];
  @Input() data!: TableData[];
  @Input() sortingInfo!: SortingInfo;
}

describe('runs_data_table', () => {
  function createComponent(input: {
    data?: TableData[];
    headers?: ColumnHeader[];
    sortingInfo?: SortingInfo;
  }) {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.data = input.data || [
      {id: 'runid', run: 'run name'},
    ];

    fixture.componentInstance.headers = input.headers || [
      {
        name: 'run',
        type: ColumnHeaderType.RUN,
        displayName: 'Run',
        enabled: true,
      },
      {
        name: 'disabled_header',
        type: ColumnHeaderType.MAX_VALUE,
        displayName: 'disabled',
        enabled: false,
      },
      {
        name: 'other_header',
        type: ColumnHeaderType.HPARAM,
        displayName: 'Display This',
        enabled: true,
      },
    ];

    fixture.componentInstance.sortingInfo = input.sortingInfo || {
      name: 'test',
      order: SortingOrder.ASCENDING,
    };

    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableModule, MatIconTestingModule],
      declarations: [TestableComponent, RunsDataTable],
    }).compileComponents();
  });

  it('renders', () => {
    const fixture = createComponent({});
    expect(
      fixture.debugElement.query(By.directive(RunsDataTable))
    ).toBeTruthy();
  });

  it('projects enabled headers plus color column', () => {
    const fixture = createComponent({});
    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const headers = dataTable.queryAll(By.directive(HeaderCellComponent));

    expect(headers.length).toBe(3);
    expect(headers[0].componentInstance.header.name).toEqual('run');
    expect(headers[1].componentInstance.header.name).toEqual('other_header');
    expect(headers[2].componentInstance.header.name).toEqual('color');
  });

  it('projects content for each enabled header and color column', () => {
    const fixture = createComponent({
      data: [{id: 'runid', run: 'run name', color: 'red', other_header: 'foo'}],
    });
    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const cells = dataTable.queryAll(By.directive(ContentCellComponent));

    expect(cells.length).toBe(3);
    expect(cells[0].componentInstance.header.name).toEqual('run');
    expect(cells[1].componentInstance.header.name).toEqual('other_header');
    expect(cells[2].componentInstance.header.name).toEqual('color');
  });

  it('disables controls for color header', () => {
    const fixture = createComponent({});

    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const headers = dataTable.queryAll(By.directive(HeaderCellComponent));

    const colorHeader = headers.find(
      (h) => h.componentInstance.header.name === 'color'
    )!;

    expect(colorHeader.componentInstance.controlsEnabled).toBe(false);
  });
});
