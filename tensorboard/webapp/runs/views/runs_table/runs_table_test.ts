/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {OverlayContainer} from '@angular/cdk/overlay';
import {
  DebugElement,
  Directive,
  EventEmitter,
  Injectable,
  NO_ERRORS_SCHEMA,
  Output,
} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flushMicrotasks,
  TestBed,
} from '@angular/core/testing';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Action, Store} from '@ngrx/store';
import {MockStore, provideMockStore} from '@ngrx/store/testing';
import {of, ReplaySubject} from 'rxjs';
import * as alertActions from '../../../alert/actions';
import {buildExperimentRouteFromId} from '../../../app_routing/testing';
import {RouteKind} from '../../../app_routing/types';
import {State} from '../../../app_state';
import {buildExperiment} from '../../../experiments/store/testing';
import {
  actions as hparamsActions,
  selectors as hparamsSelectors,
} from '../../../hparams';
import {
  buildDiscreteFilter,
  buildHparamSpec,
  buildIntervalFilter,
  buildMetricSpec,
} from '../../../hparams/testing';
import {DiscreteFilter, IntervalFilter} from '../../../hparams/types';
import {
  getActiveRoute,
  getColorGroupRegexString,
  getCurrentRouteRunSelection,
  getDarkModeEnabled,
  getEnabledColorGroup,
  getEnabledColorGroupByRegex,
  getExperiment,
  getExperimentIdToExperimentAliasMap,
  getRegisteredRouteKinds,
  getRunColorMap,
  getRunGroupBy,
  getRunIdsForExperiment,
  getRuns,
  getRunSelectorPaginationOption,
  getRunSelectorRegexFilter,
  getRunSelectorSort,
  getRunsLoadState,
} from '../../../selectors';
import {selectors as settingsSelectors} from '../../../settings';
import {buildColorPalette} from '../../../settings/testing';
import {sendKeys} from '../../../testing/dom';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {DataLoadState} from '../../../types/data';
import {SortDirection} from '../../../types/ui';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {RangeInputModule} from '../../../widgets/range_input/range_input_module';
import {
  runColorChanged,
  runGroupByChanged,
  runPageSelectionToggled,
  runSelectionToggled,
  runSelectorPaginationOptionChanged,
  runSelectorRegexFilterChanged,
  runSelectorSortChanged,
  runTableShown,
} from '../../actions';
import {DomainType} from '../../data_source/runs_data_source_types';
import {MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT, Run} from '../../store/runs_types';
import {buildRun} from '../../store/testing';
import {GroupByKey, SortType} from '../../types';
import {RunsGroupMenuButtonComponent} from './runs_group_menu_button_component';
import {RunsGroupMenuButtonContainer} from './runs_group_menu_button_container';
import {RunsTableComponent} from './runs_table_component';
import {RunsTableContainer, TEST_ONLY} from './runs_table_container';
import {HparamSpec, MetricSpec, RunsTableColumn} from './types';

@Injectable()
class ColorPickerTestHelper {
  private readonly onColorPickerChanges: Array<(color: string) => void> = [];

  /**
   * Triggers `colorPickerChange` on the TestableColorPicker. Since the
   * ColorPicker does not know about `run` and there can be many instances of
   * the picker, we use index of registered components.
   */
  triggerColorPickerChangeForTest(index: number, newColor: string) {
    if (!this.onColorPickerChanges[index]) {
      throw new Error(
        'Expected `internalSetOnColorPickerChange` to have been ' +
          'called before calling `triggerColorPickerChangeForTest`.'
      );
    }
    this.onColorPickerChanges[index](newColor);
  }

  internalSetOnColorPickerChange(callback: (color: string) => void) {
    this.onColorPickerChanges.push(callback);
  }
}

/**
 * ColorPickerModule is not provider in test due to template compilation issue.
 * This provides very simple version that can trigger changed event
 * programmatically.
 */
@Directive({
  selector: '[colorPicker]',
})
class TestableColorPicker {
  @Output() colorPickerChange = new EventEmitter<string>();
  constructor(testHelper: ColorPickerTestHelper) {
    testHelper.internalSetOnColorPickerChange((color: string) => {
      this.colorPickerChange.emit(color);
    });
  }
}

const Selector = {
  ITEM_ROW: '.rows [role="row"]',
  COLUMN: '[role="cell"]',
  HEADER_COLUMN: '[role="columnheader"]',
  HEADER_CHECKBOX: '[role="columnheader"] mat-checkbox',
  SELECT_ALL_ROW: '.select-all',
};

describe('runs_table', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;
  let overlayContainer: OverlayContainer;
  let actualActions: Action[];

  function createComponent(
    experimentIds: string[],
    columns?: RunsTableColumn[],
    usePagination?: boolean
  ) {
    const fixture = TestBed.createComponent(RunsTableContainer);
    fixture.componentInstance.experimentIds = experimentIds;
    if (columns) {
      fixture.componentInstance.columns = columns;
    }
    if (usePagination !== undefined) {
      fixture.componentInstance.usePagination = usePagination;
    }
    fixture.detectChanges();

    return fixture;
  }

  function getTableRowTextContent(
    fixture: ComponentFixture<RunsTableContainer>
  ) {
    const rows = [...fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW)];
    return rows.map((row) => {
      const columns = [...row.querySelectorAll(Selector.COLUMN)];
      return columns.map((column) => column.textContent.trim());
    });
  }

  function getOverlayMenuItems() {
    return Array.from(
      overlayContainer.getContainerElement().querySelectorAll('[mat-menu-item]')
    );
  }

  function getColorGroupByHTMLElement(
    key: GroupByKey | 'regex-edit'
  ): HTMLElement | null {
    const items = getOverlayMenuItems() as HTMLElement[];
    let stringKey: string;
    switch (key) {
      case GroupByKey.EXPERIMENT:
        stringKey = 'experiment';
        break;
      case GroupByKey.RUN:
        stringKey = 'run';
        break;
      case GroupByKey.REGEX:
        stringKey = 'regex';
        break;
      case 'regex-edit':
        stringKey = 'regex-edit';
        break;
      default:
        throw new Error(`Unknown GroupByKey: ${key}`);
    }
    return (
      items.find((item) => {
        return item.dataset['value'] === stringKey;
      }) ?? null
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatCheckboxModule,
        MatDialogModule,
        MatIconTestingModule,
        MatMenuModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatSortModule,
        MatTableModule,
        NoopAnimationsModule,
        FilterInputModule,
        RangeInputModule,
        ExperimentAliasModule,
      ],
      declarations: [
        RunsGroupMenuButtonComponent,
        RunsGroupMenuButtonContainer,
        RunsTableComponent,
        RunsTableContainer,
        RunsTableContainer,
        TestableColorPicker,
      ],
      providers: [provideMockStore(), ColorPickerTestHelper],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    actualActions = [];

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    overlayContainer = TestBed.inject(OverlayContainer);
    store.overrideSelector(getRuns, []);
    store.overrideSelector(getRunIdsForExperiment, []);
    store.overrideSelector(getRunsLoadState, {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    });
    store.overrideSelector(getExperiment, null);
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map() as ReturnType<typeof getCurrentRouteRunSelection>
    );
    store.overrideSelector(getRunSelectorPaginationOption, {
      pageIndex: 0,
      pageSize: 10,
    });
    store.overrideSelector(getRunSelectorRegexFilter, '');
    store.overrideSelector(getRunSelectorSort, {
      key: null,
      direction: SortDirection.UNSET,
    });
    store.overrideSelector(getRunColorMap, {});
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {
      rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
      tolkien: {aliasText: 'The Lord of the Rings', aliasNumber: 2},
    });
    store.overrideSelector(
      hparamsSelectors.getExperimentsHparamsAndMetricsSpecs,
      {
        hparams: [],
        metrics: [],
      }
    );
    store.overrideSelector(
      hparamsSelectors.getHparamFilterMap,
      new Map() as ReturnType<typeof hparamsSelectors.getHparamFilterMap>
    );
    store.overrideSelector(
      hparamsSelectors.getMetricFilterMap,
      new Map() as ReturnType<typeof hparamsSelectors.getMetricFilterMap>
    );
    store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
    store.overrideSelector(getEnabledColorGroup, false);
    store.overrideSelector(getEnabledColorGroupByRegex, false);
    store.overrideSelector(getRunGroupBy, {key: GroupByKey.RUN});
    store.overrideSelector(getColorGroupRegexString, '');
    store.overrideSelector(getRegisteredRouteKinds, new Set<RouteKind>());
    store.overrideSelector(getDarkModeEnabled, false);
    store.overrideSelector(
      settingsSelectors.getColorPalette,
      buildColorPalette()
    );
    dispatchSpy = spyOn(store, 'dispatch').and.callFake((action: Action) => {
      actualActions.push(action);
    });
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  describe('list renders', () => {
    let selectSpy: jasmine.Spy;

    beforeEach(() => {
      // To make sure we only return the runs when called with the right props.
      selectSpy = spyOn(store, 'select').and.callThrough();
    });

    it('renders list of runs in a table', async () => {
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'book'})
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'book'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      selectSpy.withArgs(getExperiment, {experimentId: 'book'}).and.returnValue(
        of(
          buildExperiment({
            name: 'Harry Potter',
          })
        )
      );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        book: {aliasText: 'Harry Potter', aliasNumber: 1},
      });

      const fixture = createComponent(
        ['book'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();
      await fixture.whenStable();

      // mat-table's content somehow does not end up in DebugElement.
      const rows = fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW);
      expect(rows.length).toBe(2);

      const [book1, book2] = rows;
      expect(
        [...book1.querySelectorAll(Selector.COLUMN)].map(
          (node) => node.textContent
        )
      ).toEqual(['1Harry Potter', "The Philosopher's Stone"]);

      expect(
        [...book2.querySelectorAll(Selector.COLUMN)].map(
          (node) => node.textContent
        )
      ).toEqual(['1Harry Potter', 'The Chamber Of Secrets']);
    });

    it('dispatches `runTableShown` when shown', () => {
      const fixture = createComponent(
        ['book'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(
        runTableShown({
          experimentIds: ['book'],
        })
      );
    });

    it('concats runs from multiple experimentIds into the table', async () => {
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'rowling'})
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'tolkien'})
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'tolkien'})
        .and.returnValue(
          of([buildRun({id: 'book3', name: 'The Fellowship of the Ring'})])
        );
      selectSpy
        .withArgs(getExperiment, {experimentId: 'rowling'})
        .and.returnValue(
          of(
            buildExperiment({
              name: 'Harry Potter',
            })
          )
        );
      selectSpy
        .withArgs(getExperiment, {experimentId: 'tolkien'})
        .and.returnValue(
          of(
            buildExperiment({
              name: 'The Lord of the Rings',
            })
          )
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'HP', aliasNumber: 1},
        tolkien: {aliasText: 'LoTR', aliasNumber: 2},
      });

      const fixture = createComponent(
        ['tolkien', 'rowling'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();
      await fixture.whenStable();

      // mat-table's content somehow does not end up in DebugElement.
      const rows = fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW);
      expect(rows.length).toBe(3);

      const [book1, book2, book3] = rows;
      expect(
        [...book1.querySelectorAll(Selector.COLUMN)].map(
          (node) => node.textContent
        )
      ).toEqual(['2LoTR', 'The Fellowship of the Ring']);
      expect(
        [...book2.querySelectorAll(Selector.COLUMN)].map(
          (node) => node.textContent
        )
      ).toEqual(['1HP', "The Philosopher's Stone"]);
      expect(
        [...book3.querySelectorAll(Selector.COLUMN)].map(
          (node) => node.textContent
        )
      ).toEqual(['1HP', 'The Chamber Of Secrets']);
    });

    it('honors the order of `columns` when rendering', async () => {
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'book'})
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'book'})
        .and.returnValue(
          of([buildRun({id: 'book1', name: 'The Fellowship of the Ring'})])
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        book: {aliasText: 'The Lord of the Rings', aliasNumber: 1},
      });
      const fixture = createComponent(
        ['book'],
        [RunsTableColumn.RUN_NAME, RunsTableColumn.EXPERIMENT_NAME]
      );
      fixture.detectChanges();
      await fixture.whenStable();

      // mat-table's content somehow does not end up in DebugElement.
      const [book1] = fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW);
      expect(
        [...book1.querySelectorAll(Selector.COLUMN)].map(
          (node) => node.textContent
        )
      ).toEqual(['The Fellowship of the Ring', '1The Lord of the Rings']);
    });

    it('updates the list of runs', async () => {
      // To make sure we only return the runs when called with the right props.
      const runs = new ReplaySubject<Run[]>(1);
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'book'})
        .and.returnValue(of(false));
      selectSpy.withArgs(getRuns, {experimentId: 'book'}).and.returnValue(runs);

      runs.next([
        buildRun({id: 'Harry', name: 'Harry'}),
        buildRun({id: 'Potter', name: 'Potter'}),
      ]);
      const fixture = createComponent(['book']);
      fixture.detectChanges();
      await fixture.whenStable();

      const rowsBefore = fixture.nativeElement.querySelectorAll(
        Selector.ITEM_ROW
      );
      expect(rowsBefore.length).toBe(2);

      runs.next([buildRun({id: 'Potter', name: 'Potter'})]);
      fixture.detectChanges();

      const rowsAfter = fixture.nativeElement.querySelectorAll(
        Selector.ITEM_ROW
      );
      expect(rowsAfter.length).toBe(1);
      const [potter] = rowsAfter;
      expect(potter.querySelector(Selector.COLUMN).textContent).toBe('Potter');
    });

    it('renders checkboxes according to the map', async () => {
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'book'})
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'book'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      selectSpy.withArgs(getCurrentRouteRunSelection).and.returnValue(
        of(
          new Map([
            ['book1', true],
            ['book2', false],
          ])
        )
      );

      const fixture = createComponent(
        ['book'],
        [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();
      await fixture.whenStable();

      // mat-table's content somehow does not end up in DebugElement.
      const [book1, book2] = fixture.nativeElement.querySelectorAll(
        Selector.ITEM_ROW
      );
      expect(book1.querySelector('mat-checkbox input').checked).toBe(true);
      expect(book2.querySelector('mat-checkbox input').checked).toBe(false);
    });

    it('renders run colors', () => {
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'book'})
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'book'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        book: {aliasText: "The Philosopher's Stone", aliasNumber: 1},
      });
      store.overrideSelector(
        getCurrentRouteRunSelection,
        new Map([
          ['book1', true],
          ['book2', false],
        ])
      );
      store.overrideSelector(getRunColorMap, {
        book1: '#000',
      });

      const fixture = createComponent(
        ['book'],
        [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
      );
      fixture.detectChanges();

      const [book1, book2] = fixture.nativeElement.querySelectorAll(
        Selector.ITEM_ROW
      );
      const [book1Name, book1Color] = book1.querySelectorAll(Selector.COLUMN);
      expect(book1Name.textContent).toBe("The Philosopher's Stone");
      expect(book1Color.querySelector('button').style.background).toBe(
        'rgb(0, 0, 0)'
      );
      expect(
        book1Color.querySelector('button').classList.contains('no-color')
      ).toBe(false);

      const [book2Name, book2Color] = book2.querySelectorAll(Selector.COLUMN);
      expect(book2Name.textContent).toBe('The Chamber Of Secrets');
      expect(book2Color.querySelector('button').style.background).toBe('');
      expect(
        book2Color.querySelector('button').classList.contains('no-color')
      ).toBe(true);
    });

    describe('color grouping render', () => {
      function openColorGroupDialog(
        fixture: ComponentFixture<RunsTableContainer>
      ) {
        const menuButton = fixture.debugElement
          .query(By.directive(RunsGroupMenuButtonContainer))
          .query(By.css('button'));
        menuButton.nativeElement.click();
      }

      it('renders the menu for color grouping when the feature is enabled', () => {
        store.overrideSelector(getEnabledColorGroup, true);
        const fixture = createComponent(
          ['book'],
          [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
        );
        fixture.detectChanges();

        const menuButton = fixture.debugElement.query(
          By.directive(RunsGroupMenuButtonContainer)
        );
        expect(menuButton).toBeTruthy();
      });

      it('renders Experiment only when COMPARE_EXPERIMENT route is registered', () => {
        store.overrideSelector(
          getRegisteredRouteKinds,
          new Set([RouteKind.COMPARE_EXPERIMENT])
        );
        store.overrideSelector(getEnabledColorGroup, true);
        store.overrideSelector(getEnabledColorGroupByRegex, true);
        const fixture = createComponent(
          ['book'],
          [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
        );
        fixture.detectChanges();

        openColorGroupDialog(fixture);
        const items = getOverlayMenuItems();

        expect(
          items.map((element) => element.querySelector('label')!.textContent)
        ).toEqual(['Experiment', 'Run', 'Regex', '(none set)']);
      });

      it('renders "Run", "Regex", and "(none set)"', () => {
        store.overrideSelector(
          getRegisteredRouteKinds,
          new Set([RouteKind.EXPERIMENT])
        );
        store.overrideSelector(getEnabledColorGroup, true);
        store.overrideSelector(getEnabledColorGroupByRegex, true);
        const fixture = createComponent(
          ['book'],
          [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
        );
        fixture.detectChanges();

        openColorGroupDialog(fixture);
        const items = getOverlayMenuItems();

        expect(
          items.map((element) => element.querySelector('label')!.textContent)
        ).toEqual(['Run', 'Regex', '(none set)']);
      });

      it(
        'renders a check icon and aria-checked for the current groupBy menu ' +
          'item',
        () => {
          store.overrideSelector(
            getRegisteredRouteKinds,
            new Set([RouteKind.COMPARE_EXPERIMENT])
          );
          store.overrideSelector(getEnabledColorGroup, true);
          store.overrideSelector(getEnabledColorGroupByRegex, true);
          store.overrideSelector(getRunGroupBy, {key: GroupByKey.EXPERIMENT});
          const fixture = createComponent(
            ['book'],
            [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
          );
          fixture.detectChanges();

          const menuButton = fixture.debugElement
            .query(By.directive(RunsGroupMenuButtonContainer))
            .query(By.css('button'));
          menuButton.nativeElement.click();

          const items = Array.from(
            overlayContainer
              .getContainerElement()
              .querySelectorAll('[role="menuitemradio"]')
          );

          expect(
            items.map((element) => element.getAttribute('aria-checked'))
          ).toEqual(['true', 'false', 'false']);
          expect(
            items.map((element) => Boolean(element.querySelector('mat-icon')))
          ).toEqual([true, false, false]);

          store.overrideSelector(getRunGroupBy, {
            key: GroupByKey.REGEX,
            regexString: 'hello',
          });
          store.refreshState();
          fixture.detectChanges();

          expect(
            items.map((element) => element.getAttribute('aria-checked'))
          ).toEqual(['false', 'false', 'true']);
          expect(
            items.map((element) => Boolean(element.querySelector('mat-icon')))
          ).toEqual([false, false, true]);
        }
      );

      it(
        'dispatches `runGroupByChanged` when the menu item `Run`, `Experiment`, ' +
          'and Edit button is clicked',
        () => {
          store.overrideSelector(
            getRegisteredRouteKinds,
            new Set([RouteKind.COMPARE_EXPERIMENT])
          );
          store.overrideSelector(getEnabledColorGroup, true);
          store.overrideSelector(getEnabledColorGroupByRegex, true);
          store.overrideSelector(getRunGroupBy, {key: GroupByKey.EXPERIMENT});
          const fixture = createComponent(
            ['book'],
            [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
          );
          fixture.detectChanges();

          const menuButton = fixture.debugElement
            .query(By.directive(RunsGroupMenuButtonContainer))
            .query(By.css('button'));
          menuButton.nativeElement.click();

          getColorGroupByHTMLElement(GroupByKey.EXPERIMENT)!.click();
          expect(dispatchSpy).toHaveBeenCalledWith(
            runGroupByChanged({
              experimentIds: ['book'],
              groupBy: {key: GroupByKey.EXPERIMENT},
            })
          );

          getColorGroupByHTMLElement(GroupByKey.RUN)!.click();
          expect(dispatchSpy).toHaveBeenCalledWith(
            runGroupByChanged({
              experimentIds: ['book'],
              groupBy: {key: GroupByKey.RUN},
            })
          );

          getColorGroupByHTMLElement('regex-edit')!.click();
          const dialogContainer = overlayContainer
            .getContainerElement()
            .querySelector('mat-dialog-container');
          expect(dialogContainer).toBeTruthy();
          const [fillExampleButton, cancelButton, saveButton] =
            dialogContainer!.querySelectorAll('button');
          expect(cancelButton!.textContent).toContain('Cancel');
          expect(saveButton!.textContent).toContain('Save');
        }
      );

      it('dispatches `runGroupByChanged` on clicking `Regex` when there is a regex string', () => {
        store.overrideSelector(getEnabledColorGroup, true);
        store.overrideSelector(getEnabledColorGroupByRegex, true);
        store.overrideSelector(getRunGroupBy, {key: GroupByKey.EXPERIMENT});
        store.overrideSelector(getColorGroupRegexString, 'run');
        const fixture = createComponent(
          ['book'],
          [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
        );
        fixture.detectChanges();

        openColorGroupDialog(fixture);
        getColorGroupByHTMLElement(GroupByKey.REGEX)!.click();
        expect(dispatchSpy).toHaveBeenCalledWith(
          runGroupByChanged({
            experimentIds: ['book'],
            groupBy: {key: GroupByKey.REGEX, regexString: 'run'},
          })
        );
      });

      it('opens edit dialog on clicking `Regex` when the regex string is not set', () => {
        store.overrideSelector(getEnabledColorGroup, true);
        store.overrideSelector(getEnabledColorGroupByRegex, true);
        store.overrideSelector(getRunGroupBy, {key: GroupByKey.EXPERIMENT});
        store.overrideSelector(getColorGroupRegexString, '');
        const fixture = createComponent(
          ['book'],
          [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
        );
        fixture.detectChanges();

        openColorGroupDialog(fixture);
        getColorGroupByHTMLElement(GroupByKey.REGEX)!.click();
        const dialogContainer = overlayContainer
          .getContainerElement()
          .querySelector('mat-dialog-container');
        expect(dialogContainer).toBeTruthy();
      });

      it('dispatches `runGroupByChanged` when regex editing is saved', () => {
        store.overrideSelector(getEnabledColorGroup, true);
        store.overrideSelector(getEnabledColorGroupByRegex, true);
        store.overrideSelector(getRunGroupBy, {key: GroupByKey.EXPERIMENT});
        const fixture = createComponent(
          ['book'],
          [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
        );

        openColorGroupDialog(fixture);
        getColorGroupByHTMLElement('regex-edit')!.click();
        const dialogContainer = overlayContainer
          .getContainerElement()
          .querySelector('mat-dialog-container');
        const [fillExampleButton, cancelButton, saveButton] =
          dialogContainer!.querySelectorAll('button');

        saveButton.click();
        expect(dispatchSpy).toHaveBeenCalledWith(
          runGroupByChanged({
            experimentIds: ['book'],
            groupBy: {key: GroupByKey.REGEX, regexString: ''},
          })
        );

        const dialogInputDebugElement: DebugElement = new DebugElement(
          overlayContainer
            .getContainerElement()
            .querySelector('mat-dialog-container input')
        );
        sendKeys(fixture, dialogInputDebugElement, 'foo(\\d+)');

        saveButton.click();
        expect(dispatchSpy).toHaveBeenCalledWith(
          runGroupByChanged({
            experimentIds: ['book'],
            groupBy: {key: GroupByKey.REGEX, regexString: 'foo(\\d+)'},
          })
        );
      });

      it('does not dispatch `runGroupByChanged` with GroupByKey.REGEX when regex editing is cancelled', () => {
        store.overrideSelector(getEnabledColorGroup, true);
        store.overrideSelector(getEnabledColorGroupByRegex, true);
        store.overrideSelector(getRunGroupBy, {key: GroupByKey.EXPERIMENT});
        const fixture = createComponent(
          ['book'],
          [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
        );

        openColorGroupDialog(fixture);
        getColorGroupByHTMLElement('regex-edit')!.click();
        const dialogContainer = overlayContainer
          .getContainerElement()
          .querySelector('mat-dialog-container');
        const [cancelButton, saveButton] =
          dialogContainer!.querySelectorAll('button');

        const dialogInputDebugElement: DebugElement = new DebugElement(
          overlayContainer
            .getContainerElement()
            .querySelector('mat-dialog-container input')
        );
        sendKeys(fixture, dialogInputDebugElement, 'foo(\\d+)');

        cancelButton.click();
        expect(dispatchSpy).not.toHaveBeenCalledWith(
          runGroupByChanged({
            experimentIds: ['book'],
            groupBy: {key: GroupByKey.REGEX, regexString: ''},
          })
        );
      });

      it(
        'does not render the menu when color column is not specified even ' +
          'when the feature is enabled',
        () => {
          store.overrideSelector(getEnabledColorGroup, true);
          const fixture = createComponent(
            ['book'],
            [RunsTableColumn.RUN_NAME, RunsTableColumn.EXPERIMENT_NAME]
          );
          fixture.detectChanges();

          const menuButton = fixture.debugElement.query(
            By.directive(RunsGroupMenuButtonContainer)
          );
          expect(menuButton).toBeFalsy();
        }
      );
    });

    it('dispatches `runColorChanged` when color changes', () => {
      const testHelper = TestBed.inject(ColorPickerTestHelper);
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, {experimentId: 'book'})
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'book'})
        .and.returnValue(of([buildRun({id: 'book1', name: 'Book name'})]));
      store.overrideSelector(getRunColorMap, {
        book1: '#000',
      });

      const fixture = createComponent(
        ['book'],
        [RunsTableColumn.RUN_NAME, RunsTableColumn.RUN_COLOR]
      );
      fixture.detectChanges();

      testHelper.triggerColorPickerChangeForTest(0, '#ccc');
      expect(dispatchSpy).toHaveBeenCalledWith(
        runColorChanged({
          runId: 'book1',
          newColor: '#ccc',
        })
      );
    });
  });

  describe('loading', () => {
    it('renders loading indicator when at least one content is loading', () => {
      const selectSpy = spyOn(store, 'select');
      selectSpy.and.callThrough();
      selectSpy
        .withArgs(getRunsLoadState, {experimentId: 'book'})
        .and.returnValue(
          of({state: DataLoadState.LOADING, lastLoadedTimeInMs: null})
        );
      selectSpy
        .withArgs(getRunsLoadState, {experimentId: 'movie'})
        .and.returnValue(
          of({state: DataLoadState.LOADED, lastLoadedTimeInMs: 0})
        );

      const fixture = createComponent(['book', 'movie']);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('mat-spinner'));
      expect(spinner).toBeDefined();
    });

    it('does not render spinner when everything is loaded', () => {
      const selectSpy = spyOn(store, 'select');
      selectSpy.and.callThrough();
      selectSpy
        .withArgs(getRunsLoadState, {experimentId: 'book'})
        .and.returnValue(
          of({state: DataLoadState.LOADED, lastLoadedTimeInMs: 0})
        );
      selectSpy
        .withArgs(getRunsLoadState, {experimentId: 'movie'})
        .and.returnValue(
          of({state: DataLoadState.LOADED, lastLoadedTimeInMs: 0})
        );

      const fixture = createComponent(['book', 'movie']);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('mat-spinner'));
      expect(spinner).toBeNull();
    });
  });

  describe('empty', () => {
    it('does not render no runs text when content is loading', () => {
      store.overrideSelector(getRunsLoadState, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      });
      store.overrideSelector(getRuns, []);
      const fixture = createComponent(['book']);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('no-runs'));
      expect(spinner).toBeNull();
    });

    it('renders no runs when content is loading', () => {
      store.overrideSelector(getRunsLoadState, {
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
      });
      store.overrideSelector(getRuns, []);
      const fixture = createComponent(['book']);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('no-runs'));
      expect(spinner).toBeDefined();
    });
  });

  describe('paginator', () => {
    /**
     * Updates the mat-table and mat-paginator. Must be called inside a
     * fakeAsync.
     *
     * 1. detectChanges causes mat-table to update which...
     * 2. triggers Promise.resolve to update the mat-paginator in the
     *    table-data-source [1]. So we use flushMicroTask to synchronously
     *    resolve the promise. It marks the paginator dirty, so...
     * 3. detectChanges to check for dirty DOM and update the paginator.
     * [1]:
     * https://github.com/angular/components/blob/master/src/material/table/table-data-source.ts#L301
     */
    function updateTableAndPaginator(
      fixture: ComponentFixture<RunsTableContainer>
    ) {
      fixture.detectChanges();
      flushMicrotasks();
      fixture.detectChanges();
    }

    function createAndSetRuns(numberOfRuns: number) {
      const runs = Array.from<Run>({length: numberOfRuns}).map(
        (notUsed, index) => {
          const name = `run_${index}`;
          return buildRun({
            id: name,
            name,
          });
        }
      );
      store.overrideSelector(getRuns, runs);
    }

    beforeEach(() => {
      // Limit the page size to 5.
      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 0,
        pageSize: 5,
      });
    });

    it('shows all items without pagination by default', () => {
      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 0,
        pageSize: 2,
      });
      createAndSetRuns(5);
      const fixture = createComponent(['book']);
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW);
      expect(rows.length).toBe(5);
      expect(
        fixture.debugElement.query(By.css('mat-paginator'))
      ).not.toBeTruthy();
      expect(getTableRowTextContent(fixture)).toEqual([
        ['run_0'],
        ['run_1'],
        ['run_2'],
        ['run_3'],
        ['run_4'],
      ]);
    });

    it('displays the correct text on the paginator', () => {
      const fixture = createComponent(
        ['book'],
        undefined,
        true /* usePagination */
      );
      fixture.detectChanges();

      const label = fixture.debugElement.query(
        By.css('.mat-paginator-page-size-label')
      );
      expect(label.nativeElement.textContent).toContain('Show runs:');
    });

    it('fires action when pressing next, last, first button', fakeAsync(() => {
      const PAGE_SIZE = 5;
      const NUM_PAGES = 4;
      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 1,
        pageSize: PAGE_SIZE,
      });
      createAndSetRuns(PAGE_SIZE * NUM_PAGES);
      const fixture = createComponent(
        ['book'],
        undefined,
        true /* usePagination */
      );
      updateTableAndPaginator(fixture);

      const rows = fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW);
      // By default, mat-paginator take the lowest pageSizeOptions.
      expect(rows.length).toBe(PAGE_SIZE);
      const [beforeFirstEl] = rows;
      expect(beforeFirstEl.querySelector(Selector.COLUMN).textContent).toBe(
        'run_5'
      );

      fixture.debugElement
        .query(By.css('[aria-label="Next page"]'))
        .nativeElement.click();
      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectorPaginationOptionChanged({
          pageIndex: 2,
          pageSize: PAGE_SIZE,
        })
      );

      fixture.debugElement
        .query(By.css('[aria-label="Last page"]'))
        .nativeElement.click();
      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectorPaginationOptionChanged({
          // index starts from 0.
          pageIndex: NUM_PAGES - 1,
          pageSize: PAGE_SIZE,
        })
      );

      fixture.debugElement
        .query(By.css('[aria-label="First page"]'))
        .nativeElement.click();
      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectorPaginationOptionChanged({
          pageIndex: 0,
          pageSize: PAGE_SIZE,
        })
      );
    }));

    it('shows content from other pages', fakeAsync(() => {
      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 0,
        pageSize: 5,
      });
      createAndSetRuns(20);
      const fixture = createComponent(
        ['book'],
        undefined,
        true /* usePagination */
      );
      updateTableAndPaginator(fixture);

      const rows = fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW);
      // By default, mat-paginator take the lowest pageSizeOptions.
      expect(rows.length).toBe(5);
      const [beforeFirstEl] = rows;
      expect(beforeFirstEl.querySelector(Selector.COLUMN).textContent).toBe(
        'run_0'
      );

      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 1,
        pageSize: 5,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['run_5'],
        ['run_6'],
        ['run_7'],
        ['run_8'],
        ['run_9'],
      ]);
      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 1,
        pageSize: 3,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['run_3'],
        ['run_4'],
        ['run_5'],
      ]);
    }));

    it('shows correct number of items when filtering', fakeAsync(() => {
      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 1,
        pageSize: 5,
      });
      store.overrideSelector(getRunSelectorRegexFilter, 'run_[0-9]$');
      createAndSetRuns(20);
      const fixture = createComponent(
        ['book'],
        undefined,
        true /* usePagination */
      );
      updateTableAndPaginator(fixture);

      const label = fixture.nativeElement.querySelector(
        '.mat-paginator-range-label'
      );
      // By default, mat-paginator take the lowest pageSizeOptions.
      expect(label.textContent).toContain('6 – 10 of 10');

      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 0,
        pageSize: 5,
      });
      store.overrideSelector(getRunSelectorRegexFilter, 'run_[4-6]');
      store.refreshState();
      updateTableAndPaginator(fixture);

      expect(label.textContent).toContain('1 – 3 of 3');
    }));
  });

  describe('sort', () => {
    let selectSpy: jasmine.Spy;

    beforeEach(() => {
      // To make sure we only return the runs when called with the right props.
      selectSpy = spyOn(store, 'select').and.callThrough();
    });

    it('dispatches action when sorting', () => {
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, jasmine.any)
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );

      const fixture = createComponent(
        ['rowling'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      const [expButton, runButton] = fixture.nativeElement.querySelectorAll(
        Selector.HEADER_COLUMN + ' .mat-sort-header-container'
      );

      expButton.click();
      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectorSortChanged({
          key: {type: SortType.EXPERIMENT_NAME},
          direction: SortDirection.ASC,
        })
      );

      runButton.click();
      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectorSortChanged({
          key: {type: SortType.RUN_NAME},
          direction: SortDirection.ASC,
        })
      );
    });

    it('sorts by experiment name', () => {
      store.overrideSelector(getRunSelectorSort, {
        key: {type: SortType.EXPERIMENT_NAME},
        direction: SortDirection.UNSET,
      });
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, jasmine.any)
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
        tolkien: {aliasText: 'The Lord of the Rings', aliasNumber: 2},
      });
      selectSpy
        .withArgs(getRuns, {experimentId: 'tolkien'})
        .and.returnValue(
          of([buildRun({id: 'book3', name: 'The Fellowship of the Ring'})])
        );

      const fixture = createComponent(
        ['rowling', 'tolkien'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['1Harry Potter', "The Philosopher's Stone"],
        ['1Harry Potter', 'The Chamber Of Secrets'],
        ['2The Lord of the Rings', 'The Fellowship of the Ring'],
      ]);

      store.overrideSelector(getRunSelectorSort, {
        key: {type: SortType.EXPERIMENT_NAME},
        direction: SortDirection.ASC,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['1Harry Potter', 'The Chamber Of Secrets'],
        ['1Harry Potter', "The Philosopher's Stone"],
        ['2The Lord of the Rings', 'The Fellowship of the Ring'],
      ]);

      store.overrideSelector(getRunSelectorSort, {
        key: {type: SortType.EXPERIMENT_NAME},
        direction: SortDirection.DESC,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['2The Lord of the Rings', 'The Fellowship of the Ring'],
        ['1Harry Potter', "The Philosopher's Stone"],
        ['1Harry Potter', 'The Chamber Of Secrets'],
      ]);
    });

    it('sorts by run name', () => {
      store.overrideSelector(getRunSelectorSort, {
        key: {type: SortType.RUN_NAME},
        direction: SortDirection.UNSET,
      });
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, jasmine.any)
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
            buildRun({id: 'book3', name: "The Philosopher's Stone"}),
          ])
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
        tolkien: {aliasText: 'The Lord of the Rings', aliasNumber: 2},
      });
      selectSpy
        .withArgs(getRuns, {experimentId: 'tolkien'})
        .and.returnValue(
          of([buildRun({id: 'book3', name: 'The Fellowship of the Ring'})])
        );

      const fixture = createComponent(
        ['rowling', 'tolkien'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['1Harry Potter', "The Philosopher's Stone"],
        ['1Harry Potter', 'The Chamber Of Secrets'],
        ['1Harry Potter', "The Philosopher's Stone"],
        ['2The Lord of the Rings', 'The Fellowship of the Ring'],
      ]);

      store.overrideSelector(getRunSelectorSort, {
        key: {type: SortType.RUN_NAME},
        direction: SortDirection.ASC,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['1Harry Potter', 'The Chamber Of Secrets'],
        ['2The Lord of the Rings', 'The Fellowship of the Ring'],
        ['1Harry Potter', "The Philosopher's Stone"],
        ['1Harry Potter', "The Philosopher's Stone"],
      ]);

      store.overrideSelector(getRunSelectorSort, {
        key: {type: SortType.RUN_NAME},
        direction: SortDirection.DESC,
      });
      store.refreshState();
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['1Harry Potter', "The Philosopher's Stone"],
        ['1Harry Potter', "The Philosopher's Stone"],
        ['2The Lord of the Rings', 'The Fellowship of the Ring'],
        ['1Harry Potter', 'The Chamber Of Secrets'],
      ]);
    });
  });

  describe('regex filtering', () => {
    let selectSpy: jasmine.Spy;

    beforeEach(() => {
      // To make sure we only return the runs when called with the right props.
      selectSpy = spyOn(store, 'select').and.callThrough();
    });

    [
      {
        regexString: '',
        expectedTableContent: [
          ['1Harry Potter', "The Philosopher's Stone"],
          ['1Harry Potter', 'The Chamber Of Secrets'],
          ['2The Lord of the Rings', 'The Fellowship of the Ring'],
          ['2The Lord of the Rings', 'The Silmarillion'],
        ],
      },
      {
        regexString: '.*',
        expectedTableContent: [
          ['1Harry Potter', "The Philosopher's Stone"],
          ['1Harry Potter', 'The Chamber Of Secrets'],
          ['2The Lord of the Rings', 'The Fellowship of the Ring'],
          ['2The Lord of the Rings', 'The Silmarillion'],
        ],
      },
      {
        regexString: '.+arr',
        expectedTableContent: [
          ['1Harry Potter', "The Philosopher's Stone"],
          ['1Harry Potter', 'The Chamber Of Secrets'],
        ],
      },
      {
        regexString: 'mar',
        expectedTableContent: [['2The Lord of the Rings', 'The Silmarillion']],
      },
      {
        regexString: '[m,H]ar',
        expectedTableContent: [
          ['1Harry Potter', "The Philosopher's Stone"],
          ['1Harry Potter', 'The Chamber Of Secrets'],
          ['2The Lord of the Rings', 'The Silmarillion'],
        ],
      },
    ].forEach(({regexString, expectedTableContent}) => {
      it(`filters with regex string: ${regexString}`, () => {
        const filterSubject = new ReplaySubject<string>(1);
        filterSubject.next('');
        selectSpy
          .withArgs(getRunSelectorRegexFilter)
          .and.returnValue(filterSubject);
        selectSpy
          .withArgs(TEST_ONLY.getRunsLoading, jasmine.any)
          .and.returnValue(of(false));
        selectSpy
          .withArgs(getRuns, {experimentId: 'rowling'})
          .and.returnValue(
            of([
              buildRun({id: 'book1', name: "The Philosopher's Stone"}),
              buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
            ])
          );
        store.overrideSelector(getExperimentIdToExperimentAliasMap, {
          rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
          tolkien: {aliasText: 'The Lord of the Rings', aliasNumber: 2},
        });
        selectSpy
          .withArgs(getRuns, {experimentId: 'tolkien'})
          .and.returnValue(
            of([
              buildRun({id: 'book3', name: 'The Fellowship of the Ring'}),
              buildRun({id: 'book4', name: 'The Silmarillion'}),
            ])
          );

        filterSubject.next(regexString);

        const fixture = createComponent(
          ['rowling', 'tolkien'],
          [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
        );
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual(expectedTableContent);
      });
    });

    it('filters by legacy experiment alias and run name put together', () => {
      selectSpy
        .withArgs(getExperiment, {experimentId: 'rowling'})
        .and.returnValue(
          of(
            buildExperiment({
              name: 'Harry Potter',
            })
          )
        );

      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, jasmine.any)
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );

      selectSpy
        .withArgs(getExperiment, {experimentId: 'tolkien'})
        .and.returnValue(
          of(
            buildExperiment({
              name: 'The Lord of the Rings',
            })
          )
        );
      selectSpy
        .withArgs(getRuns, {experimentId: 'tolkien'})
        .and.returnValue(
          of([
            buildRun({id: 'book3', name: 'The Fellowship of the Ring'}),
            buildRun({id: 'book4', name: 'The Silmarillion'}),
          ])
        );

      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'HPz', aliasNumber: 1},
        tolkien: {aliasText: 'LotR', aliasNumber: 2},
      });
      store.overrideSelector(getRunSelectorRegexFilter, 'ing');

      const fixture = createComponent(
        ['rowling', 'tolkien'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );

      fixture.detectChanges();
      expect(getTableRowTextContent(fixture)).toEqual([
        ['2LotR', 'The Fellowship of the Ring'],
      ]);

      // Alias for Harry Potter contains "z". Since legacy Polymer-based
      // tf-run-selector and the new Angular run selector match regex
      // against '<alias>/<run name>' instead of '<experiment>/<run name>',
      // below regex matches:
      // - LotR/The S(ilmarillion)
      store.overrideSelector(getRunSelectorRegexFilter, 'o[^z]+/.+S[ei]');
      store.refreshState();
      fixture.detectChanges();
      expect(getTableRowTextContent(fixture)).toEqual([
        ['2LotR', 'The Silmarillion'],
      ]);
    });

    it('filters only by run name when experiment column is omitted', () => {
      selectSpy
        .withArgs(TEST_ONLY.getRunsLoading, jasmine.any)
        .and.returnValue(of(false));
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      selectSpy
        .withArgs(getRuns, {experimentId: 'tolkien'})
        .and.returnValue(
          of([
            buildRun({id: 'book3', name: 'The Fellowship of the Ring'}),
            buildRun({id: 'book4', name: 'The Silmarillion'}),
          ])
        );
      // If experiment name were to be matched, it would match "Lord".
      store.overrideSelector(getRunSelectorRegexFilter, 'o\\w*r');

      const fixture = createComponent(
        ['rowling', 'tolkien'],
        [RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ["The Philosopher's Stone"],
      ]);
    });

    it('does not break app when regex string is illegal RegExp', () => {
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      selectSpy
        .withArgs(getRuns, {experimentId: 'tolkien'})
        .and.returnValue(
          of([
            buildRun({id: 'book3', name: 'The Fellowship of the Ring'}),
            buildRun({id: 'book4', name: 'The Silmarillion'}),
          ])
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
        tolkien: {aliasText: 'The Lord of the Rings', aliasNumber: 2},
      });

      // Square bracket needs to be closed.
      store.overrideSelector(getRunSelectorRegexFilter, '[The Fellow');

      const fixture = createComponent(
        ['rowling', 'tolkien'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      // Renders an empty table when there is an error.
      expect(getTableRowTextContent(fixture)).toEqual([]);

      // Test the update afterwards and see if it works.
      store.overrideSelector(getRunSelectorRegexFilter, 'The Fellow');
      store.refreshState();
      fixture.detectChanges();

      expect(getTableRowTextContent(fixture)).toEqual([
        ['2The Lord of the Rings', 'The Fellowship of the Ring'],
      ]);
    });

    it('does not render select all when no items match the regex', () => {
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
      });

      store.overrideSelector(getRunSelectorRegexFilter, 'YOUWILLNOTMATCHME');

      const fixture = createComponent(
        ['rowling'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      // Renders an empty table when there is an error.
      expect(getTableRowTextContent(fixture)).toEqual([]);

      expect(
        fixture.nativeElement.querySelector(Selector.SELECT_ALL_ROW)
      ).toBeNull();
    });

    it('dispatches action when user types on the input field', () => {
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );

      // Square bracket needs to be closed.
      store.overrideSelector(getRunSelectorRegexFilter, '[The Fellow');

      const fixture = createComponent(
        ['rowling'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      sendKeys(fixture, fixture.debugElement.query(By.css('input')), 'hA');

      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectorRegexFilterChanged({
          regexString: 'hA',
        })
      );
    });

    it('shows no match string when regex does not match any item', () => {
      selectSpy
        .withArgs(getRuns, {experimentId: 'rowling'})
        .and.returnValue(
          of([
            buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          ])
        );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
      });

      store.overrideSelector(getRunSelectorRegexFilter, 'DO_NOT_MATCH');

      const fixture = createComponent(
        ['rowling'],
        [RunsTableColumn.EXPERIMENT_NAME, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('.no-runs')).nativeElement.textContent
      ).toContain('No runs match "DO_NOT_MATCH"');
    });
  });

  describe('checkbox', () => {
    it('renders header checkbox as check when all items in a page are selected', () => {
      store.overrideSelector(getRunSelectorPaginationOption, {
        pageIndex: 0,
        pageSize: 2,
      });
      // pageSize is 2 so book3 is out of current page.
      store.overrideSelector(
        getCurrentRouteRunSelection,
        new Map([
          ['book1', true],
          ['book2', true],
          ['book3', false],
        ])
      );
      store.overrideSelector(getRuns, [
        buildRun({id: 'book1', name: "The Philosopher's Stone"}),
        buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
        buildRun({id: 'book3', name: 'The Prisoner of Azkaban'}),
      ]);
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
      });

      const fixture = createComponent(
        ['rowling'],
        [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME],
        true /* usePagination */
      );
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector(
        Selector.HEADER_CHECKBOX
      );

      expect(checkbox.classList.contains('mat-checkbox-checked')).toBe(true);
    });

    it(
      'renders header checkbox as a line when partial items in a page are ' +
        'selected',
      async () => {
        store.overrideSelector(getRunSelectorPaginationOption, {
          pageIndex: 0,
          pageSize: 2,
        });
        store.overrideSelector(
          getCurrentRouteRunSelection,
          new Map([
            ['book1', true],
            ['book2', false],
            ['book3', true],
          ])
        );
        store.overrideSelector(getRuns, [
          buildRun({id: 'book1', name: "The Philosopher's Stone"}),
          buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          buildRun({id: 'book3', name: 'The Prisoner of Azkaban'}),
        ]);

        const fixture = createComponent(
          ['rowling'],
          [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME],
          true /* usePagination */
        );
        fixture.detectChanges();

        const checkbox = fixture.nativeElement.querySelector(
          Selector.HEADER_CHECKBOX
        );

        expect(checkbox.classList.contains('mat-checkbox-indeterminate')).toBe(
          true
        );
      }
    );

    it('dispatches runSelectionToggled on checkbox click', async () => {
      store.overrideSelector(getRuns, [
        buildRun({id: 'book1', name: "The Philosopher's Stone"}),
        buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
        buildRun({id: 'book3', name: 'The Prisoner of Azkaban'}),
      ]);

      const fixture = createComponent(
        ['rowling'],
        [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME],
        true /* usePagination */
      );
      fixture.detectChanges();
      await fixture.whenStable();

      // mat-table's content somehow does not end up in DebugElement.
      const rows = fixture.nativeElement.querySelectorAll(Selector.ITEM_ROW);
      const [book1, book2] = rows;
      book2.querySelector('mat-checkbox input').click();
      book1.querySelector('mat-checkbox input').click();

      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectionToggled({
          runId: 'book2',
        })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        runSelectionToggled({
          runId: 'book1',
        })
      );
    });

    it(
      'dispatches runPageSelectionToggled with current page when click on ' +
        'header',
      () => {
        store.overrideSelector(getRunSelectorPaginationOption, {
          pageIndex: 0,
          pageSize: 2,
        });
        store.overrideSelector(getRuns, [
          buildRun({id: 'book1', name: "The Philosopher's Stone"}),
          buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
          buildRun({id: 'book3', name: 'The Prisoner of Azkaban'}),
        ]);

        const fixture = createComponent(
          ['rowling'],
          [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME],
          true /* usePagination */
        );
        fixture.detectChanges();

        fixture.nativeElement
          .querySelector(Selector.HEADER_CHECKBOX)
          .querySelector('input')
          .click();

        expect(dispatchSpy).toHaveBeenCalledWith(
          runPageSelectionToggled({
            runIds: ['book1', 'book2'],
          })
        );
      }
    );
  });

  describe('"too many runs" alert', () => {
    function createRuns(runCount: number): Run[] {
      const runs = [];
      for (let i = 0; i < runCount; i++) {
        runs.push(
          buildRun({
            id: `run${i}`,
            name: `run${i}`,
          })
        );
      }
      return runs;
    }

    const tooManyRunsAlertMessage = jasmine.stringMatching('exceeds');

    it('triggers when number of runs exceeds limit', () => {
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT)
      );
      const fixture = createComponent(
        ['exp1'],
        [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(actualActions).toEqual([runTableShown({experimentIds: ['exp1']})]);

      // Change # of runs to 1 over limit.
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      store.refreshState();

      expect(actualActions).toEqual([
        runTableShown({experimentIds: ['exp1']}),
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
      ]);
    });

    it('does not show when the table has no checkbox column', () => {
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = createComponent(['exp1'], [RunsTableColumn.RUN_NAME]);
      fixture.detectChanges();

      expect(actualActions).toEqual([runTableShown({experimentIds: ['exp1']})]);
    });

    it('does not show when already shown', () => {
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = createComponent(
        ['exp1'],
        [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(actualActions).toEqual([
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
        runTableShown({experimentIds: ['exp1']}),
      ]);

      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 2)
      );
      store.refreshState();

      expect(actualActions).toEqual([
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
        runTableShown({experimentIds: ['exp1']}),
      ]);
    });

    it('re-shows after a new route with too many runs', () => {
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = createComponent(
        ['exp1'],
        [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(actualActions).toEqual([
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
        runTableShown({experimentIds: ['exp1']}),
      ]);

      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('456'));
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      store.refreshState();

      expect(actualActions).toEqual([
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
        runTableShown({experimentIds: ['exp1']}),
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
      ]);
    });

    it('does not re-show after a new route with too few runs', () => {
      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT + 1)
      );
      const fixture = createComponent(
        ['exp1'],
        [RunsTableColumn.CHECKBOX, RunsTableColumn.RUN_NAME]
      );
      fixture.detectChanges();

      expect(actualActions).toEqual([
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
        runTableShown({experimentIds: ['exp1']}),
      ]);

      store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('456'));
      store.overrideSelector(
        getRuns,
        createRuns(MAX_NUM_RUNS_TO_ENABLE_BY_DEFAULT)
      );
      store.refreshState();

      expect(actualActions).toEqual([
        alertActions.alertReported({
          localizedMessage: tooManyRunsAlertMessage as any,
        }),
        runTableShown({experimentIds: ['exp1']}),
      ]);
    });
  });

  describe('hparams and metrics', () => {
    function createComponent(
      hparamSpecs: HparamSpec[],
      metricSpecs: MetricSpec[],
      showHparamsAndMetrics = true
    ) {
      store.overrideSelector(
        hparamsSelectors.getExperimentsHparamsAndMetricsSpecs,
        {
          hparams: hparamSpecs,
          metrics: metricSpecs,
        }
      );
      store.overrideSelector(getExperimentIdToExperimentAliasMap, {
        library: {aliasText: 'Library', aliasNumber: 1},
      });
      const fixture = TestBed.createComponent(RunsTableContainer);
      fixture.componentInstance.experimentIds = ['library'];
      fixture.componentInstance.showHparamsAndMetrics = showHparamsAndMetrics;
      fixture.detectChanges();
      return fixture;
    }

    it('renders hparams and metrics when they exist', () => {
      const hparamSpecs = [
        buildHparamSpec({
          name: 'batch_size',
          displayName: 'Batch size',
          domain: {type: DomainType.INTERVAL, minValue: 16, maxValue: 128},
        }),
        buildHparamSpec({
          name: 'dropout',
          displayName: '',
          domain: {type: DomainType.INTERVAL, minValue: 0.3, maxValue: 0.8},
        }),
      ];
      const metricSpecs = [
        buildMetricSpec({tag: 'acc', displayName: 'Accuracy'}),
        buildMetricSpec({tag: 'loss', displayName: ''}),
      ];
      store.overrideSelector(
        hparamsSelectors.getHparamFilterMap,
        new Map([
          [
            'batch_size',
            buildIntervalFilter({filterLowerValue: 16, filterUpperValue: 128}),
          ],
          [
            'dropout',
            buildIntervalFilter({filterLowerValue: 0.3, filterUpperValue: 0.8}),
          ],
        ])
      );
      store.overrideSelector(
        hparamsSelectors.getMetricFilterMap,
        new Map([
          [
            'acc',
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: 0,
              filterUpperValue: 1,
            }),
          ],
          [
            'loss',
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: 0,
              filterUpperValue: 1,
            }),
          ],
        ])
      );
      store.overrideSelector(getRuns, [
        buildRun({
          id: 'book1',
          name: 'Book 1',
          hparams: [{name: 'batch_size', value: 32}],
        }),
        buildRun({
          id: 'book2',
          name: 'Book 2',
          hparams: [
            {name: 'batch_size', value: 128},
            {name: 'dropout', value: 0.3},
          ],
          metrics: [{tag: 'acc', value: 0.91}],
        }),
        buildRun({
          id: 'book3',
          name: 'Book 3',
          metrics: [
            {tag: 'acc', value: 0.7},
            {tag: 'loss', value: 0},
          ],
        }),
      ]);

      const fixture = createComponent(hparamSpecs, metricSpecs);
      const columnHeaders = fixture.nativeElement.querySelectorAll(
        Selector.HEADER_COLUMN + ' .name'
      );
      expect([...columnHeaders].map((header) => header.textContent)).toEqual([
        'Batch size',
        'dropout',
        'Accuracy',
        'loss',
      ]);

      expect(getTableRowTextContent(fixture)).toEqual([
        ['Book 1', '32', '', '', ''],
        ['Book 2', '128', '0.3', '0.91', ''],
        ['Book 3', '', '', '0.7', '0'],
      ]);
    });

    it('does not load the hparams filter when it is off', () => {
      const selectSpy = spyOn(store, 'select').and.callThrough();
      const hparamSpecs = [
        buildHparamSpec({
          name: 'batch_size',
          displayName: 'Batch size',
          domain: {type: DomainType.INTERVAL, minValue: 16, maxValue: 128},
        }),
        buildHparamSpec({
          name: 'dropout',
          displayName: '',
          domain: {type: DomainType.INTERVAL, minValue: 0.3, maxValue: 0.8},
        }),
      ];
      const metricSpecs = [
        buildMetricSpec({tag: 'acc', displayName: 'Accuracy'}),
        buildMetricSpec({tag: 'loss', displayName: ''}),
      ];

      selectSpy
        .withArgs(hparamsSelectors.getHparamFilterMap, jasmine.any(String))
        .and.throwError('Should not be read');
      selectSpy
        .withArgs(hparamsSelectors.getMetricFilterMap, jasmine.any(String))
        .and.throwError('Should not be read');

      store.overrideSelector(getRuns, [
        buildRun({
          id: 'book1',
          name: 'Book 1',
          hparams: [{name: 'batch_size', value: 32}],
        }),
        buildRun({
          id: 'book2',
          name: 'Book 2',
          hparams: [
            {name: 'batch_size', value: 128},
            {name: 'dropout', value: 0.3},
          ],
          metrics: [{tag: 'acc', value: 0.91}],
        }),
        buildRun({
          id: 'book3',
          name: 'Book 3',
          metrics: [
            {tag: 'acc', value: 0.7},
            {tag: 'loss', value: 0},
          ],
        }),
      ]);

      const fixture = createComponent(hparamSpecs, metricSpecs, false);
      expect(getTableRowTextContent(fixture)).toEqual([
        ['Book 1'],
        ['Book 2'],
        ['Book 3'],
      ]);
    });

    describe('filtering', () => {
      let TEST_HPARAM_SPECS: HparamSpec[];
      let TEST_METRIC_SPECS: MetricSpec[];

      function buildHparamFilterMap(
        otherValues: Array<[string, IntervalFilter | DiscreteFilter]> = []
      ): Map<string, IntervalFilter | DiscreteFilter> {
        return new Map([
          [
            'batch_size',
            buildIntervalFilter({filterLowerValue: 16, filterUpperValue: 128}),
          ],
          [
            'qaz',
            buildIntervalFilter({filterLowerValue: 0.3, filterUpperValue: 0.8}),
          ],
          ['foo', buildDiscreteFilter({filterValues: ['faz', 'bar']})],
          ...otherValues,
        ]);
      }

      function buildMetricFilterMap(
        otherValues: Array<[string, IntervalFilter]> = []
      ): Map<string, IntervalFilter> {
        return new Map([
          [
            'acc',
            buildIntervalFilter({filterLowerValue: 0, filterUpperValue: 1}),
          ],
          [
            'loss',
            buildIntervalFilter({filterLowerValue: 0.5, filterUpperValue: 1}),
          ],
          ...otherValues,
        ]);
      }

      beforeEach(() => {
        TEST_HPARAM_SPECS = [
          buildHparamSpec({
            name: 'batch_size',
            displayName: 'Batch size',
            domain: {type: DomainType.INTERVAL, minValue: 16, maxValue: 128},
          }),
          buildHparamSpec({
            name: 'qaz',
            displayName: '',
            domain: {type: DomainType.INTERVAL, minValue: 0.3, maxValue: 0.8},
          }),
          buildHparamSpec({
            name: 'foo',
            displayName: '',
            domain: {type: DomainType.DISCRETE, values: ['faz', 'bar', 'baz']},
          }),
        ];
        TEST_METRIC_SPECS = [
          buildMetricSpec({tag: 'acc', displayName: 'Accuracy'}),
          buildMetricSpec({tag: 'loss', displayName: ''}),
        ];
        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          buildHparamFilterMap()
        );
        store.overrideSelector(
          hparamsSelectors.getMetricFilterMap,
          buildMetricFilterMap()
        );
      });

      it('filters by discrete hparams', () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: 'id1',
            name: 'Book 1',
            hparams: [{name: 'foo', value: 'bar'}],
          }),
          buildRun({
            id: 'id2',
            name: 'Book 2',
            hparams: [{name: 'foo', value: 'baz'}],
          }),
          buildRun({
            id: 'id3',
            name: 'Book 3',
            hparams: [{name: 'foo', value: 'faz'}],
          }),
          buildRun({id: 'id4', name: 'Book 4', hparams: []}),
        ]);
        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          buildHparamFilterMap([
            [
              'foo',
              buildDiscreteFilter({
                includeUndefined: false,
                filterValues: ['bar', 'faz'],
              }),
            ],
          ])
        );

        const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 1', '', '', 'bar', '', ''],
          ['Book 3', '', '', 'faz', '', ''],
        ]);
      });

      it('allows filter for only undefined hparam value', () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: 'id1',
            name: 'Book 1',
            hparams: [{name: 'foo', value: 'bar'}],
          }),
          buildRun({
            id: 'id2',
            name: 'Book 2',
            hparams: [{name: 'foo', value: 'baz'}],
          }),
          buildRun({id: 'id3', name: 'Book 3', hparams: []}),
          buildRun({id: 'id4', name: 'Book 4', hparams: []}),
        ]);
        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          buildHparamFilterMap([
            [
              'foo',
              buildDiscreteFilter({includeUndefined: true, filterValues: []}),
            ],
          ])
        );

        const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 3', '', '', '', '', ''],
          ['Book 4', '', '', '', '', ''],
        ]);
      });

      it('filters by interval hparams', () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: 'id1',
            name: 'Book 1',
            hparams: [{name: 'qaz', value: 0.5}],
          }),
          buildRun({
            id: 'id2',
            name: 'Book 2',
            hparams: [{name: 'qaz', value: 1}],
          }),
          buildRun({
            id: 'id3',
            name: 'Book 3',
            hparams: [{name: 'qaz', value: 0}],
          }),
          buildRun({id: 'id4', name: 'Book 4', hparams: []}),
        ]);
        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          buildHparamFilterMap([
            [
              'qaz',
              buildIntervalFilter({
                includeUndefined: false,
                filterLowerValue: 0.4,
                filterUpperValue: 1,
              }),
            ],
          ])
        );

        const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 1', '', '0.5', '', '', ''],
          ['Book 2', '', '1', '', '', ''],
        ]);
      });

      it('filters by metric', () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: 'id1',
            name: 'Book 1',
            metrics: [{tag: 'acc', value: 0.5}],
          }),
          buildRun({
            id: 'id2',
            name: 'Book 2',
            metrics: [{tag: 'acc', value: 1}],
          }),
          buildRun({
            id: 'id3',
            name: 'Book 3',
            metrics: [{tag: 'acc', value: 0}],
          }),
        ]);
        store.overrideSelector(
          hparamsSelectors.getMetricFilterMap,
          buildMetricFilterMap([
            [
              'acc',
              buildIntervalFilter({
                includeUndefined: false,
                filterLowerValue: 0.4,
                filterUpperValue: 1,
              }),
            ],
          ])
        );

        const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 1', '', '', '', '0.5', ''],
          ['Book 2', '', '', '', '1', ''],
        ]);
      });

      it('allows filter for only undefined metric value', () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: 'id1',
            name: 'Book 1',
            metrics: [{tag: 'acc', value: 0.5}],
          }),
          buildRun({
            id: 'id2',
            name: 'Book 2',
            metrics: [{tag: 'acc', value: 1}],
          }),
          buildRun({id: 'id3', name: 'Book 3', metrics: []}),
        ]);
        store.overrideSelector(
          hparamsSelectors.getMetricFilterMap,
          buildMetricFilterMap([
            [
              'acc',
              buildIntervalFilter({
                includeUndefined: true,
                filterLowerValue: 5,
                filterUpperValue: 5,
              }),
            ],
          ])
        );

        const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 3', '', '', '', '', ''],
        ]);
      });

      it('does not filter by hparams or metrics when it does not show one', () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: 'id1',
            name: 'Book 1',
            hparams: [
              {name: 'foo', value: 'bar'},
              {name: 'qaz', value: 0.3},
            ],
            metrics: [{tag: 'acc', value: 0.3}],
          }),
          buildRun({
            id: 'id2',
            name: 'Book 2',
            hparams: [
              {name: 'foo', value: 'baz'},
              {name: 'qaz', value: 0.5},
            ],
          }),
          buildRun({
            id: 'id3',
            name: 'Book 3',
            hparams: [{name: 'foo', value: 'faz'}],
            metrics: [{tag: 'acc', value: 0.5}],
          }),
          buildRun({id: 'id4', name: 'Book 4', hparams: []}),
        ]);
        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          new Map([
            [
              'foo',
              buildDiscreteFilter({
                includeUndefined: false,
                filterValues: ['bar', 'faz'],
              }),
            ],
          ])
        );
        store.overrideSelector(
          hparamsSelectors.getMetricFilterMap,
          new Map([
            [
              'acc',
              buildIntervalFilter({
                includeUndefined: false,
                filterLowerValue: 0.4,
                filterUpperValue: 0.5,
              }),
            ],
          ])
        );

        const showHparamAndMetric = false;
        const fixture = createComponent(
          TEST_HPARAM_SPECS,
          TEST_METRIC_SPECS,
          showHparamAndMetric
        );
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 1'],
          ['Book 2'],
          ['Book 3'],
          ['Book 4'],
        ]);
      });

      it('responds to filter changes', () => {
        store.overrideSelector(getRuns, [
          buildRun({
            id: 'id1',
            name: 'Book 1',
            hparams: [{name: 'foo', value: 'bar'}],
          }),
          buildRun({
            id: 'id2',
            name: 'Book 2',
            hparams: [{name: 'foo', value: 'baz'}],
          }),
          buildRun({
            id: 'id3',
            name: 'Book 3',
            hparams: [{name: 'foo', value: 'faz'}],
          }),
          buildRun({id: 'id4', name: 'Book 4', hparams: []}),
        ]);

        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          buildHparamFilterMap([
            [
              'foo',
              buildDiscreteFilter({
                includeUndefined: false,
                filterValues: ['bar', 'faz'],
              }),
            ],
          ])
        );

        const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
        fixture.detectChanges();

        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          buildHparamFilterMap([
            [
              'foo',
              buildDiscreteFilter({
                includeUndefined: false,
                filterValues: ['faz'],
              }),
            ],
          ])
        );
        store.refreshState();
        fixture.detectChanges();

        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 3', '', '', 'faz', '', ''],
        ]);
      });

      describe('filtering ui', () => {
        beforeEach(() => {
          store.overrideSelector(getRuns, [
            buildRun({
              id: 'id1',
              name: 'Book 1',
              hparams: [{name: 'foo', value: 'bar'}],
            }),
            buildRun({
              id: 'id2',
              name: 'Book 2',
              hparams: [{name: 'foo', value: 'baz'}],
              metrics: [{tag: 'acc', value: 0.995}],
            }),
            buildRun({
              id: 'id3',
              name: 'Book 3',
              hparams: [{name: 'foo', value: 'faz'}],
              metrics: [{tag: 'acc', value: 0.25}],
            }),
            buildRun({id: 'id4', name: 'Book 4', hparams: []}),
          ]);
        });

        it('shows discrete hparams with checkboxes', () => {
          store.overrideSelector(
            hparamsSelectors.getHparamFilterMap,
            buildHparamFilterMap([
              [
                'foo',
                buildDiscreteFilter({
                  possibleValues: ['faz', 'bar', 'baz'],
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[3].querySelector('button').click();
          const menuItems = getOverlayMenuItems();

          expect(menuItems.length).toBe(4);
          expect(
            menuItems.map((menuItem) => {
              return menuItem
                .querySelector('mat-checkbox')!
                .textContent!.trim();
            })
          ).toEqual(['(show empty value)', 'faz', 'bar', 'baz']);
        });

        it('dispatches hparam action when clicking on the checkbox', () => {
          store.overrideSelector(
            hparamsSelectors.getHparamFilterMap,
            buildHparamFilterMap([
              [
                'foo',
                buildDiscreteFilter({
                  includeUndefined: false,
                  possibleValues: ['faz', 'bar', 'baz'],
                  filterValues: ['bar', 'faz'],
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[3].querySelector('button').click();
          const [, menuItemFoo] = getOverlayMenuItems();

          const checkbox = menuItemFoo.querySelector(
            'mat-checkbox input'
          ) as HTMLElement;
          checkbox.click();
          expect(dispatchSpy).toHaveBeenCalledWith(
            hparamsActions.hparamsDiscreteHparamFilterChanged({
              experimentIds: ['library'],
              hparamName: 'foo',
              includeUndefined: false,
              filterValues: ['bar'],
            })
          );
        });

        it('dispatches includeUndefined change for discrete hparam change', () => {
          store.overrideSelector(
            hparamsSelectors.getHparamFilterMap,
            buildHparamFilterMap([
              [
                'foo',
                buildDiscreteFilter({
                  includeUndefined: false,
                  possibleValues: ['faz', 'bar', 'baz'],
                  filterValues: ['bar', 'faz'],
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[3].querySelector('button').click();
          const [includeUndefined] = getOverlayMenuItems();

          const checkbox = includeUndefined.querySelector(
            'mat-checkbox input'
          ) as HTMLElement;
          checkbox.click();
          expect(dispatchSpy).toHaveBeenCalledWith(
            hparamsActions.hparamsDiscreteHparamFilterChanged({
              experimentIds: ['library'],
              hparamName: 'foo',
              includeUndefined: true,
              filterValues: ['bar', 'faz'],
            })
          );
        });

        it('shows interval hparams with tb-range-input', () => {
          store.overrideSelector(
            hparamsSelectors.getHparamFilterMap,
            buildHparamFilterMap([
              [
                'batch_size',
                buildIntervalFilter({
                  includeUndefined: true,
                  filterLowerValue: 16,
                  filterUpperValue: 128,
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[1].querySelector('button').click();
          const menuItems = getOverlayMenuItems();

          expect(menuItems.length).toBe(2);
          const [min, max] = Array.from(menuItems[1].querySelectorAll('input'));
          expect(min.value).toBe('16');
          expect(max.value).toBe('128');
        });

        it('dispatches hparam action when tb-range-input changes', () => {
          store.overrideSelector(
            hparamsSelectors.getHparamFilterMap,
            buildHparamFilterMap([
              [
                'batch_size',
                buildIntervalFilter({
                  includeUndefined: true,
                  filterLowerValue: 16,
                  filterUpperValue: 128,
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[1].querySelector('button').click();
          const [, slider] = getOverlayMenuItems();

          const minValue = slider.querySelectorAll(
            'tb-range-input input'
          )[0] as HTMLInputElement;
          minValue.value = '32';
          minValue.dispatchEvent(new Event('change'));
          expect(dispatchSpy).toHaveBeenCalledWith(
            hparamsActions.hparamsIntervalHparamFilterChanged({
              experimentIds: ['library'],
              hparamName: 'batch_size',
              includeUndefined: true,
              filterLowerValue: 32,
              filterUpperValue: 128,
            })
          );
        });

        it('dispatches includeUndefined change for interval hparam change', () => {
          store.overrideSelector(
            hparamsSelectors.getHparamFilterMap,
            buildHparamFilterMap([
              [
                'batch_size',
                buildIntervalFilter({
                  includeUndefined: true,
                  filterLowerValue: 16,
                  filterUpperValue: 128,
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[1].querySelector('button').click();
          const [includeUndefined] = getOverlayMenuItems();

          const checkbox = includeUndefined.querySelector(
            'mat-checkbox input'
          ) as HTMLElement;
          checkbox.click();
          expect(dispatchSpy).toHaveBeenCalledWith(
            hparamsActions.hparamsIntervalHparamFilterChanged({
              experimentIds: ['library'],
              hparamName: 'batch_size',
              includeUndefined: false,
              filterLowerValue: 16,
              filterUpperValue: 128,
            })
          );
        });

        it('shows metric value with tb-range-input based on runs', () => {
          store.overrideSelector(
            hparamsSelectors.getMetricFilterMap,
            buildMetricFilterMap([
              [
                'acc',
                buildIntervalFilter({
                  includeUndefined: false,
                  filterLowerValue: 0.25,
                  filterUpperValue: 0.995,
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[4].querySelector('button').click();
          const menuItems = getOverlayMenuItems();

          expect(menuItems.length).toBe(2);
          const [min, max] = Array.from(menuItems[1].querySelectorAll('input'));
          expect(min.value).toBe('0.25');
          expect(max.value).toBe('0.995');
        });

        it('dispatches metric action when tb-range-input changes', () => {
          store.overrideSelector(
            hparamsSelectors.getMetricFilterMap,
            buildMetricFilterMap([
              [
                'acc',
                buildIntervalFilter({
                  includeUndefined: false,
                  filterLowerValue: 0.25,
                  filterUpperValue: 1,
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[4].querySelector('button').click();
          const [, slider] = getOverlayMenuItems();

          const maxValue = slider.querySelectorAll(
            'tb-range-input input'
          )[1] as HTMLInputElement;
          maxValue.value = '0.32';
          maxValue.dispatchEvent(new Event('change'));
          expect(dispatchSpy).toHaveBeenCalledWith(
            hparamsActions.hparamsMetricFilterChanged({
              experimentIds: ['library'],
              metricTag: 'acc',
              includeUndefined: false,
              filterLowerValue: 0.25,
              filterUpperValue: 0.32,
            })
          );
        });

        it('dispatches metric action for includeUndefined change', () => {
          store.overrideSelector(
            hparamsSelectors.getMetricFilterMap,
            buildMetricFilterMap([
              [
                'acc',
                buildIntervalFilter({
                  includeUndefined: false,
                  filterLowerValue: 0.25,
                  filterUpperValue: 1,
                }),
              ],
            ])
          );
          const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
          fixture.detectChanges();

          const columnHeaders = fixture.nativeElement.querySelectorAll(
            Selector.HEADER_COLUMN
          );
          columnHeaders[4].querySelector('button').click();
          const [checkbox] = getOverlayMenuItems();
          const input = checkbox.querySelector('input') as HTMLInputElement;

          input.click();

          expect(dispatchSpy).toHaveBeenCalledWith(
            hparamsActions.hparamsMetricFilterChanged({
              experimentIds: ['library'],
              metricTag: 'acc',
              includeUndefined: true,
              filterLowerValue: 0.25,
              filterUpperValue: 1,
            })
          );
        });
      });

      it('does not sort because you click on the filter menu button', () => {
        store.overrideSelector(
          hparamsSelectors.getHparamFilterMap,
          buildHparamFilterMap([
            [
              'foo',
              buildDiscreteFilter({
                possibleValues: ['faz', 'bar', 'baz'],
              }),
            ],
          ])
        );
        store.overrideSelector(
          hparamsSelectors.getMetricFilterMap,
          buildMetricFilterMap([
            [
              'acc',
              buildIntervalFilter({
                includeUndefined: false,
                filterLowerValue: 0.25,
                filterUpperValue: 1,
              }),
            ],
          ])
        );
        const fixture = createComponent(TEST_HPARAM_SPECS, TEST_METRIC_SPECS);
        fixture.detectChanges();

        const columnHeaders = fixture.nativeElement.querySelectorAll(
          Selector.HEADER_COLUMN
        );
        columnHeaders[3].querySelector('button').click();
        columnHeaders[4].querySelector('button').click();

        for (const [action] of dispatchSpy.calls.allArgs()) {
          expect(action.type).not.toBe(runSelectorSortChanged.type);
        }
      });
    });

    function setNoFilterHparamsAndMetrics(
      hparamSpecs: HparamSpec[],
      metricsSpecs: MetricSpec[]
    ) {
      const hparamFilterMap = new Map<
        string,
        IntervalFilter | DiscreteFilter
      >();
      for (const spec of hparamSpecs) {
        if (spec.domain.type === DomainType.INTERVAL) {
          hparamFilterMap.set(
            spec.name,
            buildIntervalFilter({
              includeUndefined: true,
              filterLowerValue: spec.domain.minValue,
              filterUpperValue: spec.domain.maxValue,
            })
          );
        } else {
          hparamFilterMap.set(
            spec.name,
            buildDiscreteFilter({
              includeUndefined: true,
              filterValues: spec.domain.values,
            })
          );
        }
      }
      store.overrideSelector(
        hparamsSelectors.getHparamFilterMap,
        hparamFilterMap
      );

      const metricFilterMap = new Map<string, IntervalFilter>();
      for (const spec of metricsSpecs) {
        metricFilterMap.set(
          spec.tag,
          buildIntervalFilter({
            includeUndefined: true,
            filterLowerValue: -Infinity,
            filterUpperValue: Infinity,
          })
        );
      }

      store.overrideSelector(
        hparamsSelectors.getMetricFilterMap,
        metricFilterMap
      );
    }

    describe('sorting', () => {
      it('sorts by hparam value', () => {
        const hparamSpecs = [
          buildHparamSpec({
            name: 'batch_size',
            displayName: 'Batch size',
            domain: {type: DomainType.INTERVAL, minValue: 16, maxValue: 128},
          }),
          buildHparamSpec({
            name: 'optimizer',
            displayName: '',
            domain: {type: DomainType.DISCRETE, values: ['adam', 'sgd']},
          }),
        ];
        const metricSpecs = [
          buildMetricSpec({tag: 'acc', displayName: 'Accuracy'}),
          buildMetricSpec({tag: 'loss', displayName: ''}),
        ];
        setNoFilterHparamsAndMetrics(hparamSpecs, metricSpecs);
        store.overrideSelector(getRunSelectorSort, {
          key: {type: SortType.HPARAM, name: 'batch_size'},
          direction: SortDirection.DESC,
        });

        store.overrideSelector(getRuns, [
          buildRun({
            id: 'book1',
            name: 'Book 1',
            hparams: [{name: 'batch_size', value: 32}],
          }),
          buildRun({
            id: 'book2',
            name: 'Book 2',
            hparams: [
              {name: 'batch_size', value: 128},
              {name: 'optimizer', value: 'sgd'},
            ],
            metrics: [{tag: 'acc', value: 0.91}],
          }),
          buildRun({
            id: 'book3',
            name: 'Book 3',
            hparams: [{name: 'optimizer', value: 'adam'}],
            metrics: [
              {tag: 'acc', value: 0.7},
              {tag: 'loss', value: 0},
            ],
          }),
        ]);

        const fixture = createComponent(hparamSpecs, metricSpecs);
        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 2', '128', 'sgd', '0.91', ''],
          ['Book 1', '32', '', '', ''],
          ['Book 3', '', 'adam', '0.7', '0'],
        ]);

        store.overrideSelector(getRunSelectorSort, {
          key: {type: SortType.HPARAM, name: 'optimizer'},
          direction: SortDirection.ASC,
        });
        store.refreshState();
        fixture.detectChanges();
        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 3', '', 'adam', '0.7', '0'],
          ['Book 2', '128', 'sgd', '0.91', ''],
          ['Book 1', '32', '', '', ''],
        ]);

        store.overrideSelector(getRunSelectorSort, {
          key: {type: SortType.HPARAM, name: 'optimizer'},
          direction: SortDirection.DESC,
        });
        store.refreshState();
        fixture.detectChanges();
        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 2', '128', 'sgd', '0.91', ''],
          ['Book 3', '', 'adam', '0.7', '0'],
          ['Book 1', '32', '', '', ''],
        ]);
      });

      it('sorts by metric value', () => {
        const hparamSpecs = [
          buildHparamSpec({
            name: 'batch_size',
            displayName: 'Batch size',
            domain: {type: DomainType.INTERVAL, minValue: 16, maxValue: 128},
          }),
        ];
        const metricSpecs = [
          buildMetricSpec({tag: 'acc', displayName: 'Accuracy'}),
          buildMetricSpec({tag: 'loss', displayName: ''}),
        ];
        setNoFilterHparamsAndMetrics(hparamSpecs, metricSpecs);
        store.overrideSelector(getRunSelectorSort, {
          key: {type: SortType.METRIC, tag: 'acc'},
          direction: SortDirection.DESC,
        });

        store.overrideSelector(getRuns, [
          buildRun({
            id: 'book1',
            name: 'Book 1',
            hparams: [{name: 'batch_size', value: 32}],
          }),
          buildRun({
            id: 'book2',
            name: 'Book 2',
            hparams: [{name: 'batch_size', value: 128}],
            metrics: [{tag: 'acc', value: 0.91}],
          }),
          buildRun({
            id: 'book3',
            name: 'Book 3',
            metrics: [
              {tag: 'acc', value: 0.7},
              {tag: 'loss', value: 0},
            ],
          }),
        ]);

        const fixture = createComponent(hparamSpecs, metricSpecs);
        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 2', '128', '0.91', ''],
          ['Book 3', '', '0.7', '0'],
          ['Book 1', '32', '', ''],
        ]);

        store.overrideSelector(getRunSelectorSort, {
          key: {type: SortType.METRIC, tag: 'acc'},
          direction: SortDirection.ASC,
        });
        store.refreshState();
        fixture.detectChanges();
        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 3', '', '0.7', '0'],
          ['Book 2', '128', '0.91', ''],
          ['Book 1', '32', '', ''],
        ]);

        store.overrideSelector(getRunSelectorSort, {
          key: {type: SortType.METRIC, tag: 'loss'},
          direction: SortDirection.DESC,
        });
        store.refreshState();
        fixture.detectChanges();
        expect(getTableRowTextContent(fixture)).toEqual([
          ['Book 3', '', '0.7', '0'],
          ['Book 2', '128', '0.91', ''],
          ['Book 1', '32', '', ''],
        ]);
      });
    });
  });
});
