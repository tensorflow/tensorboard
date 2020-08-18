import {Component, ChangeDetectionStrategy, Input, OnInit} from '@angular/core';
import {select, Store} from '@ngrx/store';

import {map} from 'rxjs/operators';

import {State} from '../../../../store/npmi_types';
import {getMetricFilters} from '../../../../store';
import * as npmiActions from '../../../../actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-metric-arithmetic-element',
  template: `
    <metric-arithmetic-element-component
      [metric]="metric"
      [filterExtremes]="filterExtremes$ | async"
      [minFilterValid]="minFilterValid"
      [maxFilterValid]="maxFilterValid"
      (onRemove)="remove($event)"
      (onFilterChange)="filterChange($event)"
    ></metric-arithmetic-element-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricArithmeticElementContainer {
  @Input() metric!: string;
  readonly filterExtremes$ = this.store.pipe(select(getMetricFilters)).pipe(
    map((filters) => {
      const filter = filters[this.metric];
      const min = filter.includeNaN
        ? 'NaN'
        : this.rounded(filter.min).toString();
      const max =
        filter.max < filter.min ? 'NaN' : this.rounded(filter.max).toString();
      return {min: min, max: max};
    })
  );
  minFilterValid = true;
  maxFilterValid = true;

  constructor(private readonly store: Store<State>) {}

  remove(metric: string) {
    this.store.dispatch(npmiActions.npmiRemoveMetricFilter({metric: metric}));
  }

  filterChange(newValues: {min: string; max: string}) {
    this.minFilterValid = this.entryValid(newValues.min);
    this.maxFilterValid = this.entryValid(newValues.max);
    if (this.minFilterValid && this.maxFilterValid) {
      let min = newValues.min === 'NaN' ? -1 : parseFloat(newValues.min);
      let max = newValues.max === 'NaN' ? -2 : parseFloat(newValues.max);
      let includeNaN = newValues.min === 'NaN';
      this.store.dispatch(
        npmiActions.npmiChangeMetricFilter({
          metric: this.metric,
          max: max,
          min: min,
          includeNaN: includeNaN,
        })
      );
    }
  }

  private entryValid(value: string) {
    if (value === 'NaN') {
      return true;
    } else {
      let numberValue = parseFloat(value);
      if (numberValue === NaN) {
        return false;
      } else if (numberValue >= -1.0 && numberValue <= 1.0) {
        return true;
      }
    }
    return false;
  }

  private rounded(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }
}
