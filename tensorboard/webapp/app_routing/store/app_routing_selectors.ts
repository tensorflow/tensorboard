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
import {createFeatureSelector, createSelector} from '@ngrx/store';

import {
  getExperimentIdsFromRouteParams,
  getRouteId as getRouteIdFromKindAndParams,
  parseCompareExperimentStr,
} from '../internal_utils';
import {CompareRouteParams, Route, RouteKind} from '../types';

import {
  APP_ROUTING_FEATURE_KEY,
  AppRoutingState,
  State,
} from './app_routing_types';

/** @typehack */ import * as _typeHackStore from '@ngrx/store';

const getAppRoutingState = createFeatureSelector<State, AppRoutingState>(
  APP_ROUTING_FEATURE_KEY
);

export const getActiveRoute = createSelector(
  getAppRoutingState,
  (state: AppRoutingState) => {
    return state.activeRoute;
  }
);

export const getNextRouteForRouterOutletOnly = createSelector(
  getAppRoutingState,
  (state: AppRoutingState): Route | null => {
    return state.nextRoute;
  }
);

export const getRouteKind = createSelector(getActiveRoute, (activeRoute) => {
  return activeRoute ? activeRoute.routeKind : RouteKind.UNKNOWN;
});

export const getRouteParams = createSelector(getActiveRoute, (activeRoute) => {
  return activeRoute ? activeRoute.params : {};
});

/**
 * Returns experiment ids activated by route. The value can be null if current
 * route does not have eids.
 */
export const getExperimentIdsFromRoute = createSelector(
  getRouteKind,
  getRouteParams,
  (routeKind, routeParams): string[] | null => {
    return getExperimentIdsFromRouteParams(routeKind, routeParams);
  }
);

export const getRouteId = createSelector(
  getRouteKind,
  getRouteParams,
  (routeKind, routeParams): string => {
    return getRouteIdFromKindAndParams(routeKind, routeParams);
  }
);

export const getExperimentIdToAliasMap = createSelector(
  getRouteKind,
  getRouteParams,
  (routeKind, routeParams) => {
    const idToDisplayName: {[id: string]: string} = {};

    if (routeKind !== RouteKind.COMPARE_EXPERIMENT) {
      return idToDisplayName;
    }

    const compareParams = routeParams as CompareRouteParams;
    const nameAndIds = parseCompareExperimentStr(compareParams.experimentIds);
    for (const {id, name} of nameAndIds) {
      idToDisplayName[id] = name;
    }
    return idToDisplayName;
  }
);
