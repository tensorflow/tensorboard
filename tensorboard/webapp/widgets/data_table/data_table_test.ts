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

import {Component, Input, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatIconTestingModule} from '../../testing/mat_icon_module';
import {By} from '@angular/platform-browser';
import {
  ColumnHeader,
  ColumnHeaderType,
  TableData,
  SortingInfo,
  SortingOrder,
} from './types';
import {DataTableComponent} from './data_table_component';
import {DataTableModule} from './data_table_module';
import {HeaderCellComponent} from './header_cell_component';

@Component({
  selector: 'testable-comp',
  template: `
    <tb-data-table
      #DataTable
      [headers]="headers"
      [sortingInfo]="sortingInfo"
      (sortDataBy)="sortDataBy($event)"
      (orderColumns)="orderColumns($event)"
    >
      <ng-container header>
        <ng-container *ngFor="let header of headers">
          <tb-data-table-header-cell
            [header]="header"
            [sortingInfo]="sortingInfo"
            [hparamsEnabled]="hparamsEnabled"
          ></tb-data-table-header-cell> </ng-container
      ></ng-container>
    </tb-data-table>
  `,
})
class TestableComponent {
  @ViewChild('DataTable')
  dataTable!: DataTableComponent;

  @Input() headers!: ColumnHeader[];
  @Input() data!: TableData[];
  @Input() sortingInfo!: SortingInfo;
  @Input() smoothingEnabled!: boolean;

  @Input() sortDataBy!: (sortingInfo: SortingInfo) => void;
  @Input() orderColumns!: (newOrder: ColumnHeaderType[]) => void;
}

describe('data table', () => {
  let sortDataBySpy: jasmine.Spy;
  let orderColumnsSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        TestableComponent,
        DataTableComponent,
        HeaderCellComponent,
      ],
      imports: [MatIconTestingModule, DataTableModule],
    }).compileComponents();
  });

  function createComponent(input: {
    headers?: ColumnHeader[];
    sortingInfo?: SortingInfo;
    hparamsEnabled?: boolean;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.headers = input.headers || [];
    fixture.componentInstance.sortingInfo = input.sortingInfo || {
      name: 'run',
      order: SortingOrder.ASCENDING,
    };

    sortDataBySpy = jasmine.createSpy();
    fixture.componentInstance.sortDataBy = sortDataBySpy;

    orderColumnsSpy = jasmine.createSpy();
    fixture.componentInstance.orderColumns = orderColumnsSpy;

    return fixture;
  }

  it('renders', () => {
    const fixture = createComponent({});
    fixture.detectChanges();
    const dataTable = fixture.debugElement.query(By.css('.data-table'));
    expect(dataTable).toBeTruthy();
  });

  it('emits sortDataBy event when header emits headerClicked event', () => {
    const fixture = createComponent({
      headers: [
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RELATIVE_TIME,
          name: 'relativeTime',
          displayName: 'Relative',
          enabled: true,
        },
      ],
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.directive(HeaderCellComponent)
    );

    headerElements[3].componentInstance.headerClicked.emit('step');
    expect(sortDataBySpy).toHaveBeenCalledOnceWith({
      name: 'step',
      order: SortingOrder.ASCENDING,
    });
  });

  it('emits sortDataBy event with DESCENDING when header that is currently sorted emits headerClick event', () => {
    const fixture = createComponent({
      headers: [
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RELATIVE_TIME,
          name: 'relativeTime',
          displayName: 'Relative',
          enabled: true,
        },
      ],
      sortingInfo: {
        name: 'step',
        order: SortingOrder.ASCENDING,
      },
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.directive(HeaderCellComponent)
    );

    headerElements[3].componentInstance.headerClicked.emit('step');
    expect(sortDataBySpy).toHaveBeenCalledOnceWith({
      name: 'step',
      order: SortingOrder.DESCENDING,
    });
  });

  it('keeps sorting arrow invisible unless sorting on that header', () => {
    const fixture = createComponent({
      headers: [
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
      ],
      sortingInfo: {
        name: 'value',
        order: SortingOrder.ASCENDING,
      },
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.directive(HeaderCellComponent)
    );

    expect(
      headerElements[0]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(true);
    expect(
      headerElements[0]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_upward_24px');
    expect(
      headerElements[1]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[1]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
    expect(
      headerElements[2]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[2]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
  });

  it('shows downward arrow when order is DESCENDING', () => {
    const fixture = createComponent({
      headers: [
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
      ],
      sortingInfo: {
        name: 'step',
        order: SortingOrder.DESCENDING,
      },
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.directive(HeaderCellComponent)
    );

    expect(
      headerElements[0]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[0]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
    expect(
      headerElements[1]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[1]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
    expect(
      headerElements[2]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(true);
    expect(
      headerElements[2]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_downward_24px');
  });

  it('emits orderColumns with new order when dragged left', () => {
    const fixture = createComponent({
      headers: [
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
      ],
      sortingInfo: {
        name: 'step',
        order: SortingOrder.DESCENDING,
      },
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.directive(HeaderCellComponent)
    );

    headerElements[1].query(By.css('.cell')).triggerEventHandler('dragstart');
    headerElements[0].query(By.css('.cell')).triggerEventHandler('dragenter');
    fixture.detectChanges();
    expect(
      headerElements[0]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight')
    ).toBe(true);
    expect(
      headerElements[0]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight-border-left')
    ).toBe(true);
    headerElements[1].query(By.css('.cell')).triggerEventHandler('dragend');

    expect(orderColumnsSpy).toHaveBeenCalledOnceWith([
      {
        type: ColumnHeaderType.RUN,
        name: 'run',
        displayName: 'Run',
        enabled: true,
      },
      {
        type: ColumnHeaderType.VALUE,
        name: 'value',
        displayName: 'Value',
        enabled: true,
      },
      {
        type: ColumnHeaderType.STEP,
        name: 'step',
        displayName: 'Step',
        enabled: true,
      },
    ]);
  });

  it('emits orderColumns with new order when dragged right', () => {
    const fixture = createComponent({
      headers: [
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
      ],
      sortingInfo: {
        name: 'step',
        order: SortingOrder.DESCENDING,
      },
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.directive(HeaderCellComponent)
    );

    headerElements[1].query(By.css('.cell')).triggerEventHandler('dragstart');
    headerElements[2].query(By.css('.cell')).triggerEventHandler('dragenter');
    fixture.detectChanges();
    expect(
      headerElements[2]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight')
    ).toBe(true);
    expect(
      headerElements[2]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight-border-right')
    ).toBe(true);
    headerElements[1].query(By.css('.cell')).triggerEventHandler('dragend');

    expect(orderColumnsSpy).toHaveBeenCalledOnceWith([
      {
        type: ColumnHeaderType.VALUE,
        name: 'value',
        displayName: 'Value',
        enabled: true,
      },
      {
        type: ColumnHeaderType.STEP,
        name: 'step',
        displayName: 'Step',
        enabled: true,
      },
      {
        type: ColumnHeaderType.RUN,
        name: 'run',
        displayName: 'Run',
        enabled: true,
      },
    ]);
  });
});
