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

import {Component, Input, NO_ERRORS_SCHEMA, ViewChild} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {RunsDataTable} from './runs_data_table';
import {DataTableModule} from '../../../widgets/data_table/data_table_module';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {MatCheckboxModule} from '@angular/material/checkbox';
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
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {sendKeys} from '../../../testing/dom';

@Component({
  standalone: false,
  selector: 'testable-comp',
  template: `
    <runs-data-table
      [data]="data"
      [headers]="headers"
      [sortingInfo]="sortingInfo"
      (sortDataBy)="sortDataBy($event)"
      (orderColumns)="orderColumns($event)"
      (onSelectionToggle)="onSelectionToggle($event)"
      (onAllSelectionToggle)="onAllSelectionToggle($event)"
      (onRegexFilterChange)="onRegexFilterChange($event)"
      (onSelectionDblClick)="onSelectionDblClick($event)"
    ></runs-data-table>
  `,
})
class TestableComponent {
  @ViewChild('RunsDataTable')
  dataTable!: RunsDataTable;

  @Input() headers!: ColumnHeader[];
  @Input() data!: TableData[];
  @Input() sortingInfo!: SortingInfo;

  @Input() onSelectionToggle!: (runId: string) => void;
  @Input() onAllSelectionToggle!: (runIds: string[]) => void;
  @Input() onRegexFilterChange!: (regex: string) => void;
  @Input() onSelectionDblClick!: (runId: string) => void;
}

describe('runs_data_table', () => {
  let onSelectionToggleSpy: jasmine.Spy;
  let onAllSelectionToggleSpy: jasmine.Spy;
  let onSelectionDblClickSpy: jasmine.Spy;
  let onRegexFilterChangeSpy: jasmine.Spy;
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

    onSelectionToggleSpy = jasmine.createSpy();
    fixture.componentInstance.onSelectionToggle = onSelectionToggleSpy;

    onAllSelectionToggleSpy = jasmine.createSpy();
    fixture.componentInstance.onAllSelectionToggle = onAllSelectionToggleSpy;

    onSelectionDblClickSpy = jasmine.createSpy();
    fixture.componentInstance.onSelectionDblClick = onSelectionDblClickSpy;

    onRegexFilterChangeSpy = jasmine.createSpy();
    fixture.componentInstance.onRegexFilterChange = onRegexFilterChangeSpy;

    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DataTableModule,
        FilterInputModule,
        MatIconTestingModule,
        MatCheckboxModule,
      ],
      declarations: [TestableComponent, RunsDataTable],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  afterAll(() => {
    // These elements are being left in the dom from the tooltip. Removing them
    // to prevent them from affecting other tests.
    document
      .querySelectorAll('.cdk-describedby-message-container')
      .forEach((el) => {
        el.remove();
      });
  });

  it('renders', () => {
    const fixture = createComponent({});
    expect(
      fixture.debugElement.query(By.directive(RunsDataTable))
    ).toBeTruthy();
  });

  it('projects headers plus color and selected column', () => {
    const fixture = createComponent({});
    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const headers = dataTable.queryAll(By.directive(HeaderCellComponent));

    expect(headers.length).toBe(5);
    expect(headers[0].componentInstance.header.name).toEqual('selected');
    expect(headers[1].componentInstance.header.name).toEqual('run');
    expect(headers[2].componentInstance.header.name).toEqual('disabled_header');
    expect(headers[3].componentInstance.header.name).toEqual('other_header');
    expect(headers[4].componentInstance.header.name).toEqual('color');
  });

  it('projects content for each header, selected, and color column', () => {
    const fixture = createComponent({
      data: [{id: 'runid', run: 'run name', color: 'red', other_header: 'foo'}],
    });
    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const cells = dataTable.queryAll(By.directive(ContentCellComponent));

    expect(cells.length).toBe(5);
    expect(cells[0].componentInstance.header.name).toEqual('selected');
    expect(cells[1].componentInstance.header.name).toEqual('run');
    expect(cells[2].componentInstance.header.name).toEqual('disabled_header');
    expect(cells[3].componentInstance.header.name).toEqual('other_header');
    expect(cells[4].componentInstance.header.name).toEqual('color');
  });

  describe('color column', () => {
    it('renders group by control in color header', () => {
      const fixture = createComponent({});

      const dataTable = fixture.debugElement.query(
        By.directive(DataTableComponent)
      );
      const headers = dataTable.queryAll(By.directive(HeaderCellComponent));

      const colorHeader = headers.find(
        (h) => h.componentInstance.header.name === 'color'
      )!;

      expect(colorHeader.query(By.css('runs-group-menu-button'))).toBeTruthy();
    });

    it('renders color picker button in color content cells', () => {
      const fixture = createComponent({});

      const dataTable = fixture.debugElement.query(
        By.directive(DataTableComponent)
      );
      const cells = dataTable.queryAll(By.directive(ContentCellComponent));

      const colorCells = cells.filter((cell) => {
        return cell.componentInstance.header.name === 'color';
      });

      expect(colorCells.length).toBe(1);

      colorCells.forEach((cell) => {
        // This only tests that the button with the same class as the color
        // picker button is rendered. Technically there could be another button
        // with the same class here and it would still pass.
        expect(cell.query(By.css('button.run-color-swatch'))).toBeTruthy();
      });
    });

    // If the call to extendHeaders produces a new color header on each call, then
    // the content gets re-rendered when the color picker opens. This causes the
    // color picker modal to close immediately. This test ensures that we keep
    // the same reference to the color header and continue to use that reference
    // instead of creating a new one on each call.
    it('extendHeaders does not produce new color header on each call', () => {
      const fixture = createComponent({});
      const runsDataTable = fixture.debugElement.query(
        By.directive(RunsDataTable)
      );
      const {headers} = runsDataTable.componentInstance;

      expect(
        runsDataTable.componentInstance
          .extendHeaders(headers)
          .find((header: ColumnHeader) => header.name === 'color')
      ).toBe(
        runsDataTable.componentInstance
          .extendHeaders(headers)
          .find((header: ColumnHeader) => header.name === 'color')
      );
    });
  });

  it('adds checkbox to selected column', () => {
    const fixture = createComponent({});

    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const headers = dataTable.queryAll(By.directive(HeaderCellComponent));
    const cells = dataTable.queryAll(By.directive(ContentCellComponent));

    const selectedHeader = headers.find(
      (h) => h.componentInstance.header.name === 'selected'
    )!;

    const selectedContentCells = cells.filter((cell) => {
      return cell.componentInstance.header.name === 'selected';
    });

    expect(selectedHeader.query(By.css('mat-checkbox'))).toBeTruthy();

    expect(selectedContentCells.length).toBe(1);
    selectedContentCells.forEach((cell) => {
      expect(cell.query(By.css('mat-checkbox'))).toBeTruthy();
    });
  });

  it('adds ExperimentAlias widget on experimentAlias column', () => {
    const fixture = createComponent({
      headers: [
        {
          name: 'experimentAlias',
          type: ColumnHeaderType.CUSTOM,
          displayName: 'Experiment Alias',
          enabled: true,
        },
      ],
    });

    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );

    const cells = dataTable.queryAll(By.directive(ContentCellComponent));

    const selectedContentCells = cells.filter((cell) => {
      return cell.componentInstance.header.name === 'experimentAlias';
    });

    expect(selectedContentCells.length).toBe(1);
    selectedContentCells.forEach((cell) => {
      expect(cell.query(By.css('tb-experiment-alias'))).toBeTruthy();
    });
  });

  it('emits onAllSelectionToggle event when selected header checkbox is clicked', () => {
    const fixture = createComponent({});

    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const headers = dataTable.queryAll(By.directive(HeaderCellComponent));

    const selectedHeader = headers.find(
      (h) => h.componentInstance.header.name === 'selected'
    )!;

    const selectedCheckbox = selectedHeader.query(By.css('mat-checkbox'));

    selectedCheckbox.nativeElement.dispatchEvent(new MouseEvent('click'));

    expect(onAllSelectionToggleSpy).toHaveBeenCalledWith(['runid']);
  });

  it('emits onSelectionToggle event when selected content checkbox is clicked', () => {
    const fixture = createComponent({});

    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const cells = dataTable.queryAll(By.directive(ContentCellComponent));

    const selectedContentCells = cells.filter((cell) => {
      return cell.componentInstance.header.name === 'selected';
    });

    const firstCheckbox = selectedContentCells[0].query(By.css('mat-checkbox'));

    firstCheckbox.nativeElement.dispatchEvent(
      new MouseEvent('click', {detail: 1})
    );

    expect(onSelectionToggleSpy).toHaveBeenCalledWith('runid');
  });

  it('emits onSelectionDblClick event when selected header checkbox is double clicked', () => {
    const fixture = createComponent({});

    const dataTable = fixture.debugElement.query(
      By.directive(DataTableComponent)
    );
    const cells = dataTable.queryAll(By.directive(ContentCellComponent));

    const selectedContentCells = cells.filter((cell) => {
      return cell.componentInstance.header.name === 'selected';
    });

    const firstCheckbox = selectedContentCells[0].query(By.css('mat-checkbox'));
    firstCheckbox.nativeElement.dispatchEvent(
      new MouseEvent('click', {detail: 2})
    );

    expect(onSelectionDblClickSpy).toHaveBeenCalledWith('runid');
  });

  it('fire onRegexFilterChange when input is entered into the tb-filter-input', () => {
    const fixture = createComponent({});
    const filterInput = fixture.debugElement.query(By.css('tb-filter-input'));

    expect(filterInput).toBeTruthy();

    sendKeys(fixture, filterInput.query(By.css('input')), 'myRegex');

    expect(onRegexFilterChangeSpy).toHaveBeenCalledWith('myRegex');
  });

  it('trackByRuns serializes data while ignoring color', () => {
    const fixture = createComponent({});
    const dataTable = fixture.debugElement.query(By.directive(RunsDataTable));
    expect(
      dataTable.componentInstance.trackByRuns(0, {
        id: 'run1',
        color: 'orange',
        hparam1: 1.234,
      })
    ).toEqual(
      JSON.stringify({
        id: 'run1',
        hparam1: 1.234,
      })
    );
  });
});
