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
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatIconTestingModule} from '../../testing/mat_icon_module';
import {By} from '@angular/platform-browser';
import {ColumnHeader, ColumnHeaderType} from './types';
import {DataTableModule} from './data_table_module';
import {ContentCellComponent} from './content_cell_component';

@Component({
  standalone: false,
  selector: 'testable-comp',
  template: `
    <tb-data-table-content-cell
      [header]="header"
      [datum]="datum"
    ></tb-data-table-content-cell>
  `,
})
class TestableComponent {
  @ViewChild('DataTable')
  contentCell!: ContentCellComponent;

  @Input() header!: ColumnHeader;
  @Input() datum!: string | number;
}

describe('header cell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, ContentCellComponent],
      imports: [MatIconTestingModule, DataTableModule],
    }).compileComponents();
  });

  function createComponent(input: {
    header?: ColumnHeader;
    datum?: string | number;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.header = input.header || {
      name: 'run',
      displayName: 'Run',
      type: ColumnHeaderType.RUN,
      enabled: true,
    };
    fixture.componentInstance.datum = input.datum || '';

    return fixture;
  }

  it('renders', () => {
    const fixture = createComponent({});
    fixture.detectChanges();
    const cell = fixture.debugElement.query(By.css('.cell'));
    expect(cell).toBeTruthy();
  });

  it('renders datum', () => {
    const fixture = createComponent({datum: 'test datum'});
    fixture.detectChanges();
    const cell = fixture.debugElement.query(By.css('.cell'));
    expect(cell.nativeElement.innerText).toEqual('test datum');
  });

  it('renders up arrow for cells with PercentageChange header type and positive datum', () => {
    const fixture = createComponent({
      header: {
        name: 'percentageChange',
        displayName: '%',
        type: ColumnHeaderType.PERCENTAGE_CHANGE,
        enabled: true,
      },
      datum: 1,
    });
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('mat-icon'));
    expect(icon.nativeElement.getAttribute('svgIcon')).toBe(
      'arrow_upward_24px'
    );
  });

  it('renders down arrow for cells with PercentageChange header type and negative datum', () => {
    const fixture = createComponent({
      header: {
        name: 'percentageChange',
        displayName: '%',
        type: ColumnHeaderType.PERCENTAGE_CHANGE,
        enabled: true,
      },
      datum: -1,
    });
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('mat-icon'));
    expect(icon.nativeElement.getAttribute('svgIcon')).toBe(
      'arrow_downward_24px'
    );
  });

  it('renders up arrow for cells with ValueChange header type and positive datum', () => {
    const fixture = createComponent({
      header: {
        name: 'valueChange',
        displayName: '%',
        type: ColumnHeaderType.PERCENTAGE_CHANGE,
        enabled: true,
      },
      datum: 1,
    });
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('mat-icon'));
    expect(icon.nativeElement.getAttribute('svgIcon')).toBe(
      'arrow_upward_24px'
    );
  });

  it('renders down arrow for cells with ValueChange header type and negative datum', () => {
    const fixture = createComponent({
      header: {
        name: 'valueChange',
        displayName: '%',
        type: ColumnHeaderType.VALUE_CHANGE,
        enabled: true,
      },
      datum: -1,
    });
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('mat-icon'));
    expect(icon.nativeElement.getAttribute('svgIcon')).toBe(
      'arrow_downward_24px'
    );
  });
});
