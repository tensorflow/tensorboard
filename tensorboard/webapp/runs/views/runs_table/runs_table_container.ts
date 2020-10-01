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
import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {createSelector, Store} from '@ngrx/store';
import {DataLoadState, LoadState} from '../../../types/data';
import {combineLatest, Observable, of} from 'rxjs';
import {combineLatestWith, map, shareReplay} from 'rxjs/operators';

import {State} from '../../../app_state';
import {
  getCurrentRouteRunSelection,
  getExperiment,
  getExperimentIdToAliasMap,
  getExperimentsHparamsAndMetrics,
  getRunColorMap,
  getRunHparamFilterMap,
  getRunMetricFilterMap,
  getRuns,
  getRunSelectorPaginationOption,
  getRunSelectorRegexFilter,
  getRunSelectorSort,
  getRunsLoadState,
} from '../../../selectors';
import {SortDirection} from '../../../types/ui';
import {
  runColorChanged,
  runDiscreteHparamFilterChanged,
  runIntervalHparamFilterChanged,
  runMetricFilterChanged,
  runPageSelectionToggled,
  runSelectionToggled,
  runSelectorPaginationOptionChanged,
  runSelectorRegexFilterChanged,
  runSelectorSortChanged,
  runsSelectAll,
  runTableShown,
} from '../../actions';
import {
  DiscreteFilter,
  DiscreteHparamValue,
  DiscreteHparamValues,
  DomainType,
  IntervalFilter,
} from '../../types';

import {
  HparamColumn,
  IntervalFilterChange,
  MetricColumn,
} from './runs_table_component';
import {RunsTableColumn, RunTableItem} from './types';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

const getRunsLoading = createSelector<
  State,
  {experimentId: string},
  LoadState,
  boolean
>(getRunsLoadState, (loadState) => loadState.state === DataLoadState.LOADING);

function getPropsForSort(
  item: RunTableItem,
  sortColumn: RunsTableColumn
): Array<string | number> {
  switch (sortColumn) {
    case RunsTableColumn.EXPERIMENT_NAME:
      return [item.experimentAlias, item.run.name, item.run.id];
    case RunsTableColumn.RUN_NAME:
      return [item.run.name, item.experimentAlias, item.run.id];
    default:
      throw new Error(`Not yet implemented: ${sortColumn}`);
  }
}

function sortRunTableItems(
  items: RunTableItem[],
  sort: {column: RunsTableColumn | null; direction: SortDirection}
): RunTableItem[] {
  const sortedItems = [...items];
  if (!sort.column || sort.direction === SortDirection.UNSET) {
    return sortedItems;
  }

  sortedItems.sort((a, b) => {
    const aProps = getPropsForSort(a, sort.column!);
    const bProps = getPropsForSort(b, sort.column!);
    if (aProps.length !== bProps.length) {
      throw new Error(
        'Invariant error: a given sort should result in same number of ' +
          `items: ${sort}`
      );
    }

    for (let index = 0; index < aProps.length; index++) {
      const valA = aProps[index];
      const valB = bProps[index];
      if (valA === valB) {
        continue;
      }

      if (typeof valA !== typeof valB) {
        throw new Error(
          `Cannot compare values of different types: ` +
            `${typeof valA} vs. ${typeof valB}`
        );
      }
      return valA < valB === (sort.direction === SortDirection.ASC) ? -1 : 1;
    }
    return 0;
  });
  return sortedItems;
}

function matchFilter(
  filter: DiscreteFilter | IntervalFilter,
  value: number | DiscreteHparamValue | undefined
): boolean {
  if (value === undefined) {
    return filter.includeUndefined;
  }
  if (filter.type === DomainType.DISCRETE) {
    // (upcast to work around bad TypeScript libdefs)
    const values: Readonly<Array<typeof filter.filterValues[number]>> =
      filter.filterValues;
    return values.includes(value);
  } else if (filter.type === DomainType.INTERVAL) {
    return filter.filterLowerValue <= value && value <= filter.filterUpperValue;
  }
  return false;
}

/**
 * Renders list of experiments.
 *
 * Note: all @Inputs are read once upon initialization. This component does not
 * update when input bindings change.
 */
@Component({
  selector: 'runs-table',
  template: `
    <runs-table-component
      [useFlexibleLayout]="useFlexibleLayout"
      [numSelectedItems]="numSelectedItems$ | async"
      [columns]="columns"
      [hparamColumns]="hparamColumns$ | async"
      [metricColumns]="metricColumns$ | async"
      [showExperimentName]="isExperimentNameVisible()"
      [pageItems]="pageItems$ | async"
      [filteredItemsLength]="filteredItemsLength$ | async"
      [allItemsLength]="allItemsLength$ | async"
      [loading]="loading$ | async"
      [paginationOption]="paginationOption$ | async"
      [regexFilter]="regexFilter$ | async"
      [sortOption]="sortOption$ | async"
      [usePagination]="usePagination"
      (onSelectionToggle)="onRunSelectionToggle($event)"
      (onPageSelectionToggle)="onPageSelectionToggle($event)"
      (onSelectAllPages)="onSelectAllPages()"
      (onPaginationChange)="onPaginationChange($event)"
      (onRegexFilterChange)="onRegexFilterChange($event)"
      (onSortChange)="onSortChange($event)"
      (onRunColorChange)="onRunColorChange($event)"
      (onHparamIntervalFilterChanged)="onHparamIntervalFilterChanged($event)"
      (onHparamDiscreteFilterChanged)="onHparamDiscreteFilterChanged($event)"
      (onMetricFilterChanged)="onMetricFilterChanged($event)"
    ></runs-table-component>
  `,
  host: {
    '[class.flex-layout]': 'useFlexibleLayout',
  },
  styles: [
    `
      :host.flex-layout {
        display: flex;
      }

      :host.flex-layout > runs-table-component {
        width: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsTableContainer implements OnInit {
  private allUnsortedRunTableItems$?: Observable<RunTableItem[]>;
  loading$: Observable<boolean> | null = null;
  filteredItemsLength$?: Observable<number>;
  allItemsLength$?: Observable<number>;
  pageItems$?: Observable<RunTableItem[]>;
  numSelectedItems$?: Observable<number>;

  hparamColumns$: Observable<HparamColumn[]> = of([]);
  metricColumns$: Observable<MetricColumn[]> = of([]);

  /**
   * Enables a layout mode intended for scenarios when changing the # of runs
   * should have no effect on the table's size.
   *
   * - height and width span the container height and width
   * - run list scrolls vertically, not horizontally
   * - 'name' cells wrap text
   */
  @Input() useFlexibleLayout?: boolean = false;

  /**
   * Whether to use pagination options from the store. If false, the table will
   * show a single page with all runs.
   */
  @Input() usePagination?: boolean = false;

  // Column to disable in the table. The columns are rendered in the order as
  // defined by this input.
  @Input()
  columns: RunsTableColumn[] = [RunsTableColumn.RUN_NAME];

  @Input() experimentIds!: string[];
  @Input() showHparamsAndMetrics = false;

  sortOption$ = this.store.select(getRunSelectorSort);
  paginationOption$ = this.store.select(getRunSelectorPaginationOption);
  regexFilter$ = this.store.select(getRunSelectorRegexFilter);

  constructor(private readonly store: Store<State>) {}

  isExperimentNameVisible() {
    return this.columns.some((column) => {
      return column === RunsTableColumn.EXPERIMENT_NAME;
    });
  }

  ngOnInit() {
    const getRunTableItemsPerExperiment = this.experimentIds.map((id) =>
      this.getRunTableItemsForExperiment(id)
    );

    this.allUnsortedRunTableItems$ = combineLatest(
      getRunTableItemsPerExperiment
    ).pipe(
      map((itemsForExperiments: RunTableItem[][]) => {
        const items = [] as RunTableItem[];
        return items.concat(...itemsForExperiments);
      }),
      shareReplay(1)
    );
    this.allItemsLength$ = this.allUnsortedRunTableItems$.pipe(
      map((items) => items.length)
    );

    const getFilteredItems$ = this.getFilteredItems$(
      this.allUnsortedRunTableItems$
    ).pipe(shareReplay(1));

    this.filteredItemsLength$ = getFilteredItems$.pipe(
      map((items) => items.length)
    );
    this.pageItems$ = this.sortedAndSlicedItems$(getFilteredItems$);
    this.numSelectedItems$ = this.allUnsortedRunTableItems$.pipe(
      map((items) => {
        return items.reduce((count, item) => {
          return count + Number(item.selected);
        }, 0);
      })
    );

    const getRunsLoadingPerExperiment = this.experimentIds.map((id) => {
      return this.store.select(getRunsLoading, {experimentId: id});
    });
    this.loading$ = combineLatest(getRunsLoadingPerExperiment).pipe(
      map((experimentsLoading) => {
        return experimentsLoading.some((isLoading) => isLoading);
      })
    );

    if (this.showHparamsAndMetrics) {
      const getHparamAndMetrics$ = this.store.select(
        getExperimentsHparamsAndMetrics,
        {experimentIds: this.experimentIds}
      );

      // combineLatest, when initializing, emits twice
      this.hparamColumns$ = combineLatest([
        this.store.select(getRunHparamFilterMap),
        getHparamAndMetrics$,
      ]).pipe(
        map(([filterMap, {hparams}]) => {
          return hparams.map(({name, displayName, domain}) => {
            const filter = filterMap.get(name);
            if (!filter) {
              throw new RangeError(
                `Invariant error: a filter for ${name} must exist` +
                  ` when the hparam exists`
              );
            }
            return {displayName, name, filter};
          });
        })
      );

      this.metricColumns$ = combineLatest([
        this.store.select(getRunMetricFilterMap),
        getHparamAndMetrics$,
      ]).pipe(
        map(([filterMap, {metrics}]) => {
          return metrics.map(({tag, displayName}) => {
            const filter = filterMap.get(tag);
            if (!filter) {
              throw new RangeError(
                `Invariant error: a filter for ${tag} must exist ` +
                  `when the metric exists`
              );
            }
            return {displayName, tag, filter};
          });
        })
      );
    }

    this.store.dispatch(runTableShown({experimentIds: this.experimentIds}));
  }

  private getFilteredItems$(runItems$: Observable<RunTableItem[]>) {
    return combineLatest([
      runItems$,
      this.store.select(getRunSelectorRegexFilter),
    ]).pipe(
      map(([items, regexString]) => {
        if (!regexString) {
          return items;
        }

        let regex: RegExp | null = null;

        // Do not break all the future updates because of malformed
        // regexString. User can be still modifying it.
        try {
          regex = regexString ? new RegExp(regexString) : null;
        } catch (e) {}

        if (!regex) {
          return [];
        }

        const shouldIncludeExperimentName = this.columns.includes(
          RunsTableColumn.EXPERIMENT_NAME
        );
        return items.filter((item) => {
          if (!shouldIncludeExperimentName) {
            return regex!.test(item.run.name);
          }
          return (
            regex!.test(item.run.name) || regex!.test(item.experimentAlias)
          );
        });
      }),
      combineLatestWith(
        this.store.select(getRunHparamFilterMap),
        this.store.select(getRunMetricFilterMap)
      ),
      map(([items, hparamFilters, metricFilters]) => {
        if (!this.showHparamsAndMetrics) {
          return items;
        }
        return items.filter(({hparams, metrics}) => {
          const hparamMatches = [...hparamFilters.entries()].every(
            ([hparamName, filter]) => {
              const value = hparams.get(hparamName);
              return matchFilter(filter, value);
            }
          );

          return (
            hparamMatches &&
            [...metricFilters.entries()].every(([metricTag, filter]) => {
              const value = metrics.get(metricTag);
              return matchFilter(filter, value);
            })
          );
        });
      })
    );
  }

  private sortedAndSlicedItems$(filteredItems$: Observable<RunTableItem[]>) {
    const sortedItems = combineLatest([
      filteredItems$,
      this.store.select(getRunSelectorSort),
    ]).pipe(
      map(([items, sort]) => {
        const column = sort.column as RunsTableColumn | null;
        const direction = sort.direction;
        return sortRunTableItems(items, {column, direction});
      })
    );

    const slicedItems = combineLatest([
      sortedItems,
      this.store.select(getRunSelectorPaginationOption),
    ]).pipe(
      map(([items, paginationOption]) => {
        if (!this.usePagination) {
          return items.slice();
        }
        const {pageSize, pageIndex} = paginationOption;
        return items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
      })
    );

    return slicedItems;
  }

  private getRunTableItemsForExperiment(
    experimentId: string
  ): Observable<RunTableItem[]> {
    return combineLatest([
      this.store.select(getRuns, {experimentId}),
      this.store.select(getExperiment, {experimentId}),
      this.store.select(getCurrentRouteRunSelection),
      this.store.select(getRunColorMap),
      this.store.select(getExperimentIdToAliasMap),
    ]).pipe(
      map(([runs, experiment, selectionMap, colorMap, experimentIdToAlias]) => {
        return runs.map((run) => {
          const hparamMap: RunTableItem['hparams'] = new Map();
          (run.hparams || []).forEach((hparam) => {
            hparamMap.set(hparam.name, hparam.value);
          });
          const metricMap: RunTableItem['metrics'] = new Map();
          (run.metrics || []).forEach((metric) => {
            metricMap.set(metric.tag, metric.value);
          });
          return {
            run,
            experimentName: experiment?.name || '',
            experimentAlias: experimentIdToAlias[experimentId],
            selected: Boolean(selectionMap && selectionMap.get(run.id)),
            runColor: colorMap[run.id],
            hparams: hparamMap,
            metrics: metricMap,
          };
        });
      })
    );
  }

  onRunSelectionToggle(item: RunTableItem) {
    this.store.dispatch(
      runSelectionToggled({
        experimentIds: this.experimentIds,
        runId: item.run.id,
      })
    );
  }

  // When `usePagination` is false, page selection affects the single page,
  // containing all items.
  onPageSelectionToggle(event: {items: RunTableItem[]}) {
    const {items} = event;
    const runIds = items.map(({run}) => run.id);

    this.store.dispatch(
      runPageSelectionToggled({
        experimentIds: this.experimentIds,
        runIds,
      })
    );
  }

  onSelectAllPages() {
    if (!this.usePagination) {
      throw new Error(
        'Select all events cannot be dispatched when pagination is disabled'
      );
    }

    this.store.dispatch(runsSelectAll({experimentIds: this.experimentIds}));
  }

  onPaginationChange(event: {pageIndex: number; pageSize: number}) {
    if (!this.usePagination) {
      throw new Error(
        'Pagination events cannot be dispatched when pagination is disabled'
      );
    }
    const {pageIndex, pageSize} = event;
    this.store.dispatch(
      runSelectorPaginationOptionChanged({pageIndex, pageSize})
    );
  }

  onSortChange(sort: {column: RunsTableColumn; direction: SortDirection}) {
    this.store.dispatch(runSelectorSortChanged(sort));
  }

  onRegexFilterChange(regexString: string) {
    this.store.dispatch(runSelectorRegexFilterChanged({regexString}));
  }

  onRunColorChange({runId, newColor}: {runId: string; newColor: string}) {
    this.store.dispatch(runColorChanged({runId, newColor}));
  }

  onHparamDiscreteFilterChanged(event: {
    hparamName: string;
    includeUndefined: boolean;
    filterValues: DiscreteHparamValues;
  }) {
    const {hparamName, filterValues, includeUndefined} = event;
    this.store.dispatch(
      runDiscreteHparamFilterChanged({
        hparamName,
        filterValues,
        includeUndefined,
      })
    );
  }

  onHparamIntervalFilterChanged(event: IntervalFilterChange) {
    const {name, filterLowerValue, filterUpperValue, includeUndefined} = event;
    this.store.dispatch(
      runIntervalHparamFilterChanged({
        hparamName: name,
        filterLowerValue,
        filterUpperValue,
        includeUndefined,
      })
    );
  }

  onMetricFilterChanged(event: IntervalFilterChange) {
    const {name, includeUndefined, filterLowerValue, filterUpperValue} = event;
    this.store.dispatch(
      runMetricFilterChanged({
        metricTag: name,
        includeUndefined,
        filterLowerValue,
        filterUpperValue,
      })
    );
  }
}

export const TEST_ONLY = {
  getRunsLoading,
};
