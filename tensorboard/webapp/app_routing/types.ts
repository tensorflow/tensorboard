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
/**
 * TensorBoard currently requires store/actions to be serializable.
 *
 * This means, we cannot use URLSearchParams. We also cannot use
 * Record<string, string> since we can lose information when "?a=1&a=2" which
 * is a legal query parameter.
 */
export type SerializableQueryParams = Array<{key: string; value: string}>;

export interface RouteParams {
  [key: string]: any;
}

export enum RouteKind {
  UNKNOWN,
  EXPERIMENTS,
  EXPERIMENT,
  COMPARE_EXPERIMENT,
}

export const DEFAULT_EXPERIMENT_ID = 'defaultExperimentId';

export interface CompareRouteParams {
  experimentIds: string;
}

export interface ExperimentRouteParams {
  experimentId: string;
}

export interface Navigation {
  pathname: string;
  replaceState?: boolean;
  // Cannot change hash yet.
}

export interface Route {
  routeKind: RouteKind;
  params: RouteParams;
  pathname: string;
  queryParams: SerializableQueryParams;
  navigationOptions: {
    replaceState: boolean;
  };
}
