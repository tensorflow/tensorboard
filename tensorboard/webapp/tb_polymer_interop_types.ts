/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {FeatureFlags} from './feature_flag/types';

declare global {
  // createElement type uses the TagNameMap underneath and returns the right type.
  interface HTMLElementTagNameMap {
    'tf-backend': TfBackendElement;
    'tf-feature-flags': TfFeatureFlagsElement;
    'tf-paginated-view-store': TfPaginatedViewStoreElement;
    'vz-histogram-timeseries': VzHistogramTimeSeriesElement;
  }

  interface Window {
    tensorboard: {
      tf_storage: Partial<TfStorage>;
      tf_globals: Partial<TfGlobals>;
    };
  }
}

if (!window.tensorboard) {
  window.tensorboard = {tf_storage: {}, tf_globals: {}};
}

export interface SetStringOption {
  defaultValue?: string;
  /**
   * When true, setting the string does not push a new state onto the history.
   * i.e., it uses `history.replaceState` instead of `history.pushState`.
   */
  useLocationReplace?: boolean;
}

export interface TfStorage {
  setString(key: string, value: string, options?: SetStringOption): void;
  getString(key: string): string;
  migrateLegacyURLScheme(): void;
  getUrlHashDict(): Record<string, string>;
}

export interface TfGlobals {
  setUseHash(use: boolean): void;
}

export declare interface TfGlobals {
  setUseHash(use: boolean): void;
}

export declare interface TfGlobalsElement extends HTMLElement {
  tf_globals: TfGlobals;
}

export declare interface SetStringOption {
  defaultValue?: string;
  /**
   * When true, setting the string does not push a new state onto the history.
   * i.e., it uses `history.replaceState` instead of `history.pushState`.
   */
  useLocationReplace?: boolean;
}

export declare interface TfFeatureFlags {
  setFeatureFlags(
    featureFlags: FeatureFlags,
    featureFlagsToSendToServer: Partial<FeatureFlags>
  ): void;
}

export declare interface TfFeatureFlagsElement extends HTMLElement {
  tf_feature_flags: TfFeatureFlags;
}

export declare interface TfStorage {
  setString(key: string, value: string, options?: SetStringOption): void;
  getString(key: string): string;
  migrateLegacyURLScheme(): void;
  getUrlHashDict(): Record<string, string>;
}

export declare interface TfStorageElement extends HTMLElement {
  tf_storage: TfStorage;
}

export declare interface Store {
  refresh(): Promise<void>;
}

export declare interface TfBackend {
  environmentStore: Store;
  runsStore: Store;
}

export declare interface TfBackendElement extends HTMLElement {
  tf_backend: TfBackend;
}

export declare interface TfPaginatedView {
  setLimit(limit: number): void;
}

export declare interface TfPaginatedViewStoreElement extends HTMLElement {
  tf_paginated_view: TfPaginatedView;
}

export declare interface VzHistogramDatum {
  wall_time: number;
  step: number;
  bins: Array<{x: number; dx: number; y: number}>;
}

export enum TimeProperty {
  STEP = 'step',
  WALL_TIME = 'wall_time',
  RELATIVE = 'relative',
}

export enum HistogramMode {
  OFFSET = 'offset',
  OVERLAY = 'overlay',
}

export declare interface VzHistogramTimeSeriesElement extends HTMLElement {
  mode: HistogramMode;
  timeProperty: TimeProperty;
  colorScale: {
    (runName: string): string;
  };
  setSeriesData: (name: string, data: VzHistogramDatum[]) => void;
  redraw(): void;
}
