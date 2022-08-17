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
} from '../../metrics/views/card_renderer/scalar_card_types';
import {DataTableComponent} from './data_table_component';

@Component({
  selector: 'testable-comp',
  template: `
    <tb-data-table #DataTable [headers]="headers" [data]="data"></tb-data-table>
  `,
})
class TestableComponent {
  @ViewChild('DataTable')
  dataTable!: DataTableComponent;

  @Input() headers!: ColumnHeaders[];
  @Input() data!: SelectedStepRunData[];
}

describe('data table', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, DataTableComponent],
      imports: [MatIconModule],
    }).compileComponents();
  });

  function createComponent(input: {
    headers?: ColumnHeaders[];
    data?: SelectedStepRunData[];
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.headers = input.headers || [];
    fixture.componentInstance.data = input.data || [];

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
    expect(headerElements[5].nativeElement.innerText).toBe('Value Change');
    expect(headerElements[6].nativeElement.innerText).toBe('Start Step');
    expect(headerElements[7].nativeElement.innerText).toBe('End Step');
    expect(headerElements[8].nativeElement.innerText).toBe('Start');
    expect(headerElements[9].nativeElement.innerText).toBe('End');
    expect(headerElements[10].nativeElement.innerText).toBe('Min');
    expect(headerElements[11].nativeElement.innerText).toBe('Max');
    expect(headerElements[12].nativeElement.innerText).toBe(
      'Percentage Change'
    );
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
      ],
      data: [
        {
          RUN: 'run name',
          VALUE: 3,
          STEP: 1,
          RELATIVE_TIME: 123,
          VALUE_CHANGE: 20,
          START_STEP: 5,
          END_STEP: 30,
          START_VALUE: 13,
          END_VALUE: 23,
          MIN_VALUE: 1,
          MAX_VALUE: 500,
          PERCENTAGE_CHANGE: 0.3,
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
    expect(dataElements[5].nativeElement.innerText).toBe(' 20'); // space before the value is kept for down or up arrow
    expect(dataElements[6].nativeElement.innerText).toBe('5');
    expect(dataElements[7].nativeElement.innerText).toBe('30');
    expect(dataElements[8].nativeElement.innerText).toBe('13');
    expect(dataElements[9].nativeElement.innerText).toBe('23');
    expect(dataElements[10].nativeElement.innerText).toBe('1');
    expect(dataElements[11].nativeElement.innerText).toBe('500');
    expect(dataElements[12].nativeElement.innerText).toBe(' 30%'); // space before the percentage is kept for down or up arrow
    expect;
  });

  it('displays nothing when no data is available', () => {
    const fixture = createComponent({
      headers: [
        ColumnHeaders.VALUE,
        ColumnHeaders.RUN,
        ColumnHeaders.STEP,
        ColumnHeaders.RELATIVE_TIME,
      ],
      data: [{}],
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
});
