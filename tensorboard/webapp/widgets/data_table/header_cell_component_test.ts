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
  SortingInfo,
  SortingOrder,
} from './types';
import {DataTableModule} from './data_table_module';
import {HeaderCellComponent} from './header_cell_component';

@Component({
  selector: 'testable-comp',
  template: `
    <tb-data-table-header-cell
      [header]="header"
      [sortingInfo]="sortingInfo"
      (headerClicked)="headerClicked($event)"
    ></tb-data-table-header-cell>
  `,
})
class TestableComponent {
  @ViewChild('DataTable')
  headerCell!: HeaderCellComponent;

  @Input() header!: ColumnHeader;
  @Input() sortingInfo!: SortingInfo;

  @Input() headerClicked!: (sortingInfo: SortingInfo) => void;
}

describe('header cell', () => {
  let headerClickedSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, HeaderCellComponent],
      imports: [MatIconTestingModule, DataTableModule],
    }).compileComponents();
  });

  function createComponent(input: {
    header?: ColumnHeader;
    sortingInfo?: SortingInfo;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.header = input.header || {
      name: 'run',
      displayName: 'Run',
      type: ColumnHeaderType.RUN,
      enabled: true,
    };
    fixture.componentInstance.sortingInfo = input.sortingInfo || {
      name: 'run',
      order: SortingOrder.ASCENDING,
    };

    headerClickedSpy = jasmine.createSpy();
    fixture.componentInstance.headerClicked = headerClickedSpy;

    return fixture;
  }

  it('renders', () => {
    const fixture = createComponent({});
    fixture.detectChanges();
    const cell = fixture.debugElement.query(By.css('.cell'));
    expect(cell).toBeTruthy();
  });

  it('emits headerClicked event when cell element is clicked', () => {
    const fixture = createComponent({});
    fixture.detectChanges();
    fixture.debugElement
      .query(By.directive(HeaderCellComponent))
      .componentInstance.headerClicked.subscribe();
    fixture.debugElement.query(By.css('.cell')).nativeElement.click();
    expect(headerClickedSpy).toHaveBeenCalledOnceWith('run');
  });
});
