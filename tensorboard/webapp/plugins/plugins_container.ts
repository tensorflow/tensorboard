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
import {createSelector, Store} from '@ngrx/store';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../app_state';
import {
  getActivePlugin,
  getAppLastLoadedTimeInMs,
  getEnvironment,
  getPlugins,
  getPluginsListLoaded,
} from '../core/store';
import {PluginsListFailureCode} from '../core/types';
import {
  getFeatureFlags,
  getIsFeatureFlagsLoaded,
} from '../feature_flag/store/feature_flag_selectors';
import {selectors as settingsSelectors} from '../settings';
import {PluginMetadata} from '../types/api';
import {DataLoadState} from '../types/data';
import {PluginLoadState} from './plugins_component';

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

@Component({
  standalone: false,
  selector: 'plugins',
  template: `
    <plugins-component
      [activeKnownPlugin]="activeKnownPlugin$ | async"
      [activePluginId]="activePluginId$ | async"
      [dataLocation]="dataLocation$ | async"
      [lastUpdated]="lastLoadedTimeInMs$ | async"
      [pluginLoadState]="pluginLoadState$ | async"
      [isFeatureFlagsLoaded]="isFeatureFlagsLoaded$ | async"
      [settingsLoadState]="settingsLoadState$ | async"
      [featureFlags]="featureFlags$ | async"
      [environmentFailureNotFoundTemplate]="environmentFailureNotFoundTemplate"
      [environmentFailurePermissionDeniedTemplate]="
        environmentFailurePermissionDeniedTemplate
      "
      [environmentFailureUnknownTemplate]="environmentFailureUnknownTemplate"
    ></plugins-component>
  `,
  styles: ['plugins-component { height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PluginsContainer {
  readonly activeKnownPlugin$;
  readonly activePluginId$;

  @Input()
  environmentFailureNotFoundTemplate?: TemplateRef<any>;

  @Input()
  environmentFailurePermissionDeniedTemplate?: TemplateRef<any>;

  @Input()
  environmentFailureUnknownTemplate?: TemplateRef<any>;

  readonly pluginLoadState$;

  readonly lastLoadedTimeInMs$;
  readonly dataLocation$;
  readonly isFeatureFlagsLoaded$;
  readonly featureFlags$;
  readonly settingsLoadState$;

  constructor(private readonly store: Store<State>) {
    this.activeKnownPlugin$ = this.store.select(activePlugin);
    this.activePluginId$ = this.store.select(getActivePlugin);
    this.pluginLoadState$ = combineLatest(
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
          } else if (
            loadState.failureCode === PluginsListFailureCode.PERMISSION_DENIED
          ) {
            return PluginLoadState.ENVIRONMENT_FAILURE_PERMISSION_DENIED;
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
    this.lastLoadedTimeInMs$ = this.store.select(getAppLastLoadedTimeInMs);
    this.dataLocation$ = this.store.select(getEnvironment).pipe(
      map((env) => {
        return env.data_location;
      })
    );
    this.isFeatureFlagsLoaded$ = this.store.select(getIsFeatureFlagsLoaded);
    this.featureFlags$ = this.store.select(getFeatureFlags);
    this.settingsLoadState$ = this.store.select(
      settingsSelectors.getSettingsLoadState
    );
  }
}
