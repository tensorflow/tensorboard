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
import {TfGlobals, TfStorage} from './tb_polymer_interop_type_definitions';

declare global {
  // createElement type uses the TagNameMap underneath and returns the right type.
  interface HTMLElementTagNameMap {
    'tf-backend': TfBackendElement;
    'tf-feature-flags': TfFeatureFlagsElement;
    'tf-paginated-view-store': TfPaginatedViewStoreElement;
    'vz-histogram-timeseries': VzHistogramTimeSeriesElement;
  }

  // This type needs to be redeclared here due to an inconsistency with the
  // internal and external compilers.
  interface Window {
    tensorboard: {
      tf_storage: TfStorage;
      tf_globals: TfGlobals;
    };
  }
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
