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
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Injectable,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import {
  MatLegacyPaginator,
  MatLegacyPaginatorIntl,
} from '@angular/material/legacy-paginator';
import {MatSort, Sort} from '@angular/material/sort';
import {MatLegacyTableDataSource} from '@angular/material/legacy-table';
import {
  DiscreteFilter,
  DiscreteHparamValue,
  DiscreteHparamValues,
  DomainType,
  IntervalFilter,
} from '../../../hparams/types';
import {SortDirection} from '../../../types/ui';
import {SortKey, SortType} from '../../types';
import {HparamSpec, MetricSpec, RunsTableColumn, RunTableItem} from './types';

/**
 * Exported because Angular compiler requires decorated classes to be exported.
 */
@Injectable()
export class RunsPaginatorIntl extends MatLegacyPaginatorIntl {
  override itemsPerPageLabel = 'Show runs:';
}

export interface HparamColumn {
  displayName: string;
  name: string;
  filter: IntervalFilter | DiscreteFilter;
}

export interface MetricColumn {
  displayName: string;
  tag: string;
  filter: IntervalFilter;
}

export interface IntervalFilterChange {
  name: string;
  includeUndefined: boolean;
  filterLowerValue: number;
  filterUpperValue: number;
}

@Component({
  selector: 'runs-table-component',
  templateUrl: 'runs_table_component.ng.html',
  host: {
    '[class.flex-layout]': 'useFlexibleLayout',
  },
  styleUrls: ['runs_table_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Use Element Provider since this text is unique to this element hierarchy.
  providers: [{provide: MatLegacyPaginatorIntl, useClass: RunsPaginatorIntl}],
})
export class RunsTableComponent implements OnChanges {
  readonly dataSource = new MatLegacyTableDataSource<RunTableItem>();
  readonly DomainType = DomainType;
  readonly RunsTableColumn = RunsTableColumn;
  readonly SortType = SortType;

  @Input() experimentIds!: string[];
  @Input() showExperimentName!: boolean;
  @Input() columns!: RunsTableColumn[];
  @Input() hparamColumns!: HparamSpec[];
  @Input() metricColumns!: MetricSpec[];
  @Input() allItemsLength!: number;
  @Input() filteredItemsLength!: number;
  @Input() useFlexibleLayout!: boolean;
  @Input() usePagination!: boolean;

  /**
   * `RunTableItem`s for a given page.
   */
  @Input() pageItems!: RunTableItem[];
  @Input() loading!: boolean;
  @Input() numSelectedItems!: number;
  @Input()
  sortOption!: {column: RunsTableColumn | null; direction: SortDirection};
  @Input() paginationOption!: {pageSize: number; pageIndex: number};
  @Input() regexFilter!: string;

  @Output() onRegexFilterChange = new EventEmitter<string>();
  @Output() onSelectionToggle = new EventEmitter<RunTableItem>();
  @Output() onSelectionDblClick = new EventEmitter<RunTableItem>();
  @Output() onPageSelectionToggle = new EventEmitter<{items: RunTableItem[]}>();
  @Output()
  onPaginationChange = new EventEmitter<{
    pageIndex: number;
    pageSize: number;
  }>();
  @Output()
  onSortChange = new EventEmitter<{
    key: SortKey;
    direction: SortDirection;
  }>();
  @Output()
  onRunColorChange = new EventEmitter<{runId: string; newColor: string}>();

  @Output()
  onHparamDiscreteFilterChanged = new EventEmitter<{
    hparamName: string;
    includeUndefined: boolean;
    filterValues: DiscreteHparamValues;
  }>();

  @Output()
  onHparamIntervalFilterChanged = new EventEmitter<IntervalFilterChange>();

  @Output() onMetricFilterChanged = new EventEmitter<IntervalFilterChange>();

  @ViewChild('filter', {static: true, read: ElementRef})
  filter!: ElementRef<HTMLInputElement>;

  @ViewChild(MatLegacyPaginator, {static: true}) paginator!: MatLegacyPaginator;
  @ViewChild(MatSort, {static: true}) sort!: MatSort;

  ngOnChanges() {
    this.dataSource.data = this.pageItems;
  }

  getHparamColumnId(spec: HparamSpec) {
    return `h:${spec.name}`;
  }

  getMetricColumnId(spec: MetricSpec) {
    return `m:${spec.tag}`;
  }

  getColumnIds() {
    return [
      ...this.columns,
      ...this.hparamColumns.map(this.getHparamColumnId),
      ...this.metricColumns.map(this.getMetricColumnId),
    ];
  }

  /**
   * Returns true when all items in the page are selected. Returns false when
   * there are no items at all.
   */
  allPageItemsSelected() {
    return (
      Boolean(this.pageItems.length) &&
      this.pageItems.every((item) => item.selected)
    );
  }

  somePageItemsSelected() {
    return this.pageItems.some((item) => item.selected);
  }

  handlePageToggle() {
    this.onPageSelectionToggle.emit({items: this.pageItems});
  }

  handleSortChange(sort: Sort) {
    let direction: SortDirection;
    switch (sort.direction) {
      case 'asc':
        direction = SortDirection.ASC;
        break;
      case 'desc':
        direction = SortDirection.DESC;
        break;
      default:
        direction = SortDirection.UNSET;
    }
    // HACK: Technically, sort.key is a string but in reality, MatSort supports an object
    // as the sort.id and, thus, sort.active can be an object.
    const key = sort.active as unknown as SortKey;
    this.onSortChange.emit({key, direction});
  }

  onFilterKeyUp(event: KeyboardEvent) {
    const input = event.target! as HTMLInputElement;
    this.onRegexFilterChange.emit(input.value);
  }

  tableTrackBy(index: number, item: RunTableItem) {
    return item.run.id;
  }

  handleHparamIncludeUndefinedToggled(hparamColumn: HparamColumn) {
    const {name, filter} = hparamColumn;

    if (!filter) {
      throw new RangeError(
        'Invariant error: require filter to exist for it to change'
      );
    }

    if (filter.type === DomainType.DISCRETE) {
      this.onHparamDiscreteFilterChanged.emit({
        hparamName: name,
        includeUndefined: !filter.includeUndefined,
        filterValues: filter.filterValues,
      });
    } else {
      this.onHparamIntervalFilterChanged.emit({
        name,
        includeUndefined: !filter.includeUndefined,
        filterLowerValue: filter.filterLowerValue,
        filterUpperValue: filter.filterUpperValue,
      });
    }
  }

  handleHparamIntervalChanged(
    hparamColumn: HparamColumn,
    newValue: {lowerValue: number; upperValue: number}
  ) {
    const {name, filter} = hparamColumn;

    if (!filter) {
      throw new RangeError(
        'Invariant error: require filter to exist for it to change'
      );
    }

    this.onHparamIntervalFilterChanged.emit({
      name,
      includeUndefined: filter.includeUndefined,
      filterLowerValue: newValue.lowerValue,
      filterUpperValue: newValue.upperValue,
    });
  }

  handleHparamDiscreteChanged(
    hparamColumn: HparamColumn,
    toggledValue: DiscreteHparamValue
  ) {
    const {name, filter} = hparamColumn;

    if (!filter) {
      throw new RangeError(
        'Invariant error: require filter to exist for it to change'
      );
    }

    if (filter.type !== DomainType.DISCRETE) {
      throw new RangeError(
        `Invariant error: expected discrete domain for ${name}`
      );
    }

    const newValues = new Set([...filter.filterValues]);
    if (newValues.has(toggledValue)) {
      newValues.delete(toggledValue);
    } else {
      newValues.add(toggledValue);
    }
    this.onHparamDiscreteFilterChanged.emit({
      hparamName: name,
      includeUndefined: filter.includeUndefined,
      filterValues: [...newValues] as DiscreteHparamValues,
    });
  }

  handleMetricIncludeUndefinedChanged(metricColumn: MetricColumn) {
    if (!metricColumn.filter) {
      throw new RangeError(
        'Invariant error: require filter to exist for it to change'
      );
    }
    this.onMetricFilterChanged.emit({
      name: metricColumn.tag,
      includeUndefined: !metricColumn.filter.includeUndefined,
      filterLowerValue: metricColumn.filter.filterLowerValue,
      filterUpperValue: metricColumn.filter.filterUpperValue,
    });
  }

  handleMetricFilterChanged(
    metricColumn: MetricColumn,
    newValue: {lowerValue: number; upperValue: number}
  ) {
    if (!metricColumn.filter) {
      throw new RangeError(
        'Invariant error: require filter to exist for it to change'
      );
    }

    this.onMetricFilterChanged.emit({
      name: metricColumn.tag,
      includeUndefined: metricColumn.filter.includeUndefined,
      filterLowerValue: newValue.lowerValue,
      filterUpperValue: newValue.upperValue,
    });
  }

  trackByHparamColumn(hparamColumn: HparamColumn) {
    return hparamColumn.name;
  }
  trackByMetricColumn(metricColumn: MetricColumn) {
    return metricColumn.tag;
  }
}
