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
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  TemplateRef,
} from '@angular/core';
import {Store, createSelector} from '@ngrx/store';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';

import {
  getPlugins,
  getActivePlugin,
  getPluginsListLoaded,
  getEnvironment,
} from '../core/store';
import {PluginsListFailureCode} from '../core/types';
import {PluginMetadata} from '../types/api';
import {LoadState, DataLoadState} from '../types/data';
import {State} from '../core/store/core_types';

import {PluginLoadState} from './plugins_component';

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
      [activeKnownPlugin]="activeKnownPlugin$ | async"
      [activePluginId]="activePluginId$ | async"
      [dataLocation]="dataLocation$ | async"
      [lastUpdated]="lastLoadedTimeInMs$ | async"
      [pluginLoadState]="pluginLoadState$ | async"
      [environmentFailureNotFoundTemplate]="environmentFailureNotFoundTemplate"
      [environmentFailureUnknownTemplate]="environmentFailureUnknownTemplate"
    ></plugins-component>
  `,
  styles: ['plugins-component { height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginsContainer {
  readonly activeKnownPlugin$ = this.store.select(activePlugin);
  readonly activePluginId$ = this.store.select(getActivePlugin);

  @Input()
  environmentFailureNotFoundTemplate?: TemplateRef<any>;

  @Input()
  environmentFailureUnknownTemplate?: TemplateRef<any>;

  readonly pluginLoadState$ = combineLatest(
    this.activeKnownPlugin$,
    this.activePluginId$,
    this.store.select(getPluginsListLoaded)
  ).pipe(
    map(([activePlugin, activePluginId, loadState]) => {
      if (loadState.failureCode !== null) {
        // Despite its 'Plugins'-specific name, getPluginsListLoaded actually
        // encapsulates multiple requests to load different parts of the
        // environment.
        if (loadState.failureCode === PluginsListFailureCode.NOT_FOUND) {
          return PluginLoadState.ENVIRONMENT_FAILURE_NOT_FOUND;
        } else {
          return PluginLoadState.ENVIRONMENT_FAILURE_UNKNOWN;
        }
      }

      if (activePlugin !== null) {
        return PluginLoadState.LOADED;
      }

      if (
        loadState.lastLoadedTimeInMs === null &&
        loadState.state === DataLoadState.LOADING
      ) {
        return PluginLoadState.LOADING;
      }

      if (activePluginId) {
        return PluginLoadState.UNKNOWN_PLUGIN_ID;
      }

      return PluginLoadState.NO_ENABLED_PLUGINS;
    })
  );

  readonly lastLoadedTimeInMs$ = this.store.select(lastLoadedTimeInMs);
  readonly dataLocation$ = this.store.select(getEnvironment).pipe(
    map((env) => {
      return env.data_location;
    })
  );

  constructor(private readonly store: Store<State>) {}
}
