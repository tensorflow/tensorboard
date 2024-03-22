/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.

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

import {TestBed} from '@angular/core/testing';
import {MatIconTestingModule} from '../../testing/mat_icon_module';
import {By} from '@angular/platform-browser';
import {ContextMenuComponent} from './context_menu_component';
import {ContextMenuModule} from './context_menu_module';
import {
  ColumnHeader,
  ColumnHeaderType,
  SortingInfo,
  SortingOrder,
} from './types';

function createComponent(props: {
  contextMenuHeader: ColumnHeader;
  selectableColumns: ColumnHeader[];
  sortingInfo: SortingInfo;
}) {
  const fixture = TestBed.createComponent(ContextMenuComponent);
  fixture.componentInstance.contextMenuHeader = props.contextMenuHeader;
  fixture.componentInstance.selectableColumns = props.selectableColumns;
  fixture.componentInstance.sortingInfo = props.sortingInfo;
  fixture.detectChanges();
  return fixture;
}

describe('context menu', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContextMenuComponent],
      imports: [ContextMenuModule, MatIconTestingModule],
    }).compileComponents();
  });

  [
    {
      testDesc: 'hides the remove button when the column is not removable',
      removable: false,
      expectedButtonText: 'Remove',
    },
    {
      testDesc: 'hides the sort button when the column is not sortable',
      sortable: false,
      expectedButtonText: 'Sort',
    },
    {
      testDesc: 'hides the filter button when the column is not filterable',
      filterable: false,
      expectedButtonText: 'Filter',
    },
  ].forEach(
    ({testDesc, removable, sortable, filterable, expectedButtonText}) => {
      it(testDesc, () => {
        const fixture = createComponent({
          contextMenuHeader: {
            name: 'run',
            type: ColumnHeaderType.RUN,
            displayName: 'Run',
            enabled: true,
            removable: removable ?? true,
            sortable: sortable ?? true,
            filterable: filterable ?? true,
          },
          selectableColumns: [],
          sortingInfo: {
            name: 'run',
            order: SortingOrder.DESCENDING,
          },
        });

        const removeButton = fixture.debugElement
          .queryAll(By.css('.context-menu button'))
          .find((btn) =>
            btn.nativeElement.innerHTML.includes(expectedButtonText)
          );

        expect(removeButton).toBeUndefined();
      });
    }
  );

  [
    {
      testDesc: 'shows the remove button when the column is removable',
      removable: true,
      expectedButtonText: 'Remove',
    },
    {
      testDesc: 'shows the sort button when the column is sortable',
      sortable: true,
      expectedButtonText: 'Sort',
    },
    {
      testDesc: 'shows the filter button when the column is filterable',
      filterable: true,
      expectedButtonText: 'Filter',
    },
  ].forEach(
    ({testDesc, removable, sortable, filterable, expectedButtonText}) => {
      it(testDesc, () => {
        const fixture = createComponent({
          contextMenuHeader: {
            name: 'run',
            type: ColumnHeaderType.RUN,
            displayName: 'Run',
            enabled: true,
            removable: removable ?? false,
            sortable: sortable ?? false,
            filterable: filterable ?? false,
          },
          selectableColumns: [],
          sortingInfo: {
            name: 'run',
            order: SortingOrder.DESCENDING,
          },
        });

        const removeButton = fixture.debugElement
          .queryAll(By.css('.context-menu button'))
          .find((btn) =>
            btn.nativeElement.innerHTML.includes(expectedButtonText)
          );

        expect(removeButton).toBeDefined();
      });
    }
  );

  [
    {
      testDesc: 'there are no selectable columns',
      selectableColumns: [],
      movable: true,
      columnType: ColumnHeaderType.HPARAM,
    },
    {
      testDesc: 'the column is not movable',
      selectableColumns: [
        {
          type: ColumnHeaderType.HPARAM,
          name: 'lr',
          displayName: 'Learning Rate',
          enabled: false,
        },
      ],
      movable: false,
      columnType: ColumnHeaderType.HPARAM,
    },
    {
      testDesc: 'the column is not an hparam',
      selectableColumns: [
        {
          type: ColumnHeaderType.HPARAM,
          name: 'lr',
          displayName: 'Learning Rate',
          enabled: false,
        },
      ],
      movable: true,
      columnType: ColumnHeaderType.METRIC,
    },
  ].forEach(({testDesc, selectableColumns, movable, columnType}) => {
    it(`does not include add buttons when ${testDesc}`, () => {
      const fixture = createComponent({
        contextMenuHeader: {
          name: 'fake_column',
          type: columnType,
          displayName: 'Fake Column',
          enabled: true,
          removable: true,
          movable,
        },
        selectableColumns,
        sortingInfo: {
          name: 'run',
          order: SortingOrder.DESCENDING,
        },
      });

      expect(
        fixture.debugElement
          .queryAll(By.css('.context-menu button'))
          .find((element) => element.nativeElement.innerHTML.includes('Left'))!
      ).toBeUndefined();
      expect(
        fixture.debugElement
          .queryAll(By.css('.context-menu button'))
          .find((element) => element.nativeElement.innerHTML.includes('Right'))!
      ).toBeUndefined();
    });
  });

  it('includes add buttons when there are selectable columns, the column is movable, and the column is an hparam', () => {
    const fixture = createComponent({
      contextMenuHeader: {
        name: 'fake_column',
        type: ColumnHeaderType.HPARAM,
        displayName: 'Fake Column',
        enabled: true,
        removable: true,
        movable: true,
      },
      selectableColumns: [
        {
          type: ColumnHeaderType.HPARAM,
          name: 'lr',
          displayName: 'Learning Rate',
          enabled: false,
        },
      ],
      sortingInfo: {
        name: 'run',
        order: SortingOrder.DESCENDING,
      },
    });

    expect(
      fixture.debugElement
        .queryAll(By.css('.context-menu button'))
        .find((element) => element.nativeElement.innerHTML.includes('Left'))!
    ).toBeDefined();
    expect(
      fixture.debugElement
        .queryAll(By.css('.context-menu button'))
        .find((element) => element.nativeElement.innerHTML.includes('Right'))!
    ).toBeDefined();
  });

  [
    {
      testDesc: 'renders a downward arrow when the sort direction is ascending',
      sortOrder: SortingOrder.ASCENDING,
      expectedSvgIcon: 'arrow_downward_24px',
    },
    {
      testDesc: 'renders an upward arrow when the sort direction is descending',
      sortOrder: SortingOrder.DESCENDING,
      expectedSvgIcon: 'arrow_upward_24px',
    },
  ].forEach(({testDesc, sortOrder, expectedSvgIcon}) => {
    it(testDesc, () => {
      const fixture = createComponent({
        contextMenuHeader: {
          name: 'fake_column',
          type: ColumnHeaderType.HPARAM,
          displayName: 'Fake Column',
          enabled: true,
          sortable: true,
        },
        selectableColumns: [
          {
            type: ColumnHeaderType.HPARAM,
            name: 'lr',
            displayName: 'Learning Rate',
            enabled: false,
          },
        ],
        sortingInfo: {
          name: 'fake_column',
          order: sortOrder,
        },
      });

      expect(
        fixture.debugElement
          .query(By.css('.context-menu-button.sort-button mat-icon'))
          .nativeElement.getAttribute('svgIcon')
      ).toBe(expectedSvgIcon);
    });
  });

  it('displays a message when empty', () => {
    const fixture = createComponent({
      contextMenuHeader: {
        name: 'fake_column',
        type: ColumnHeaderType.HPARAM,
        displayName: 'Fake Column',
        enabled: true,
        removable: false,
        sortable: false,
        filterable: false,
      },
      selectableColumns: [],
      sortingInfo: {
        name: 'fake_column',
        order: SortingOrder.ASCENDING,
      },
    });

    const contextMenu = fixture.debugElement.query(By.css('.context-menu'));
    expect(
      contextMenu.nativeElement.innerHTML.includes('No Actions Available')
    ).toBeTrue();
  });
});
