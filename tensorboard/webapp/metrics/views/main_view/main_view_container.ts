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
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {State} from '../../../app_state';
import {metricsShowAllPlugins, metricsToggleVisiblePlugin} from '../../actions';
import {getMetricsFilteredPluginTypes, getMetricsTagFilter} from '../../store';
import {PluginType} from '../../types';

@Component({
  selector: 'metrics-main-view',
  template: `
    <metrics-main-view-component
      [showFilteredView]="showFilteredView$ | async"
      [isSidepaneOpen]="isSidepaneOpen"
      [filteredPluginTypes]="filteredPluginTypes$ | async"
      (onSettingsButtonClicked)="onSettingsButtonClicked()"
      (onCloseSidepaneButtonClicked)="onCloseSidepaneButtonClicked()"
      (onPluginTypeToggled)="onPluginVisibilityToggled($event)"
      (onPluginTypeAllToggled)="onShowAllPlugins()"
    ></metrics-main-view-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainViewContainer {
  constructor(private readonly store: Store<State>) {}

  isSidepaneOpen = true;

  readonly showFilteredView$: Observable<boolean> = this.store
    .select(getMetricsTagFilter)
    .pipe(
      map((filter) => {
        return filter.length > 0;
      })
    );

  readonly filteredPluginTypes$ = this.store.select(
    getMetricsFilteredPluginTypes
  );

  onSettingsButtonClicked() {
    this.isSidepaneOpen = !this.isSidepaneOpen;
  }

  onCloseSidepaneButtonClicked() {
    this.isSidepaneOpen = false;
  }

  onPluginVisibilityToggled(plugin: PluginType) {
    this.store.dispatch(metricsToggleVisiblePlugin({plugin}));
  }

  onShowAllPlugins() {
    this.store.dispatch(metricsShowAllPlugins());
  }
}
