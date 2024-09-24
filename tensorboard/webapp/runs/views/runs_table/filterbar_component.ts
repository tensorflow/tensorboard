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
import {
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  Component,
  ViewChild,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';
import {
  DiscreteFilter,
  DiscreteFilterValue,
  IntervalFilter,
  FilterAddedEvent,
} from '../../../widgets/data_table/types';
import {RangeValues} from '../../../widgets/range_input/types';
import {CustomModal} from '../../../widgets/custom_modal/custom_modal';

@Component({
  standalone: false,
  selector: 'filterbar-component',
  templateUrl: 'filterbar_component.ng.html',
  styleUrls: ['filterbar_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterbarComponent {
  @Input() filters!: Map<string, DiscreteFilter | IntervalFilter>;

  @Output() removeHparamFilter = new EventEmitter<string>();
  @Output() addFilter = new EventEmitter<FilterAddedEvent>();

  @ViewChild('filterModalTemplate', {read: TemplateRef})
  filterModalTemplate!: TemplateRef<unknown>;

  private internalSelectedFilterName = '';
  get selectedFilterName(): string {
    return this.internalSelectedFilterName;
  }
  set selectedFilterName(filterName: string) {
    this.internalSelectedFilterName = filterName;
  }
  // selectedFilter indirectly set using selectedFilterName.
  get selectedFilter(): DiscreteFilter | IntervalFilter | undefined {
    return this.filters.get(this.selectedFilterName);
  }

  constructor(
    private readonly customModal: CustomModal,
    private readonly viewContainerRef: ViewContainerRef
  ) {}

  openFilterMenu(event: MouseEvent, filterName: string) {
    this.selectedFilterName = filterName;
    this.customModal.createNextToElement(
      this.filterModalTemplate,
      (event.target as HTMLElement).closest('mat-chip') as HTMLElement,
      this.viewContainerRef
    );
  }

  emitIntervalFilterChanged(value: RangeValues) {
    if (!this.selectedFilter) {
      return;
    }

    this.addFilter.emit({
      name: this.selectedFilterName,
      value: {
        ...this.selectedFilter,
        filterLowerValue: value.lowerValue,
        filterUpperValue: value.upperValue,
      } as IntervalFilter,
    });
  }

  emitDiscreteFilterChanged(value: DiscreteFilterValue) {
    if (!this.selectedFilter) {
      return;
    }

    const newValues = new Set([
      ...(this.selectedFilter as DiscreteFilter).filterValues,
    ]);
    if (newValues.has(value)) {
      newValues.delete(value);
    } else {
      newValues.add(value);
    }

    this.addFilter.emit({
      name: this.selectedFilterName,
      value: {
        ...this.selectedFilter,
        filterValues: Array.from(newValues),
      } as DiscreteFilter,
    });
  }

  emitIncludeUndefinedToggled() {
    if (!this.selectedFilter) {
      return;
    }

    this.addFilter.emit({
      name: this.selectedFilterName,
      value: {
        ...this.selectedFilter,
        includeUndefined: !this.selectedFilter.includeUndefined,
      },
    });
  }
}
