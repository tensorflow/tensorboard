/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {MatTabChangeEvent} from '@angular/material/tabs';
import {MatSelectChange} from '@angular/material/select';
import {Store, select, createSelector} from '@ngrx/store';
import {combineLatest, of} from 'rxjs';

import {State, getActivePlugin, getPlugins} from '../../core/core.reducers';
import {changePlugin} from '../../core/core.actions';

import {PluginMetadata, PluginId} from '../../types/api';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

interface UiPluginMetadata extends PluginMetadata {
  id: PluginId;
}

const getUiPlugins = createSelector(
  getPlugins,
  (listing): UiPluginMetadata[] =>
    Object.keys(listing).map((key) =>
      Object.assign({}, {id: key}, listing[key])
    )
);

const getDisabledPlugins = createSelector(
  getUiPlugins,
  (plugins): UiPluginMetadata[] => plugins.filter((plugin) => !plugin.enabled)
);

const getActivePluginIndex = createSelector(
  getUiPlugins,
  getActivePlugin,
  (plugins, activePlugin) => {
    return plugins.findIndex((plugin) => plugin.id === activePlugin);
  }
);

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  readonly activePlugin$ = this.store.pipe(select(getActivePlugin));
  readonly activePluginIndex$ = this.store.pipe(select(getActivePluginIndex));
  readonly plugins$ = this.store.pipe(select(getUiPlugins));
  readonly disabledPlugins$ = this.store.pipe(select(getDisabledPlugins));

  constructor(private readonly store: Store<State>) {}

  onPluginSelectionChanged({index}: MatTabChangeEvent) {
    const index$ = of(index);
    combineLatest(this.plugins$, index$).subscribe(([plugins, index]) => {
      this.store.dispatch(changePlugin({plugin: plugins[index].id}));
    });
  }

  onDisabledPluginSelectionChanged(selectChangeEvent: MatSelectChange) {
    this.store.dispatch(changePlugin({plugin: selectChangeEvent.value}));
  }
}
