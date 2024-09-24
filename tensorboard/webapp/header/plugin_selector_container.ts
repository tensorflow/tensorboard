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
import {Component} from '@angular/core';
import {createSelector, select, Store} from '@ngrx/store';
import {changePlugin} from '../core/actions';
import {getActivePlugin, getPlugins, State} from '../core/store';
import {PluginId} from '../types/api';
import {UiPluginMetadata} from './types';

const getUiPlugins = createSelector(getPlugins, (listing): UiPluginMetadata[] =>
  Object.keys(listing).map((key) => Object.assign({}, {id: key}, listing[key]))
);

const getDisabledPlugins = createSelector(
  getUiPlugins,
  (plugins): UiPluginMetadata[] => plugins.filter((plugin) => !plugin.enabled)
);

@Component({
  standalone: false,
  selector: 'plugin-selector',
  template: `
    <plugin-selector-component
      [activePlugins]="plugins$ | async"
      [disabledPlugins]="disabledPlugins$ | async"
      [selectedPlugin]="activePlugin$ | async"
      (onPluginSelectionChanged)="onPluginSelectionChange($event)"
    ></plugin-selector-component>
  `,
})
export class PluginSelectorContainer {
  readonly activePlugin$;
  readonly plugins$;
  readonly disabledPlugins$;

  constructor(private readonly store: Store<State>) {
    this.activePlugin$ = this.store.pipe(select(getActivePlugin));
    this.plugins$ = this.store.pipe(select(getUiPlugins));
    this.disabledPlugins$ = this.store.pipe(select(getDisabledPlugins));
  }

  onPluginSelectionChange(pluginId: PluginId) {
    this.store.dispatch(changePlugin({plugin: pluginId}));
  }
}
