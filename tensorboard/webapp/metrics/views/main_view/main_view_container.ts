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
import {map, takeWhile} from 'rxjs/operators';
import {State} from '../../../app_state';
import {DataLoadState} from '../../../types/data';
import {
  metricsSettingsPaneClosed,
  metricsSettingsPaneToggled,
  metricsShowAllPlugins,
  metricsToggleVisiblePlugin,
} from '../../actions';
import {
  getMetricsFilteredPluginTypes,
  getMetricsTagFilter,
  getMetricsTagMetadataLoadState,
  isMetricsSettingsPaneOpen,
  isMetricsSlideoutMenuOpen,
} from '../../store';
import {PluginType} from '../../types';

@Component({
  standalone: false,
  selector: 'metrics-main-view',
  template: `
    <metrics-main-view-component
      [showFilteredView]="showFilteredView$ | async"
      [isSidepaneOpen]="isSidepaneOpen$ | async"
      [initialTagsLoading]="initialTagsLoading$ | async"
      [filteredPluginTypes]="filteredPluginTypes$ | async"
      [slideOutMenuOpen]="isSlideoutMenuOpen$ | async"
      (onSettingsButtonClicked)="onSettingsButtonClicked()"
      (onCloseSidepaneButtonClicked)="onCloseSidepaneButtonClicked()"
      (onPluginTypeToggled)="onPluginVisibilityToggled($event)"
      (onPluginTypeAllToggled)="onShowAllPlugins()"
    ></metrics-main-view-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainViewContainer {
  constructor(private readonly store: Store<State>) {
    this.isSidepaneOpen$ = this.store.select(isMetricsSettingsPaneOpen);
    this.initialTagsLoading$ = this.store
      .select(getMetricsTagMetadataLoadState)
      .pipe(
        // disconnect and don't listen to store if tags are loaded at least once.
        takeWhile((loadState) => {
          return loadState.lastLoadedTimeInMs === null;
        }, true /** inclusive */),
        map((loadState) => {
          return (
            loadState.state === DataLoadState.LOADING &&
            loadState.lastLoadedTimeInMs === null
          );
        })
      );
    this.showFilteredView$ = this.store.select(getMetricsTagFilter).pipe(
      map((filter) => {
        return filter.length > 0;
      })
    );
    this.filteredPluginTypes$ = this.store.select(
      getMetricsFilteredPluginTypes
    );
    this.isSlideoutMenuOpen$ = this.store.select(isMetricsSlideoutMenuOpen);
  }

  readonly isSidepaneOpen$: Observable<boolean>;

  readonly initialTagsLoading$: Observable<boolean>;

  readonly showFilteredView$: Observable<boolean>;

  readonly filteredPluginTypes$;

  readonly isSlideoutMenuOpen$: Observable<boolean>;

  onSettingsButtonClicked() {
    this.store.dispatch(metricsSettingsPaneToggled());
  }

  onCloseSidepaneButtonClicked() {
    this.store.dispatch(metricsSettingsPaneClosed());
  }

  onPluginVisibilityToggled(plugin: PluginType) {
    this.store.dispatch(metricsToggleVisiblePlugin({plugin}));
  }

  onShowAllPlugins() {
    this.store.dispatch(metricsShowAllPlugins());
  }
}
