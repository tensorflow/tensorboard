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
import {ExperimentAlias} from '../../experiments/types';
import {getExperimentIdsFromRouteParams} from '../internal_utils';
import {
  getCompareExperimentIdAliasSpec,
  getCompareExperimentIdAliasWithNumberSpec,
} from '../store_only_utils';
import {
  CompareRouteParams,
  RehydratedDeepLink,
  Route,
  RouteKind,
} from '../types';
import {
  AppRoutingState,
  APP_ROUTING_FEATURE_KEY,
  State,
} from './app_routing_types';

const getAppRoutingState = createFeatureSelector<AppRoutingState>(
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

export const getActiveNamespaceId = createSelector(
  getAppRoutingState,
  (state): string | null => {
    return state.activeNamespaceId;
  }
);

export const getRehydratedDeepLinks = createSelector(
  getAppRoutingState,
  (state): RehydratedDeepLink[] => {
    return state.rehydratedDeepLinks;
  }
);

export const getRegisteredRouteKinds = createSelector<
  State,
  AppRoutingState,
  Set<RouteKind>
>(getAppRoutingState, (state) => {
  return state.registeredRouteKeys;
});

/**
 * Returns current RouteKind or returns `null` if route is not set at all
 * (e.g., an application does not define any routes).
 */
export const getRouteKind = createSelector(getActiveRoute, (activeRoute) => {
  return activeRoute ? activeRoute.routeKind : RouteKind.NOT_SET;
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

/**
 * @deprecated
 */
export const getExperimentIdToAliasMap = createSelector(
  getRouteKind,
  getRouteParams,
  (routeKind, routeParams): {[id: string]: string} => {
    if (routeKind !== RouteKind.COMPARE_EXPERIMENT) {
      return {};
    }

    const compareParams = routeParams as CompareRouteParams;
    const userDefinedAliasMap = getCompareExperimentIdAliasSpec(compareParams);
    return Object.fromEntries(userDefinedAliasMap.entries());
  }
);

export const getExperimentIdToExperimentAliasMap = createSelector(
  getRouteKind,
  getRouteParams,
  (routeKind, routeParams): {[id: string]: ExperimentAlias} => {
    const compareParams = routeParams as CompareRouteParams;
    if (
      routeKind !== RouteKind.COMPARE_EXPERIMENT &&
      !(
        routeKind === RouteKind.CARD &&
        compareParams.experimentIds.indexOf(',') !== -1
      )
    ) {
      return {};
    }

    const map = getCompareExperimentIdAliasWithNumberSpec(compareParams);
    return Object.fromEntries(map.entries());
  }
);
