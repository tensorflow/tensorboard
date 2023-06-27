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
import {Store} from '@ngrx/store';
import {getEnableHparamsInTimeSeries} from '../../feature_flag/store/feature_flag_selectors';
import {State} from '../../app_state';
import {getRunsTableFullScreen} from '../../core/store/core_selectors';

@Component({
  selector: 'metrics-dashboard',
  template: `
    <tb-dashboard-layout>
      <runs-selector
        [showHparamsAndMetrics]="showHparamsAndMetrics$ | async"
        sidebar
      ></runs-selector>
      <metrics-main-view
        main
        *ngIf="!(runsTableFullScreen$ | async)"
      ></metrics-main-view>
    </tb-dashboard-layout>
  `,
  styleUrls: ['metrics_container.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsDashboardContainer {
  showHparamsAndMetrics$ = this.store.select(getEnableHparamsInTimeSeries);
  runsTableFullScreen$ = this.store.select(getRunsTableFullScreen);

  constructor(readonly store: Store<State>) {}
}
