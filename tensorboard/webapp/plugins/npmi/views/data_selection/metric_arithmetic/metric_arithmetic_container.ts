import {Component, ChangeDetectionStrategy} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {State} from '../../../store/npmi_types';
import {getMetricArithmetic} from '../../../store';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'npmi-metric-arithmetic',
  template: `
    <metric-arithmetic-component
      [metricArithmetic]="metricArithmetic$ | async"
    ></metric-arithmetic-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricArithmeticContainer {
  readonly metricArithmetic$ = this.store.pipe(select(getMetricArithmetic));

  constructor(private readonly store: Store<State>) {}
}
