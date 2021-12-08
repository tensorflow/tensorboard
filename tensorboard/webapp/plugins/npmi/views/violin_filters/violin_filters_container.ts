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
import {map} from 'rxjs/operators';
import {State} from '../../../../app_state';
import * as npmiActions from '../../actions';
import {getMetricFilters, getSidebarExpanded} from '../../store';

@Component({
  selector: 'npmi-violin-filters',
  template: `
    <violin-filters-component
      [sidebarExpanded]="sidebarExpanded$ | async"
      [metricFilters]="metricFilters$ | async"
      (toggleSidebarExpanded)="onToggleSidebarExpanded()"
    ></violin-filters-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViolinFiltersContainer {
  readonly sidebarExpanded$ = this.store.select(getSidebarExpanded);
  readonly metricFilters$ = this.store.select(getMetricFilters).pipe(
    map((filters) => {
      return Object.entries(filters);
    })
  );

  constructor(private readonly store: Store<State>) {}

  onToggleSidebarExpanded() {
    this.store.dispatch(npmiActions.npmiToggleSidebarExpanded());
  }
}
