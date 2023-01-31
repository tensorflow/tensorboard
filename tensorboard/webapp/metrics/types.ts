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
export * from './internal_types';

// When adding a new value to the enum, please implement the deserializer on
// data_source/metrics_data_source.ts.
// When editing a value of the enum, please write a backward compatible
// deserializer in tensorboard/webapp/metrics/store/metrics_reducers.ts
export enum TooltipSort {
  DEFAULT = 'default',
  ALPHABETICAL = 'alphabetical',
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
  NEAREST = 'nearest',
  NEAREST_Y = 'nearest_Y',
}

/**
 * An object which is intended to hold the min and max step within each scalar
 * card.
 */
export interface MinMaxStep {
  minStep: number;
  maxStep: number;
}
