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

import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
} from '@angular/core/testing';
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
  standalone: false,
  selector: 'testable-comp',
  template: `
    <tb-data-table-header-cell
      [header]="header"
      [sortingInfo]="sortingInfo"
      [hparamsEnabled]="hparamsEnabled"
      [controlsEnabled]="controlsEnabled"
      [disableContextMenu]="disableContextMenu"
      (headerClicked)="headerClicked($event)"
      (deleteButtonClicked)="deleteButtonClicked($event)"
      (contextMenuOpened)="contextMenuOpened.emit($event)"
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
  @Input() disableContextMenu!: boolean;

  @Input() headerClicked!: (sortingInfo: SortingInfo) => void;
  @Input() deleteButtonClicked!: (header: ColumnHeader) => void;

  @Output() contextMenuOpened = new EventEmitter<MouseEvent>();
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
    disableContextMenu?: boolean;
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
    fixture.componentInstance.disableContextMenu =
      input.disableContextMenu ?? false;

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

  describe('context menu', () => {
    it('dispatches event', () => {
      const fixture = createComponent({});
      const component = fixture.debugElement.query(
        By.directive(HeaderCellComponent)
      );
      spyOn(component.componentInstance.contextMenuOpened, 'emit');
      expect(
        component.componentInstance.contextMenuOpened.emit
      ).not.toHaveBeenCalled();
      component.nativeElement.dispatchEvent(new MouseEvent('contextmenu'));
      expect(
        component.componentInstance.contextMenuOpened.emit
      ).toHaveBeenCalled();
    });

    it('does not render the context menu icon when disableContextMenu is true', () => {
      const fixture = createComponent({disableContextMenu: true});
      const contextMenuBtn = fixture.debugElement.query(
        By.css('.context-menu-container mat-icon')
      );
      expect(contextMenuBtn).toBeNull();
    });

    it('clicking context menu button dispatches event', () => {
      const fixture = createComponent({});
      const component = fixture.debugElement.query(
        By.directive(HeaderCellComponent)
      );
      spyOn(component.componentInstance.contextMenuOpened, 'emit');
      expect(
        component.componentInstance.contextMenuOpened.emit
      ).not.toHaveBeenCalled();

      const contextMenuBtn = fixture.debugElement.query(
        By.css('.context-menu-container mat-icon')
      );
      contextMenuBtn.nativeElement.click();
      expect(
        component.componentInstance.contextMenuOpened.emit
      ).toHaveBeenCalled();
    });

    it('disableContextMenu prevents openContextMenu from emitting', () => {
      const fixture = createComponent({disableContextMenu: true});
      const component = fixture.debugElement.query(
        By.directive(HeaderCellComponent)
      );
      spyOn(component.componentInstance.contextMenuOpened, 'emit');
      component.nativeElement.dispatchEvent(new MouseEvent('contextmenu'));
      expect(
        component.componentInstance.contextMenuOpened.emit
      ).not.toHaveBeenCalled();
    });
  });
});
