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
  ColumnHeaders,
  SelectedStepRunData,
  SortingInfo,
  SortingOrder,
} from '../../metrics/views/card_renderer/scalar_card_types';
import {DataTableComponent} from './data_table_component';

@Component({
  selector: 'testable-comp',
  template: `
    <tb-data-table
      #DataTable
      [headers]="headers"
      [data]="data"
      [sortingInfo]="sortingInfo"
      [smoothingEnabled]="smoothingEnabled"
      (sortDataBy)="sortDataBy($event)"
      (orderColumns)="orderColumns($event)"
    ></tb-data-table>
  `,
})
class TestableComponent {
  @ViewChild('DataTable')
  dataTable!: DataTableComponent;

  @Input() headers!: ColumnHeaders[];
  @Input() data!: SelectedStepRunData[];
  @Input() sortingInfo!: SortingInfo;
  @Input() smoothingEnabled!: boolean;

  @Input() sortDataBy!: (sortingInfo: SortingInfo) => void;
  @Input() orderColumns!: (newOrder: ColumnHeaders[]) => void;
}

describe('data table', () => {
  let sortDataBySpy: jasmine.Spy;
  let orderColumnsSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, DataTableComponent],
      imports: [MatIconModule],
    }).compileComponents();
  });

  function createComponent(input: {
    headers?: ColumnHeaders[];
    data?: SelectedStepRunData[];
    sortingInfo?: SortingInfo;
    smoothingEnabled?: boolean;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.headers = input.headers || [];
    fixture.componentInstance.data = input.data || [];
    fixture.componentInstance.sortingInfo = input.sortingInfo || {
      header: ColumnHeaders.RUN,
      order: SortingOrder.ASCENDING,
    };

    fixture.componentInstance.smoothingEnabled =
      input.smoothingEnabled === undefined ? true : input.smoothingEnabled;

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

  it('displays given headers in order', () => {
    const fixture = createComponent({
      headers: [
        ColumnHeaders.VALUE,
        ColumnHeaders.RUN,
        ColumnHeaders.STEP,
        ColumnHeaders.RELATIVE_TIME,
        ColumnHeaders.VALUE_CHANGE,
        ColumnHeaders.START_STEP,
        ColumnHeaders.END_STEP,
        ColumnHeaders.START_VALUE,
        ColumnHeaders.END_VALUE,
        ColumnHeaders.MIN_VALUE,
        ColumnHeaders.MAX_VALUE,
        ColumnHeaders.PERCENTAGE_CHANGE,
        ColumnHeaders.SMOOTHED,
      ],
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));

    // The first header should always be blank as it is the run color column.
    expect(headerElements[0].nativeElement.innerText).toBe('');
    expect(headerElements[1].nativeElement.innerText).toBe('Value');
    expect(headerElements[2].nativeElement.innerText).toBe('Run');
    expect(headerElements[3].nativeElement.innerText).toBe('Step');
    expect(headerElements[4].nativeElement.innerText).toBe('Relative');
    expect(headerElements[5].nativeElement.innerText).toBe('Value');
    expect(
      headerElements[5]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('change_history_24px');
    expect(headerElements[6].nativeElement.innerText).toBe('Start Step');
    expect(headerElements[7].nativeElement.innerText).toBe('End Step');
    expect(headerElements[8].nativeElement.innerText).toBe('Start Value');
    expect(headerElements[9].nativeElement.innerText).toBe('End Value');
    expect(headerElements[10].nativeElement.innerText).toBe('Min');
    expect(headerElements[11].nativeElement.innerText).toBe('Max');
    expect(headerElements[12].nativeElement.innerText).toBe('%');
    expect(
      headerElements[12]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('change_history_24px');
    expect(headerElements[13].nativeElement.innerText).toBe('Smoothed');
  });

  it('displays data in order', () => {
    const fixture = createComponent({
      headers: [
        ColumnHeaders.VALUE,
        ColumnHeaders.RUN,
        ColumnHeaders.STEP,
        ColumnHeaders.RELATIVE_TIME,
        ColumnHeaders.VALUE_CHANGE,
        ColumnHeaders.START_STEP,
        ColumnHeaders.END_STEP,
        ColumnHeaders.START_VALUE,
        ColumnHeaders.END_VALUE,
        ColumnHeaders.MIN_VALUE,
        ColumnHeaders.MAX_VALUE,
        ColumnHeaders.PERCENTAGE_CHANGE,
        ColumnHeaders.SMOOTHED,
      ],
      data: [
        {
          id: 'someid',
          RUN: 'run name',
          VALUE: 3,
          STEP: 1,
          RELATIVE_TIME: 123,
          VALUE_CHANGE: -20,
          START_STEP: 5,
          END_STEP: 30,
          START_VALUE: 13,
          END_VALUE: 23,
          MIN_VALUE: 1,
          MAX_VALUE: 500,
          PERCENTAGE_CHANGE: 0.3,
          SMOOTHED: 2,
        },
      ],
    });
    fixture.detectChanges();
    const dataElements = fixture.debugElement.queryAll(By.css('td'));

    // The first header should always be blank as it is the run color column.
    expect(dataElements[0].nativeElement.innerText).toBe('');
    expect(dataElements[1].nativeElement.innerText).toBe('3');
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
    expect(dataElements[10].nativeElement.innerText).toBe('1');
    expect(dataElements[11].nativeElement.innerText).toBe('500');
    expect(dataElements[12].nativeElement.innerText).toBe('30%');
    expect(dataElements[12].queryAll(By.css('mat-icon')).length).toBe(1);
    expect(
      dataElements[12]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_upward_24px');
    expect(dataElements[13].nativeElement.innerText).toBe('2');
  });

  it('displays nothing when no data is available', () => {
    const fixture = createComponent({
      headers: [
        ColumnHeaders.VALUE,
        ColumnHeaders.RUN,
        ColumnHeaders.STEP,
        ColumnHeaders.RELATIVE_TIME,
      ],
      data: [{id: 'someid'}],
    });
    fixture.detectChanges();
    const dataElements = fixture.debugElement.queryAll(By.css('td'));

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
        ColumnHeaders.VALUE,
        ColumnHeaders.RUN,
        ColumnHeaders.STEP,
        ColumnHeaders.RELATIVE_TIME,
      ],
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));

    headerElements[3].triggerEventHandler('click', {});
    expect(sortDataBySpy).toHaveBeenCalledOnceWith({
      header: ColumnHeaders.STEP,
      order: SortingOrder.ASCENDING,
    });
  });

  it('emits sortDataBy event with DESCENDING when header that is currently sorted is clicked', () => {
    const fixture = createComponent({
      headers: [
        ColumnHeaders.VALUE,
        ColumnHeaders.RUN,
        ColumnHeaders.STEP,
        ColumnHeaders.RELATIVE_TIME,
      ],
      sortingInfo: {header: ColumnHeaders.STEP, order: SortingOrder.ASCENDING},
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));

    headerElements[3].triggerEventHandler('click', {});
    expect(sortDataBySpy).toHaveBeenCalledOnceWith({
      header: ColumnHeaders.STEP,
      order: SortingOrder.DESCENDING,
    });
  });

  it('keeps sorting arrow invisible unless sorting on that header', () => {
    const fixture = createComponent({
      headers: [ColumnHeaders.VALUE, ColumnHeaders.RUN, ColumnHeaders.STEP],
      sortingInfo: {header: ColumnHeaders.VALUE, order: SortingOrder.ASCENDING},
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));

    expect(
      headerElements[1]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show')
    ).toBe(true);
    expect(
      headerElements[1]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_upward_24px');
    expect(
      headerElements[2]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[2]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
    expect(
      headerElements[3]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[3]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
  });

  it('shows downward arrow when order is DESCENDING', () => {
    const fixture = createComponent({
      headers: [ColumnHeaders.VALUE, ColumnHeaders.RUN, ColumnHeaders.STEP],
      sortingInfo: {header: ColumnHeaders.STEP, order: SortingOrder.DESCENDING},
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));

    expect(
      headerElements[1]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[1]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
    expect(
      headerElements[2]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show')
    ).toBe(false);
    expect(
      headerElements[2]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show-on-hover')
    ).toBe(true);
    expect(
      headerElements[3]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.classList.contains('show')
    ).toBe(true);
    expect(
      headerElements[3]
        .queryAll(By.css('mat-icon'))[0]
        .nativeElement.getAttribute('svgIcon')
    ).toBe('arrow_downward_24px');
  });

  it('emits orderColumns with new order when dragged left', () => {
    const fixture = createComponent({
      headers: [ColumnHeaders.VALUE, ColumnHeaders.RUN, ColumnHeaders.STEP],
      sortingInfo: {header: ColumnHeaders.STEP, order: SortingOrder.DESCENDING},
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));

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
      ColumnHeaders.RUN,
      ColumnHeaders.VALUE,
      ColumnHeaders.STEP,
    ]);
  });

  it('emits orderColumns with new order when dragged right', () => {
    const fixture = createComponent({
      headers: [ColumnHeaders.VALUE, ColumnHeaders.RUN, ColumnHeaders.STEP],
      sortingInfo: {header: ColumnHeaders.STEP, order: SortingOrder.DESCENDING},
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));

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
      ColumnHeaders.VALUE,
      ColumnHeaders.STEP,
      ColumnHeaders.RUN,
    ]);
  });

  it('does not display Smoothed column when smoothingEnabled is false', () => {
    const fixture = createComponent({
      headers: [
        ColumnHeaders.VALUE,
        ColumnHeaders.RUN,
        ColumnHeaders.SMOOTHED,
        ColumnHeaders.STEP,
      ],
      data: [
        {
          id: 'someid',
          RUN: 'run name',
          VALUE: 3,
          STEP: 1,
          SMOOTHED: 2,
        },
      ],
      smoothingEnabled: false,
    });
    fixture.detectChanges();
    const headerElements = fixture.debugElement.queryAll(By.css('th'));
    const dataElements = fixture.debugElement.queryAll(By.css('td'));

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
});
