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
import {createAction, props} from '@ngrx/store';
import {Environment, PluginId, PluginsListing} from '../../types/api';
import {PluginsListFailureCode, Run, RunId} from '../types';

/**
 * User has clicked on a button in the header to change the plugin.
 */
export const changePlugin = createAction(
  '[Core] Plugin Changed',
  props<{plugin: PluginId}>()
);

/**
 * Plugin information in the hash is changed by user action.
 * e.g., user can use browser navigation button to change the hash.
 */
export const pluginUrlHashChanged = createAction(
  '[Core] Plugin Url Hash Changed',
  props<{plugin: PluginId}>()
);

/**
 * @deprecated View should not fire coreLoaded to trigger data re-fetch.
 */
export const coreLoaded = createAction('[Core] Loaded');

export const manualReload = createAction('[Core] User Triggered Reload');

export const reload = createAction('[Core] Auto Reload');

export const pluginsListingRequested = createAction(
  '[Core] PluginListing Fetch Requested'
);
export const pluginsListingLoaded = createAction(
  '[Core] PluginListing Fetch Successful',
  props<{plugins: PluginsListing}>()
);
export const pluginsListingFailed = createAction(
  '[Core] PluginListing Fetch Failed',
  props<{failureCode: PluginsListFailureCode}>()
);

export const polymerRunsFetchRequested = createAction(
  '[Core] Polymer Component Runs Fetch Requested'
);

export const polymerRunsFetchSucceeded = createAction(
  '[Core] Polymer Component Runs Fetch Successful'
);

export const polymerRunsFetchFailed = createAction(
  '[Core] Polymer Component Runs Fetch Failed'
);

/**
 * Action for when Environment data has been loaded from the WebApp server.
 */
export const environmentLoaded = createAction(
  '[Core] Environment Fetch Successful',
  props<{environment: Environment}>()
);

/**
 * Action for when user wants to change the runs selection in the tf-runs-selector.
 *
 * Action is reserved for the wrapper for the Polymer based tf-runs-selector.
 */
export const polymerInteropRunSelectionChanged = createAction(
  '[Core] Run Selection Changed',
  props<{nextSelection: RunId[]}>()
);

export const fetchRunSucceeded = createAction(
  '[Core] Run Fetch Successful',
  props<{runs: Run[]}>()
);

export const sideBarWidthChanged = createAction(
  '[Core] Side Bar Width Changed',
  props<{widthInPercent: number}>()
);

export const runsTableFullScreenToggled = createAction(
  '[Core] Runs Table Full Screen Toggled'
);
