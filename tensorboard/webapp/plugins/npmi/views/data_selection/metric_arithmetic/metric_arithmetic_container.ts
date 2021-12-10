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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {getMetricArithmetic} from '../../../store';
import {State} from '../../../store/npmi_types';

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
