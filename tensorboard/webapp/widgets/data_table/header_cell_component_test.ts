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
      [hparamsEnabled]="hparamsEnabled"
      [controlsEnabled]="controlsEnabled"
      (headerClicked)="headerClicked($event)"
      (deleteButtonClicked)="deleteButtonClicked($event)"
    ></tb-data-table-header-cell>
  `,
})
class TestableComponent {
  @ViewChild('DataTable')
  headerCell!: HeaderCellComponent;

  @Input() header!: ColumnHeader;
  @Input() sortingInfo!: SortingInfo;
  @Input() hparamsEnabled!: boolean;
  @Input() controlsEnabled!: boolean;

  @Input() headerClicked!: (sortingInfo: SortingInfo) => void;
  @Input() deleteButtonClicked!: (header: ColumnHeader) => void;
}

describe('header cell', () => {
  let headerClickedSpy: jasmine.Spy;
  let deleteButtonClickedSpy: jasmine.Spy;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, HeaderCellComponent],
      imports: [MatIconTestingModule, DataTableModule],
    }).compileComponents();
  });

  function createComponent(input: {
    header?: ColumnHeader;
    sortingInfo?: SortingInfo;
    hparamsEnabled?: boolean;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);

    fixture.componentInstance.header = input.header || {
      name: 'run',
      displayName: 'Run',
      type: ColumnHeaderType.RUN,
      enabled: true,
      sortable: true,
      removable: true,
      movable: true,
    };
    fixture.componentInstance.sortingInfo = input.sortingInfo || {
      name: 'run',
      order: SortingOrder.ASCENDING,
    };
    fixture.componentInstance.hparamsEnabled = input.hparamsEnabled ?? true;

    headerClickedSpy = jasmine.createSpy();
    fixture.componentInstance.headerClicked = headerClickedSpy;

    deleteButtonClickedSpy = jasmine.createSpy();
    fixture.componentInstance.deleteButtonClicked = deleteButtonClickedSpy;

    fixture.detectChanges();
    return fixture;
  }

  it('renders', () => {
    const fixture = createComponent({});
    const cell = fixture.debugElement.query(By.css('.cell'));
    expect(cell).toBeTruthy();
  });

  it('emits headerClicked event when cell element is clicked', () => {
    const fixture = createComponent({});
    fixture.debugElement
      .query(By.directive(HeaderCellComponent))
      .componentInstance.headerClicked.subscribe();
    fixture.debugElement.query(By.css('.cell')).nativeElement.click();
    expect(headerClickedSpy).toHaveBeenCalledOnceWith('run');
  });

  it('does not emits headerClicked event when cell element is clicked with removable set to false', () => {
    const fixture = createComponent({
      header: {
        name: 'run',
        displayName: 'Run',
        type: ColumnHeaderType.RUN,
        enabled: true,
        sortable: false,
      },
    });
    fixture.debugElement
      .query(By.directive(HeaderCellComponent))
      .componentInstance.headerClicked.subscribe();
    fixture.debugElement.query(By.css('.cell')).nativeElement.click();
    expect(headerClickedSpy).not.toHaveBeenCalled();
  });

  describe('delete column button', () => {
    it('emits removeColumn event when delete button clicked', () => {
      const fixture = createComponent({hparamsEnabled: true});
      fixture.debugElement
        .query(By.directive(HeaderCellComponent))
        .componentInstance.deleteButtonClicked.subscribe();
      fixture.debugElement
        .query(By.css('.delete-icon'))
        .triggerEventHandler('click', {});

      expect(deleteButtonClickedSpy).toHaveBeenCalledOnceWith({
        name: 'run',
        displayName: 'Run',
        type: ColumnHeaderType.RUN,
        enabled: true,
        sortable: true,
        removable: true,
        movable: true,
      });
    });

    it('renders delete button when hparamsEnabled is true', () => {
      const fixture = createComponent({hparamsEnabled: true});

      expect(fixture.debugElement.query(By.css('.delete-icon'))).toBeTruthy();
    });

    it('does not render delete button when hparamsEnabled is false', () => {
      const fixture = createComponent({hparamsEnabled: false});

      expect(fixture.debugElement.query(By.css('.delete-icon'))).toBeFalsy();
    });

    it('does not render delete button when removable is false', () => {
      const fixture = createComponent({
        header: {
          name: 'run',
          displayName: 'Run',
          type: ColumnHeaderType.RUN,
          enabled: true,
          removable: false,
        },
      });

      expect(fixture.debugElement.query(By.css('.delete-icon'))).toBeFalsy();
    });
  });

  describe('sorting icon', () => {
    it('shows sorting icon when sortingInfo matches header', () => {
      const fixture = createComponent({
        sortingInfo: {
          name: 'run',
          order: SortingOrder.ASCENDING,
        },
      });

      expect(
        fixture.debugElement
          .query(By.css('.sorting-icon-container mat-icon'))
          .nativeElement.classList.contains('show')
      ).toBe(true);
    });

    it('does not render sorting icon when sortingInfo does not match header', () => {
      const fixture = createComponent({
        sortingInfo: {
          name: 'not-this-header',
          order: SortingOrder.ASCENDING,
        },
      });

      expect(
        fixture.debugElement
          .query(By.css('.sorting-icon-container mat-icon'))
          .nativeElement.classList.contains('show')
      ).toBe(false);
    });

    it('renders downward arrow if order is DESCENDING', () => {
      const fixture = createComponent({
        sortingInfo: {
          name: 'run',
          order: SortingOrder.DESCENDING,
        },
      });

      expect(
        fixture.debugElement
          .query(By.css('.sorting-icon-container mat-icon'))
          .nativeElement.getAttribute('svgIcon')
      ).toBe('arrow_downward_24px');
    });

    it('renders downward arrow if order is DESCENDING', () => {
      const fixture = createComponent({
        sortingInfo: {
          name: 'run',
          order: SortingOrder.ASCENDING,
        },
      });

      expect(
        fixture.debugElement
          .query(By.css('.sorting-icon-container mat-icon'))
          .nativeElement.getAttribute('svgIcon')
      ).toBe('arrow_upward_24px');
    });

    it('does not render sorting icon when sortable is false', () => {
      const fixture = createComponent({
        header: {
          name: 'run',
          displayName: 'Run',
          type: ColumnHeaderType.RUN,
          enabled: true,
          sortable: false,
        },
      });

      expect(
        fixture.debugElement.query(By.css('.sorting-icon-container mat-icon'))
      ).toBeFalsy();
    });
  });

  describe('drag and drop', () => {
    it('is draggable if movable is true', () => {
      const fixture = createComponent({});

      expect(
        fixture.debugElement.query(By.css('.cell')).nativeElement.draggable
      ).toBe(true);
    });

    it('is not draggable if movable is false', () => {
      const fixture = createComponent({
        header: {
          name: 'run',
          displayName: 'Run',
          type: ColumnHeaderType.RUN,
          enabled: true,
          movable: false,
        },
      });

      expect(
        fixture.debugElement.query(By.css('.cell')).nativeElement.draggable
      ).toBe(false);
    });
  });
});
