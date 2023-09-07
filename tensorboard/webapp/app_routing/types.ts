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
  // Route is defined and is not known to the application.
  UNKNOWN,
  EXPERIMENTS,
  EXPERIMENT,
  COMPARE_EXPERIMENT,
  CARD,
  // Router has not yet bootstrapped and RouteKind is not set yet.
  // Temporary enum values until we can remove special cases in core_effects to
  // handle TensorBoard applications with no routes defined.
  NOT_SET,
}

export const DEFAULT_EXPERIMENT_ID = 'defaultExperimentId';

/**
 * `declare` to express this as a public API that is not to be mangleable.
 * Because `experimentIds` are declared in routes as string literals, we cannot
 * mangle the property name.
 */
export declare interface CompareRouteParams {
  experimentIds: string;
}

/**
 * `declare` to express this as a public API that is not to be mangleable.
 * Because `experimentIds` are declared in routes as string literals, we cannot
 * mangle the property name.
 */
export declare interface ExperimentRouteParams {
  experimentId: string;
}

/**
 * A navigation caused by user action in the app.
 */
export interface Navigation {
  pathname: string;
  replaceState?: boolean;
  resetNamespacedState?: boolean;
  // Cannot change hash yet.
}

/**
 * A navigation from browser history. For example, from the user clicking on
 * the 'back' or 'forward' buttons.
 */
export interface NavigationFromHistory {
  pathname: string;
  // The history state. The `state` property from PopStateEvent.
  state: any;
}

export interface Route {
  routeKind: RouteKind;
  params: RouteParams;
}

/**
 * Identifies groups of routes where we wish to only rehydrate deep links one
 * time for each group.
 */
export enum DeepLinkGroup {
  EXPERIMENTS,
  DASHBOARD,
}

/**
 * Represents a DeepLinkGroup/NamespaceId combination that has been rehydrated
 * since last browser (re)load.
 */
export interface RehydratedDeepLink {
  deepLinkGroup: DeepLinkGroup;
  namespaceId: string;
}

/**
 * Information about unsaved metadata updates to experiments.
 */
export interface DirtyUpdates {
  experimentIds?: string[];
}
