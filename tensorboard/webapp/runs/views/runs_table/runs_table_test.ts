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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSortModule} from '@angular/material/sort';
import {MatTableModule} from '@angular/material/table';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Store} from '@ngrx/store';
import {MockStore} from '@ngrx/store/testing';
import {of} from 'rxjs';
import {buildExperimentRouteFromId} from '../../../app_routing/testing';
import {State} from '../../../app_state';
import {actions as hparamsActions} from '../../../hparams';
import {
  getActiveRoute,
  getCurrentRouteRunSelection,
  getExperiment,
  getExperimentIdToExperimentAliasMap,
  getRunColorMap,
  getRuns,
  getRunSelectorRegexFilter,
  getRunsLoadState,
  getRunsTableHeaders,
  getRunsTableSortingInfo,
} from '../../../selectors';
import {MatIconTestingModule} from '../../../testing/mat_icon_module';
import {provideMockTbStore} from '../../../testing/utils';
import {DataLoadState} from '../../../types/data';
import {ExperimentAliasModule} from '../../../widgets/experiment_alias/experiment_alias_module';
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {RangeInputModule} from '../../../widgets/range_input/range_input_module';
import {DomainType} from '../../data_source/runs_data_source_types';
import {buildRun} from '../../store/testing';
import {RunsDataTable} from './runs_data_table';
import {RunsGroupMenuButtonComponent} from './runs_group_menu_button_component';
import {RunsGroupMenuButtonContainer} from './runs_group_menu_button_container';
import {RunsTableContainer} from './runs_table_container';
import {RunTableItem, RunsTableColumn} from './types';
import {
  ColumnHeaderType,
  SortingOrder,
} from '../../../widgets/data_table/types';
import {getFilteredRenderableRuns} from '../../../metrics/views/main_view/common_selectors';

describe('runs_table', () => {
  let store: MockStore<State>;
  let dispatchSpy: jasmine.Spy;

  afterEach(() => {
    store?.resetSelectors();
  });

  function createComponent(
    experimentIds: string[],
    columns?: RunsTableColumn[]
  ) {
    const fixture = TestBed.createComponent(RunsTableContainer);
    fixture.componentInstance.experimentIds = experimentIds;
    if (columns) {
      fixture.componentInstance.columns = columns;
    }
    fixture.detectChanges();

    return fixture;
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
        RunsDataTable,
        RunsGroupMenuButtonComponent,
        RunsGroupMenuButtonContainer,
        RunsTableContainer,
      ],
      providers: [provideMockTbStore()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    store = TestBed.inject<Store<State>>(Store) as MockStore<State>;
    store.overrideSelector(getRuns, []);
    store.overrideSelector(getRunsLoadState, {
      state: DataLoadState.NOT_LOADED,
      lastLoadedTimeInMs: null,
    });
    store.overrideSelector(getExperiment, null);
    store.overrideSelector(
      getCurrentRouteRunSelection,
      new Map() as ReturnType<typeof getCurrentRouteRunSelection>
    );
    store.overrideSelector(getRunSelectorRegexFilter, '');
    store.overrideSelector(getRunColorMap, {});
    store.overrideSelector(getExperimentIdToExperimentAliasMap, {
      rowling: {aliasText: 'Harry Potter', aliasNumber: 1},
      tolkien: {aliasText: 'The Lord of the Rings', aliasNumber: 2},
    });
    store.overrideSelector(getActiveRoute, buildExperimentRouteFromId('123'));
    dispatchSpy = spyOn(store, 'dispatch');
  });

  describe('runs data table integration', () => {
    beforeEach(() => {
      store.overrideSelector(getFilteredRenderableRuns, [
        {
          run: buildRun({
            id: 'id1',
            name: 'Book 1',
            hparams: [{name: 'qaz', value: 0.5}],
          }),
          experimentAlias: {aliasNumber: 0, aliasText: 'hp'},
          experimentName: 'HP',
          selected: true,
          runColor: 'fff',
          hparams: new Map([['qaz', 0.5]]),
          metrics: new Map<string, any>(),
        },
        {
          run: buildRun({
            id: 'id2',
            name: 'Book 2',
            hparams: [{name: 'qaz', value: 0.5}],
          }),
          experimentAlias: {aliasNumber: 0, aliasText: 'hp'},
          experimentName: 'HP',
          selected: true,
          runColor: 'fff',
          hparams: new Map([['qaz', 0.5]]),
          metrics: new Map<string, any>(),
        },
      ]);

      store.overrideSelector(getRunsTableHeaders, [
        {
          type: ColumnHeaderType.HPARAM,
          name: 'foo',
          displayName: 'Foo',
          enabled: true,
          removable: true,
          filterable: true,
          sortable: true,
          movable: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'qaz',
          displayName: 'Qaz',
          enabled: true,
          removable: true,
          filterable: true,
          sortable: true,
          movable: true,
        },
      ]);
    });

    it('adds interval filters', () => {
      const fixture = createComponent([], []);
      fixture.detectChanges();
      const dataTable = fixture.debugElement.query(By.directive(RunsDataTable));

      dataTable.componentInstance.addFilter.emit({
        name: 'qaz',
        value: {
          type: DomainType.INTERVAL,
          includeUndefined: true,
          filterLowerValue: 10,
          filterUpperValue: 20,
          minValue: 10,
          maxValue: 20,
        },
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        hparamsActions.dashboardHparamFilterAdded({
          name: 'qaz',
          filter: {
            type: DomainType.INTERVAL,
            includeUndefined: true,
            filterLowerValue: 10,
            filterUpperValue: 20,
            minValue: 10,
            maxValue: 20,
          },
        })
      );
    });

    it('adds discrete filters', () => {
      const fixture = createComponent([], []);
      fixture.detectChanges();
      const dataTable = fixture.debugElement.query(By.directive(RunsDataTable));

      dataTable.componentInstance.addFilter.emit({
        name: 'foo',
        value: {
          type: DomainType.DISCRETE,
          includeUndefined: true,
          filterValues: [2, 4, 6, 8],
          possibleValues: [2, 4, 6, 8, 10],
        },
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        hparamsActions.dashboardHparamFilterAdded({
          name: 'foo',
          filter: {
            type: DomainType.DISCRETE,
            includeUndefined: true,
            filterValues: [2, 4, 6, 8],
            possibleValues: [2, 4, 6, 8, 10],
          },
        })
      );
    });
  });

  describe('runs data table', () => {
    it('renders data table when hparam flag is on', () => {
      const fixture = createComponent(['book']);
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.directive(RunsDataTable))
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('runs-table-component')
      ).toBeFalsy();
    });

    it('passes run name, experiment alias, selected value, and color to data table', () => {
      // To make sure we only return the runs when called with the right props.
      const selectSpy = spyOn(store, 'select').and.callThrough();
      selectSpy.withArgs(getFilteredRenderableRuns).and.returnValue(
        of([
          {
            run: buildRun({id: 'book1', name: "The Philosopher's Stone"}),
            runColor: '#000',
            experimentAlias: {aliasText: 'book', aliasNumber: 1},
            experimentName: 'Harry Potter',
            selected: true,
            hparams: new Map(),
          },
          {
            run: buildRun({id: 'book2', name: 'The Chamber Of Secrets'}),
            runColor: '#111',
            experimentAlias: {aliasText: 'book', aliasNumber: 1},
            experimentName: 'Harry Potter',
            selected: false,
            hparams: new Map(),
          },
        ])
      );

      const fixture = createComponent(['book']);
      fixture.detectChanges();
      const runsDataTable = fixture.debugElement.query(
        By.directive(RunsDataTable)
      );

      expect(runsDataTable.componentInstance.data).toEqual([
        {
          id: 'book1',
          color: '#000',
          run: "The Philosopher's Stone",
          experimentAlias: {aliasNumber: 1, aliasText: 'book'},
          experimentName: 'Harry Potter',
          selected: true,
        },
        {
          id: 'book2',
          color: '#111',
          run: 'The Chamber Of Secrets',
          experimentAlias: {aliasNumber: 1, aliasText: 'book'},
          experimentName: 'Harry Potter',
          selected: false,
        },
      ]);
    });

    it('passes hparam values to data table', () => {
      const run1 = buildRun({id: 'book1', name: "The Philosopher's Stone"});
      const run2 = buildRun({id: 'book2', name: 'The Chamber Of Secrets'});
      // To make sure we only return the runs when called with the right props.
      const selectSpy = spyOn(store, 'select').and.callThrough();
      selectSpy
        .withArgs(getRuns, {experimentId: 'book'})
        .and.returnValue(of([run1, run2]));

      selectSpy.withArgs(getRunsTableHeaders).and.returnValue(
        of([
          {
            type: ColumnHeaderType.HPARAM,
            name: 'batch_size',
            displayName: 'Batch Size',
            enabled: true,
          },
        ])
      );

      selectSpy.withArgs(getFilteredRenderableRuns).and.returnValue(
        of([
          {
            run: run1,
            hparams: new Map([['batch_size', 1]]),
          } as RunTableItem,
          {
            run: run2,
            hparams: new Map([['batch_size', 2]]),
          } as RunTableItem,
        ])
      );

      store.overrideSelector(getRunColorMap, {
        book1: '#000',
        book2: '#111',
      });

      const fixture = createComponent(['book']);
      fixture.detectChanges();
      const runsDataTable = fixture.debugElement.query(
        By.directive(RunsDataTable)
      );

      expect(runsDataTable.componentInstance.data[0].batch_size).toEqual(1);
      expect(runsDataTable.componentInstance.data[1].batch_size).toEqual(2);
    });

    describe('sorting', () => {
      beforeEach(() => {
        const run1 = buildRun({id: 'run1', name: 'bbb'});
        const run2 = buildRun({id: 'run2', name: 'aaa'});
        const run3 = buildRun({id: 'run3', name: 'ccc'});
        store.overrideSelector(getRuns, [run1, run2, run3]);

        store.overrideSelector(getRunsTableHeaders, [
          {
            type: ColumnHeaderType.RUN,
            name: 'run',
            displayName: 'Run',
            enabled: true,
          },
          {
            type: ColumnHeaderType.HPARAM,
            name: 'batch_size',
            displayName: 'Batch Size',
            enabled: true,
          },
          {
            type: ColumnHeaderType.HPARAM,
            name: 'good_hparam',
            displayName: 'Really Good',
            enabled: true,
          },
          {
            type: ColumnHeaderType.HPARAM,
            name: 'scarce',
            displayName: 'Missing Data',
            enabled: true,
          },
        ]);

        store.overrideSelector(getFilteredRenderableRuns, [
          {
            run: run1,
            experimentAlias: {aliasNumber: 1, aliasText: 'bbb'},
            hparams: new Map<string, number | string | boolean>([
              ['batch_size', 2],
              ['good_hparam', false],
              ['scarce', 'aaa'],
            ]),
          } as RunTableItem,
          {
            run: run2,
            experimentAlias: {aliasNumber: 2, aliasText: 'ccc'},
            hparams: new Map<string, number | string | boolean>([
              ['batch_size', 1],
              ['good_hparam', true],
            ]),
          } as RunTableItem,
          {
            run: run3,
            experimentAlias: {aliasNumber: 3, aliasText: 'aaa'},
            hparams: new Map<string, number | string | boolean>([
              ['batch_size', 3],
              ['good_hparam', false],
              ['scarce', 'ccc'],
            ]),
          } as RunTableItem,
        ]);
      });

      it('sorts string values', () => {
        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'run',
          order: SortingOrder.ASCENDING,
        });
        const fixture = createComponent(['book']);
        const runsDataTable = fixture.debugElement.query(
          By.directive(RunsDataTable)
        );

        expect(runsDataTable.componentInstance.data[0]['run']).toEqual('aaa');
        expect(runsDataTable.componentInstance.data[1]['run']).toEqual('bbb');
        expect(runsDataTable.componentInstance.data[2]['run']).toEqual('ccc');

        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'run',
          order: SortingOrder.DESCENDING,
        });
        store.refreshState();
        fixture.detectChanges();

        expect(runsDataTable.componentInstance.data[0]['run']).toEqual('ccc');
        expect(runsDataTable.componentInstance.data[1]['run']).toEqual('bbb');
        expect(runsDataTable.componentInstance.data[2]['run']).toEqual('aaa');
      });

      it('sorts number values', () => {
        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'batch_size',
          order: SortingOrder.ASCENDING,
        });
        const fixture = createComponent(['book']);
        const runsDataTable = fixture.debugElement.query(
          By.directive(RunsDataTable)
        );

        expect(runsDataTable.componentInstance.data[0]['batch_size']).toEqual(
          1
        );
        expect(runsDataTable.componentInstance.data[1]['batch_size']).toEqual(
          2
        );
        expect(runsDataTable.componentInstance.data[2]['batch_size']).toEqual(
          3
        );

        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'batch_size',
          order: SortingOrder.DESCENDING,
        });
        store.refreshState();
        fixture.detectChanges();

        expect(runsDataTable.componentInstance.data[0]['batch_size']).toEqual(
          3
        );
        expect(runsDataTable.componentInstance.data[1]['batch_size']).toEqual(
          2
        );
        expect(runsDataTable.componentInstance.data[2]['batch_size']).toEqual(
          1
        );
      });

      it('sorts boolean values', () => {
        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'good_hparam',
          order: SortingOrder.ASCENDING,
        });
        const fixture = createComponent(['book']);
        const runsDataTable = fixture.debugElement.query(
          By.directive(RunsDataTable)
        );

        expect(
          runsDataTable.componentInstance.data[0]['good_hparam']
        ).toBeFalse();
        expect(
          runsDataTable.componentInstance.data[1]['good_hparam']
        ).toBeFalse();
        expect(
          runsDataTable.componentInstance.data[2]['good_hparam']
        ).toBeTrue();

        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'good_hparam',
          order: SortingOrder.DESCENDING,
        });
        store.refreshState();
        fixture.detectChanges();

        expect(
          runsDataTable.componentInstance.data[0]['good_hparam']
        ).toBeTrue();
        expect(
          runsDataTable.componentInstance.data[1]['good_hparam']
        ).toBeFalse();
        expect(
          runsDataTable.componentInstance.data[2]['good_hparam']
        ).toBeFalse();
      });

      it('sorts scarce values with undefined values always below defined ones.', () => {
        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'scarce',
          order: SortingOrder.ASCENDING,
        });
        const fixture = createComponent(['book']);
        const runsDataTable = fixture.debugElement.query(
          By.directive(RunsDataTable)
        );

        expect(runsDataTable.componentInstance.data[0]['scarce']).toEqual(
          'aaa'
        );
        expect(runsDataTable.componentInstance.data[1]['scarce']).toEqual(
          'ccc'
        );
        expect(
          runsDataTable.componentInstance.data[2]['scarce']
        ).toBeUndefined();

        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'scarce',
          order: SortingOrder.DESCENDING,
        });
        store.refreshState();
        fixture.detectChanges();

        expect(runsDataTable.componentInstance.data[0]['scarce']).toEqual(
          'ccc'
        );
        expect(runsDataTable.componentInstance.data[1]['scarce']).toEqual(
          'aaa'
        );
        expect(
          runsDataTable.componentInstance.data[2]['scarce']
        ).toBeUndefined();
      });

      it('sorts experiment alias by alias number.', () => {
        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'experimentAlias',
          order: SortingOrder.ASCENDING,
        });
        const fixture = createComponent(['book']);
        const runsDataTable = fixture.debugElement.query(
          By.directive(RunsDataTable)
        );

        expect(
          runsDataTable.componentInstance.data[0]['experimentAlias'].aliasNumber
        ).toEqual(1);
        expect(
          runsDataTable.componentInstance.data[1]['experimentAlias'].aliasNumber
        ).toEqual(2);
        expect(
          runsDataTable.componentInstance.data[2]['experimentAlias'].aliasNumber
        ).toEqual(3);

        store.overrideSelector(getRunsTableSortingInfo, {
          name: 'experimentAlias',
          order: SortingOrder.DESCENDING,
        });
        store.refreshState();
        fixture.detectChanges();

        expect(
          runsDataTable.componentInstance.data[0]['experimentAlias'].aliasNumber
        ).toEqual(3);
        expect(
          runsDataTable.componentInstance.data[1]['experimentAlias'].aliasNumber
        ).toEqual(2);
        expect(
          runsDataTable.componentInstance.data[2]['experimentAlias'].aliasNumber
        ).toEqual(1);
      });
    });
  });
});
