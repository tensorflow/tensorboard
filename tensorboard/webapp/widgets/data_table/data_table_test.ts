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
import {MatIconModule} from '@angular/material/icon';
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

@Component({
  selector: 'testable-comp',
  template: `
    <tb-data-table
      #DataTable
      [headers]="headers"
      [data]="data"
      [sortingInfo]="sortingInfo"
      [smoothingEnabled]="smoothingEnabled"
      [hparamsEnabled]="hparamsEnabled"
      (sortDataBy)="sortDataBy($event)"
      (orderColumns)="orderColumns($event)"
      (removeColumn)="removeColumn($event)"
    ></tb-data-table>
  `,
})
class TestableComponent {
  @ViewChild('DataTable')
  dataTable!: DataTableComponent;

  @Input() headers!: ColumnHeader[];
  @Input() data!: TableData[];
  @Input() sortingInfo!: SortingInfo;
  @Input() smoothingEnabled!: boolean;
  @Input() hparamsEnabled!: boolean;

  @Input() sortDataBy!: (sortingInfo: SortingInfo) => void;
  @Input() orderColumns!: (newOrder: ColumnHeaderType[]) => void;
  @Input() removeColumn!: (headerType: ColumnHeaderType) => void;
}

describe('data table', () => {
  let sortDataBySpy: jasmine.Spy;
  let orderColumnsSpy: jasmine.Spy;
  let removeColumnSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, DataTableComponent],
      imports: [MatIconModule, DataTableModule],
    }).compileComponents();
  });

  function createComponent(input: {
    headers?: ColumnHeader[];
    data?: TableData[];
    sortingInfo?: SortingInfo;
    smoothingEnabled?: boolean;
    hparamsEnabled?: boolean;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.headers = input.headers || [];
    fixture.componentInstance.data = input.data || [];
    fixture.componentInstance.sortingInfo = input.sortingInfo || {
      name: 'run',
      order: SortingOrder.ASCENDING,
    };

    fixture.componentInstance.smoothingEnabled =
      input.smoothingEnabled === undefined ? true : input.smoothingEnabled;

    sortDataBySpy = jasmine.createSpy();
    fixture.componentInstance.sortDataBy = sortDataBySpy;

    orderColumnsSpy = jasmine.createSpy();
    fixture.componentInstance.orderColumns = orderColumnsSpy;

    removeColumnSpy = jasmine.createSpy();
    fixture.componentInstance.removeColumn = removeColumnSpy;

    return fixture;
  }

  it('renders', () => {
    const fixture = createComponent({});
    fixture.detectChanges();
    const dataTable = fixture.debugElement.query(By.css('.data-table'));
    expect(dataTable).toBeTruthy();
  });

  it('displays given headers in order', () => {
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
          type: ColumnHeaderType.VALUE_CHANGE,
          name: 'valueChanged',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.PERCENTAGE_CHANGE,
          name: 'percentageChanged',
          displayName: '%',
          enabled: true,
        },
        {
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
        },
      ],
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.css('.header > .col')
    );

    // The first header should always be blank as it is the run color column.
    expect(headerElements[0].nativeElement.innerText).toBe('');
    expect(headerElements[1].nativeElement.innerText).toBe('Value');
    expect(headerElements[2].nativeElement.innerText).toBe('Run');
    expect(headerElements[3].nativeElement.innerText).toBe('Value');
    expect(
      headerElements[3]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('change_history_24px');
    expect(headerElements[4].nativeElement.innerText).toBe('%');
    expect(
      headerElements[4]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('change_history_24px');
    expect(headerElements[5].nativeElement.innerText).toBe('Smoothed');
  });

  it('displays data in order', () => {
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
        {
          type: ColumnHeaderType.VALUE_CHANGE,
          name: 'valueChange',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.START_STEP,
          name: 'startStep',
          displayName: 'Start Step',
          enabled: true,
        },
        {
          type: ColumnHeaderType.END_STEP,
          name: 'endStep',
          displayName: 'End Step',
          enabled: true,
        },
        {
          type: ColumnHeaderType.START_VALUE,
          name: 'startValue',
          displayName: 'Start Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.END_VALUE,
          name: 'endValue',
          displayName: 'End Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MIN_VALUE,
          name: 'minValue',
          displayName: 'Min',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MAX_VALUE,
          name: 'maxValue',
          displayName: 'max',
          enabled: true,
        },
        {
          type: ColumnHeaderType.PERCENTAGE_CHANGE,
          name: 'percentageChange',
          displayName: '%',
          enabled: true,
        },
        {
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
        },
      ],
      data: [
        {
          id: 'someid',
          run: 'run name',
          value: 31415926535,
          step: 1,
          relativeTime: 123,
          valueChange: -20,
          startStep: 5,
          endStep: 30,
          startValue: 13,
          endValue: 23,
          minValue: 0.12345,
          maxValue: 89793238462,
          percentageChange: 0.3,
          smoothed: 3.14e10,
        },
      ],
    });
    fixture.detectChanges();
    const dataElements = fixture.debugElement.queryAll(By.css('.row > .col'));

    // The first header should always be blank as it is the run color column.
    expect(dataElements[0].nativeElement.innerText).toBe('');
    expect(dataElements[1].nativeElement.innerText).toBe('31,415,926,535');
    expect(dataElements[2].nativeElement.innerText).toBe('run name');
    expect(dataElements[3].nativeElement.innerText).toBe('1');
    expect(dataElements[4].nativeElement.innerText).toBe('123 ms');
    expect(dataElements[5].nativeElement.innerText).toBe('20');
    expect(dataElements[5].queryAll(By.css('mat-icon')).length).toBe(1);
    expect(
      dataElements[5]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_downward_24px');
    expect(dataElements[6].nativeElement.innerText).toBe('5');
    expect(dataElements[7].nativeElement.innerText).toBe('30');
    expect(dataElements[8].nativeElement.innerText).toBe('13');
    expect(dataElements[9].nativeElement.innerText).toBe('23');
    expect(dataElements[10].nativeElement.innerText).toBe('0.1235');
    expect(dataElements[11].nativeElement.innerText).toBe('89,793,238,462');
    expect(dataElements[12].nativeElement.innerText).toBe('30%');
    expect(dataElements[12].queryAll(By.css('mat-icon')).length).toBe(1);
    expect(
      dataElements[12]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_upward_24px');
    expect(dataElements[13].nativeElement.innerText).toBe('31,400,000,000');
  });

  it('does not displays headers or data when header is disabled', () => {
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
          enabled: false,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
      ],
      data: [
        {
          id: 'someid',
          run: 'run name',
          value: 3,
          step: 1,
        },
      ],
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.css('.header > .col')
    );
    const dataElements = fixture.debugElement.queryAll(By.css('.row > .col'));

    // The first header should always be blank as it is the run color column.
    expect(headerElements[0].nativeElement.innerText).toBe('');
    expect(headerElements[1].nativeElement.innerText).toBe('Value');
    expect(headerElements[2].nativeElement.innerText).toBe('Step');

    // The first column should always be blank as it is the run color column.
    expect(dataElements[0].nativeElement.innerText).toBe('');
    expect(dataElements[1].nativeElement.innerText).toBe('3');
    expect(dataElements[2].nativeElement.innerText).toBe('1');
  });

  it('displays nothing when no data is available', () => {
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
      data: [{id: 'someid'}],
    });
    fixture.detectChanges();
    const dataElements = fixture.debugElement.queryAll(By.css('.row > .col'));

    // The first header should always be blank as it is the run color column.
    expect(dataElements[0].nativeElement.innerText).toBe('');
    expect(dataElements[1].nativeElement.innerText).toBe('');
    expect(dataElements[2].nativeElement.innerText).toBe('');
    expect(dataElements[3].nativeElement.innerText).toBe('');
    expect(dataElements[4].nativeElement.innerText).toBe('');
  });

  it('emits sortDataBy event when header clicked', () => {
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
      By.css('.header > .col')
    );

    headerElements[3].triggerEventHandler('click', {});
    expect(sortDataBySpy).toHaveBeenCalledOnceWith({
      name: 'step',
      order: SortingOrder.ASCENDING,
    });
  });

  it('emits sortDataBy event with DESCENDING when header that is currently sorted is clicked', () => {
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
      By.css('.header > .col')
    );

    headerElements[3].triggerEventHandler('click', {});
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
      By.css('.header > .col')
    );

    expect(
      headerElements[1]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(true);
    expect(
      headerElements[1]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_upward_24px');
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
    expect(
      headerElements[3]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[3]
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
      By.css('.header > .col')
    );

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
    expect(
      headerElements[3]
        .query(By.css('.sorting-icon-container mat-icon'))
        .nativeElement.classList.contains('show')
    ).toBe(true);
    expect(
      headerElements[3]
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
      By.css('.header > .col')
    );

    headerElements[2].query(By.css('.cell')).triggerEventHandler('dragstart');
    headerElements[1].query(By.css('.cell')).triggerEventHandler('dragenter');
    fixture.detectChanges();
    expect(
      headerElements[1]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight')
    ).toBe(true);
    expect(
      headerElements[1]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight-border-left')
    ).toBe(true);
    headerElements[2].query(By.css('.cell')).triggerEventHandler('dragend');

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
      By.css('.header > .col')
    );

    headerElements[2].query(By.css('.cell')).triggerEventHandler('dragstart');
    headerElements[3].query(By.css('.cell')).triggerEventHandler('dragenter');
    fixture.detectChanges();
    expect(
      headerElements[3]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight')
    ).toBe(true);
    expect(
      headerElements[3]
        .query(By.css('.cell'))
        .nativeElement.classList.contains('highlight-border-right')
    ).toBe(true);
    headerElements[2].query(By.css('.cell')).triggerEventHandler('dragend');

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

  it('does not display Smoothed column when smoothingEnabled is false', () => {
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
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
        },
        {
          type: ColumnHeaderType.STEP,
          name: 'step',
          displayName: 'Step',
          enabled: true,
        },
      ],
      data: [
        {
          id: 'someid',
          run: 'run name',
          value: 3,
          step: 1,
          smoothed: 2,
        },
      ],
      smoothingEnabled: false,
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(
      By.css('.header > .col')
    );
    const dataElements = fixture.debugElement.queryAll(By.css('.row > .col'));

    // The first header should always be blank as it is the run color column.
    expect(headerElements[0].nativeElement.innerText).toBe('');
    expect(headerElements[1].nativeElement.innerText).toBe('Value');
    expect(headerElements[2].nativeElement.innerText).toBe('Run');
    expect(headerElements[3].nativeElement.innerText).toBe('Step');
    expect(headerElements.length).toBe(4);

    expect(dataElements[0].nativeElement.innerText).toBe('');
    expect(dataElements[1].nativeElement.innerText).toBe('3');
    expect(dataElements[2].nativeElement.innerText).toBe('run name');
    expect(dataElements[3].nativeElement.innerText).toBe('1');
    expect(dataElements.length).toBe(4);
  });

  describe('delete column button', () => {
    it('emits removeColumn event when delete button clicked', () => {
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
      fixture.componentInstance.hparamsEnabled = true;
      fixture.detectChanges();
      const headerElements = fixture.debugElement.queryAll(
        By.css('.header > .col')
      );

      headerElements[3]
        .query(By.css('.delete-icon'))
        .triggerEventHandler('click', {});
      expect(removeColumnSpy).toHaveBeenCalledOnceWith({
        headerType: ColumnHeaderType.STEP,
      });
    });

    it('renders delete button when hparam flag is on', () => {
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
      fixture.componentInstance.hparamsEnabled = true;
      fixture.detectChanges();
      const headerElements = fixture.debugElement.queryAll(
        By.css('.header > .col')
      );

      expect(headerElements[3].query(By.css('.delete-icon'))).toBeTruthy();
    });

    it('does not render delete button when hparam flag is off', () => {
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
      fixture.componentInstance.hparamsEnabled = false;
      fixture.detectChanges();
      const headerElements = fixture.debugElement.queryAll(
        By.css('.header > .col')
      );

      expect(headerElements[3].query(By.css('.delete-icon'))).toBeFalsy();
    });
  });
});
