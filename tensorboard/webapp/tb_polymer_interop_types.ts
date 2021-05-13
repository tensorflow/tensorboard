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
declare global {
  // createElement type uses the TagNameMap underneath and returns the right type.
  interface HTMLElementTagNameMap {
    'tf-backend': TfBackendElement;
    'tf-globals': TfGlobalsElement;
    'tf-storage': TfStorageElement;
    'tf-paginated-view-store': TfPaginatedViewStoreElement;
    'vz-histogram-timeseries': VzHistogramTimeSeriesElement;
  }
}

export interface TfGlobals {
  /** @export */
  setUseHash(use: boolean): void;
}

export interface TfGlobalsElement extends HTMLElement {
  /** @export */
  tf_globals: TfGlobals;
}

export interface SetStringOption {
  /** @export */
  defaultValue?: string;
  /**
   * When true, setting the string does not push a new state onto the history.
   * i.e., it uses `history.replaceState` instead of `history.pushState`.
   * @export
   */
  useLocationReplace?: boolean;
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

export interface Store {
  /** @export */
  refresh(): Promise<void>;
}

export interface TfBackend {
  /** @export */
  environmentStore: Store;
  /** @export */
  runsStore: Store;
}

export interface TfBackendElement extends HTMLElement {
  /** @export */
  tf_backend: TfBackend;
}

export interface TfPaginatedView {
  /** @export */
  setLimit(limit: number): void;
}

export interface TfPaginatedViewStoreElement extends HTMLElement {
  /** @export */
  tf_paginated_view: TfPaginatedView;
}

export interface VzHistogramDatum {
  /** @export */
  wall_time: number;
  /** @export */
  step: number;
  /** @export */
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

export interface VzHistogramTimeSeriesElement extends HTMLElement {
  /** @export */
  mode: HistogramMode;
  /** @export */
  timeProperty: TimeProperty;
  /** @export */
  colorScale: {
    (runName: string): string;
  };
  /** @export */
  setSeriesData: (name: string, data: VzHistogramDatum[]) => void;
  /** @export */
  redraw(): void;
}
