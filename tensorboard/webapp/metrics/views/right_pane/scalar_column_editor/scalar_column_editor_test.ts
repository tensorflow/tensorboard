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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {State} from '../../../../app_state';
import {
  dataTableColumnEdited,
  dataTableColumnToggled,
  metricsSlideoutMenuClosed,
  tableEditorTabChanged,
} from '../../../actions';
import {
  getRangeSelectionHeaders,
  getSingleSelectionHeaders,
  getTableEditorSelectedTab,
} from '../../../store/metrics_selectors';
import {
  ColumnHeaderType,
  DataTableMode,
} from '../../../../widgets/data_table/types';
import {DataTableHeaderModule} from '../../../../widgets/data_table/data_table_header_module';
import {ScalarColumnEditorComponent} from './scalar_column_editor_component';
import {ScalarColumnEditorContainer} from './scalar_column_editor_container';
import {MatLegacyTabsModule} from '@angular/material/legacy-tabs';

describe('scalar column editor', () => {
  let store: MockStore<State>;

  function createComponent(): ComponentFixture<ScalarColumnEditorContainer> {
    const fixture = TestBed.createComponent(ScalarColumnEditorContainer);
    fixture.detectChanges();
    return fixture;
  }

  function switchTabs(
    fixture: ComponentFixture<ScalarColumnEditorContainer>,
    mode: DataTableMode
  ) {
    let index = mode === DataTableMode.SINGLE ? 0 : 1;
    // Get mat-tab to queue the task of switching tabs
    fixture.debugElement
      .queryAll(By.css('.mat-tab-label'))
      [index].nativeElement.click();
    fixture.detectChanges();

    // flush the task to fire the selectedIndexChange event.
    flush();
    // Detect the changes after that event was fired.
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DataTableHeaderModule,
        MatLegacyTabsModule,
        NoopAnimationsModule,
      ],
      declarations: [ScalarColumnEditorContainer, ScalarColumnEditorComponent],
      providers: [provideMockStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRangeSelectionHeaders, []);
    store.overrideSelector(getSingleSelectionHeaders, []);
    store.overrideSelector(getTableEditorSelectedTab, DataTableMode.SINGLE);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  it('renders', () => {
    const fixture = createComponent();
    expect(fixture.debugElement.query(By.css('mat-tab-group'))).toBeTruthy();
  });

  it('renders single selection headers when selectedTab is set to SINGLE', fakeAsync(() => {
    store.overrideSelector(getSingleSelectionHeaders, [
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
    ]);
    const fixture = createComponent();

    switchTabs(fixture, DataTableMode.SINGLE);
    const headerElements = fixture.debugElement.queryAll(
      By.css('.header-list-item')
    );

    expect(headerElements.length).toEqual(2);
    expect(headerElements[0].nativeElement.innerText).toEqual('Run');
    expect(headerElements[1].nativeElement.innerText).toEqual('Value');
  }));

  it('renders range selection headers when selectedTab is set to RANGE', fakeAsync(() => {
    store.overrideSelector(getRangeSelectionHeaders, [
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
    ]);
    const fixture = createComponent();
    switchTabs(fixture, DataTableMode.RANGE);

    const headerElements = fixture.debugElement.queryAll(
      By.css('.header-list-item')
    );

    expect(headerElements.length).toEqual(2);
    expect(headerElements[0].nativeElement.innerText).toEqual('Run');
    expect(headerElements[1].nativeElement.innerText).toEqual('Value');
  }));

  it('checkboxes reflect enabled state', fakeAsync(() => {
    store.overrideSelector(getSingleSelectionHeaders, [
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
        enabled: false,
      },
    ]);
    const fixture = createComponent();

    switchTabs(fixture, DataTableMode.SINGLE);
    const checkboxes = fixture.debugElement.queryAll(By.css('mat-checkbox'));

    expect(checkboxes.length).toEqual(2);
    expect(checkboxes[0].nativeElement.innerText).toEqual('Run');
    expect(checkboxes[0].nativeElement.checked).toBeTrue();
    expect(checkboxes[1].nativeElement.innerText).toEqual('Value');
    expect(checkboxes[1].nativeElement.checked).toBeFalse();
  }));

  describe('toggling', () => {
    let dispatchedActions: Action[] = [];
    beforeEach(() => {
      dispatchedActions = [];
      spyOn(store, 'dispatch').and.callFake((action: Action) => {
        dispatchedActions.push(action);
      });
    });

    it('dispatches dataTableColumnToggled action with singe selection when checkbox is clicked', fakeAsync(() => {
      store.overrideSelector(getSingleSelectionHeaders, [
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
          enabled: false,
        },
      ]);
      const fixture = createComponent();
      switchTabs(fixture, DataTableMode.SINGLE);
      // Clear action fired on tab change.
      dispatchedActions = [];
      const checkboxes = fixture.debugElement.queryAll(By.css('mat-checkbox'));

      checkboxes[0].triggerEventHandler('change');
      fixture.detectChanges();

      expect(dispatchedActions[0]).toEqual(
        dataTableColumnToggled({
          dataTableMode: DataTableMode.SINGLE,
          header: {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
        })
      );
    }));

    it('dispatches dataTableColumnToggled action with range selection when checkbox is clicked', fakeAsync(() => {
      store.overrideSelector(getRangeSelectionHeaders, [
        {
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MAX_VALUE,
          name: 'maxValue',
          displayName: 'Max',
          enabled: false,
        },
      ]);
      const fixture = createComponent();

      switchTabs(fixture, DataTableMode.RANGE);
      // Clear action fired on tab change.
      dispatchedActions = [];
      const checkboxes = fixture.debugElement.queryAll(By.css('mat-checkbox'));
      checkboxes[1].triggerEventHandler('change', {});
      fixture.detectChanges();

      expect(dispatchedActions[0]).toEqual(
        dataTableColumnToggled({
          dataTableMode: DataTableMode.RANGE,
          header: {
            type: ColumnHeaderType.MAX_VALUE,
            name: 'maxValue',
            displayName: 'Max',
            enabled: false,
          },
        })
      );
    }));
  });

  describe('dragging', () => {
    let dispatchedActions: Action[] = [];
    beforeEach(() => {
      dispatchedActions = [];
      spyOn(store, 'dispatch').and.callFake((action: Action) => {
        dispatchedActions.push(action);
      });
    });

    it('dispatches dataTableColumnEdited action with singe selection when header is dragged', fakeAsync(() => {
      store.overrideSelector(getSingleSelectionHeaders, [
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
      const fixture = createComponent();
      switchTabs(fixture, DataTableMode.SINGLE);
      // Clear action fired on tab change.
      dispatchedActions = [];
      const headerListItems = fixture.debugElement.queryAll(
        By.css('.header-list-item')
      );

      headerListItems[0].triggerEventHandler('dragstart');
      headerListItems[1].triggerEventHandler('dragenter');
      headerListItems[0].triggerEventHandler('dragend');

      expect(dispatchedActions[0]).toEqual(
        dataTableColumnEdited({
          dataTableMode: DataTableMode.SINGLE,
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
        })
      );
    }));

    it('dispatches dataTableColumnEdited action with range selection when header is dragged', fakeAsync(() => {
      store.overrideSelector(getRangeSelectionHeaders, [
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MAX_VALUE,
          name: 'maxValue',
          displayName: 'Max',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MIN_VALUE,
          name: 'minValue',
          displayName: 'Min',
          enabled: true,
        },
      ]);
      const fixture = createComponent();
      switchTabs(fixture, DataTableMode.RANGE);
      // Clear action fired on tab change.
      dispatchedActions = [];
      const headerListItems = fixture.debugElement.queryAll(
        By.css('.header-list-item')
      );

      headerListItems[1].triggerEventHandler('dragstart');
      headerListItems[0].triggerEventHandler('dragenter');
      headerListItems[1].triggerEventHandler('dragend');

      expect(dispatchedActions[0]).toEqual(
        dataTableColumnEdited({
          dataTableMode: DataTableMode.RANGE,
          headers: [
            {
              type: ColumnHeaderType.MAX_VALUE,
              name: 'maxValue',
              displayName: 'Max',
              enabled: true,
            },
            {
              type: ColumnHeaderType.RUN,
              name: 'run',
              displayName: 'Run',
              enabled: true,
            },
            {
              type: ColumnHeaderType.MIN_VALUE,
              name: 'minValue',
              displayName: 'Min',
              enabled: true,
            },
          ],
        })
      );
    }));

    it('highlights item with bottom edge when dragging below item being dragged', fakeAsync(() => {
      store.overrideSelector(getRangeSelectionHeaders, [
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MAX_VALUE,
          name: 'maxValue',
          displayName: 'Max',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MIN_VALUE,
          name: 'minValue',
          displayName: 'Min',
          enabled: true,
        },
      ]);
      const fixture = createComponent();
      switchTabs(fixture, DataTableMode.RANGE);

      const headerListItems = fixture.debugElement.queryAll(
        By.css('.header-list-item')
      );

      headerListItems[1].triggerEventHandler('dragstart');
      headerListItems[2].triggerEventHandler('dragenter');
      fixture.detectChanges();

      expect(headerListItems[2].classes['highlighted']).toBeTrue();
      expect(headerListItems[2].classes['highlight-bottom']).toBeTrue();
    }));

    it('highlights item with top edge when dragging above item being dragged', fakeAsync(() => {
      store.overrideSelector(getRangeSelectionHeaders, [
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MAX_VALUE,
          name: 'maxValue',
          displayName: 'Max',
          enabled: true,
        },
        {
          type: ColumnHeaderType.MIN_VALUE,
          name: 'minValue',
          displayName: 'Min',
          enabled: true,
        },
      ]);
      const fixture = createComponent();
      switchTabs(fixture, DataTableMode.RANGE);

      const headerListItems = fixture.debugElement.queryAll(
        By.css('.header-list-item')
      );

      headerListItems[1].triggerEventHandler('dragstart');
      headerListItems[0].triggerEventHandler('dragenter');
      fixture.detectChanges();

      expect(headerListItems[0].classes['highlighted']).toBeTrue();
      expect(headerListItems[0].classes['highlight-top']).toBeTrue();
    }));
  });

  describe('closing', () => {
    let dispatchedActions: Action[] = [];
    beforeEach(() => {
      dispatchedActions = [];
      spyOn(store, 'dispatch').and.callFake((action: Action) => {
        dispatchedActions.push(action);
      });
    });
    it('dispatches metricsSlideoutMenuClosed', () => {
      const fixture = createComponent();

      fixture.debugElement
        .query(By.css('.close-button'))
        .triggerEventHandler('click', {});

      expect(dispatchedActions[0]).toEqual(metricsSlideoutMenuClosed());
    });
  });

  describe('tabs', () => {
    let dispatchedActions: Action[] = [];
    beforeEach(() => {
      dispatchedActions = [];
      spyOn(store, 'dispatch').and.callFake((action: Action) => {
        dispatchedActions.push(action);
      });
    });
    it('dispatches tableEditorTabChanged action when tab is clicked', fakeAsync(() => {
      const fixture = createComponent();
      switchTabs(fixture, DataTableMode.RANGE);
      fixture.detectChanges();

      expect(dispatchedActions[0]).toEqual(
        tableEditorTabChanged({tab: DataTableMode.RANGE})
      );

      dispatchedActions = [];
      switchTabs(fixture, DataTableMode.SINGLE);
      fixture.detectChanges();

      expect(dispatchedActions[0]).toEqual(
        tableEditorTabChanged({tab: DataTableMode.SINGLE})
      );
    }));

    it('update when global tableEditorSelectedTab changes', () => {
      const fixture = createComponent();
      fixture.detectChanges();
      const tabs = fixture.debugElement.queryAll(By.css('.mat-tab-label'));

      expect(
        tabs[0].attributes['class']?.includes('mat-tab-label-active')
      ).toBeTrue();
      expect(
        tabs[1].attributes['class']?.includes('mat-tab-label-active')
      ).toBeFalse();

      store.overrideSelector(getTableEditorSelectedTab, DataTableMode.RANGE);
      store.refreshState();
      fixture.detectChanges();

      expect(
        tabs[0].attributes['class']?.includes('mat-tab-label-active')
      ).toBeFalse();
      expect(
        tabs[1].attributes['class']?.includes('mat-tab-label-active')
      ).toBeTrue();
    });
  });
});
