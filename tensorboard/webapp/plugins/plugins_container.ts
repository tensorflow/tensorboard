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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store, select, createSelector} from '@ngrx/store';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

import {getPlugins, getActivePlugin, getPluginsListLoaded} from '../core/store';
import {PluginMetadata} from '../types/api';
import {LoadState, DataLoadState} from '../types/data';
import {State} from '../core/store/core_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

export interface UiPluginMetadata extends PluginMetadata {
  id: string;
}

const activePlugin = createSelector(
  getPlugins,
  getActivePlugin,
  (plugins, id): UiPluginMetadata | null => {
    if (!id || !plugins[id]) return null;
    return Object.assign({id}, plugins[id]);
  }
);

const lastLoadedTimeInMs = createSelector(
  getPluginsListLoaded,
  (loadState: LoadState) => {
    return loadState.lastLoadedTimeInMs;
  }
);

@Component({
  selector: 'plugins',
  template: `
    <plugins-component
      [activePlugin]="activePlugin$ | async"
      [noEnabledPlugin]="noEnabledPlugin$ | async"
      [lastUpdated]="lastLoadedTimeInMs$ | async"
    ></plugins-component>
  `,
  styles: ['plugins-component { height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginsContainer {
  readonly activePlugin$ = this.store.pipe(select(activePlugin));
  readonly noEnabledPlugin$ = combineLatest(
    this.store.select(activePlugin),
    this.store.select(getPluginsListLoaded)
  ).pipe(
    map(([activePlugin, loadState]) => {
      return (
        activePlugin === null &&
        (loadState.state === DataLoadState.LOADED ||
          loadState.state === DataLoadState.FAILED)
      );
    })
  );
  readonly lastLoadedTimeInMs$ = this.store.pipe(select(lastLoadedTimeInMs));

  constructor(private readonly store: Store<State>) {}
}
