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
import {
  CompareRouteParams,
  DeepLinkGroup,
  DEFAULT_EXPERIMENT_ID,
  ExperimentRouteParams,
  RehydratedDeepLink,
  Route,
  RouteKind,
  RouteParams,
  SerializableQueryParams,
} from './types';

/**
 * Parses short experiment name to id map encoded in string for compare route.
 *
 * e.g., /compare/exp1:12345,exp2:99999 results,
 * [
 *   {name: 'exp1', id: '12345'},
 *   {name: 'exp2', id: '99999'}
 * ]
 */
export function parseCompareExperimentStr(
  eidStr: string
): Array<{name: string; id: string}> {
  return eidStr.split(',').map((nameToIdStr) => {
    const colonIndex = nameToIdStr.indexOf(':');
    if (colonIndex < 0) {
      throw new Error(`Expect colon delimiting name and ID: ${nameToIdStr}`);
    }
    const name = nameToIdStr.slice(0, colonIndex);
    const id = nameToIdStr.slice(colonIndex + 1);
    if (!id) {
      throw new Error(`Expect id to be non-falsy: ${nameToIdStr}`);
    }

    return {name, id};
  });
}

export function serializeCompareExperimentParams(
  params: Array<{alias: string; id: string}>
): string {
  return params.map(({alias, id}) => `${alias}:${id}`).join(',');
}

/**
 * Returns experimentIds from route parameter. For a route that does not contain
 * any experiment ids, it returns null.
 */
export function getExperimentIdsFromRouteParams(
  routeKind: RouteKind,
  params: RouteParams
): string[] | null {
  switch (routeKind) {
    case RouteKind.EXPERIMENT: {
      // The route may rely on the implicit, default experiment id, if the URL
      // does not contain the experiment param.
      if (Object.prototype.hasOwnProperty.call(params, 'experimentId')) {
        return [(params as ExperimentRouteParams).experimentId];
      }
      return [DEFAULT_EXPERIMENT_ID];
    }
    case RouteKind.CARD: {
      const experimentIds = (params as CompareRouteParams).experimentIds;
      if (experimentIds.indexOf(',') < 0) {
        return [experimentIds];
      }
      return parseCompareExperimentStr(experimentIds).map(({id}) => id);
    }
    case RouteKind.COMPARE_EXPERIMENT: {
      const typedParams = params as CompareRouteParams;
      return parseCompareExperimentStr(typedParams.experimentIds).map(
        ({id}) => id
      );
    }
    case RouteKind.EXPERIMENTS:
    default:
      return null;
  }
}

/**
 * Returns whether two routes are of the same kind and point to the same set of
 * experiments.
 *
 * Describing it more generically: Returns whether two routes are of the same
 * kind and point to the same set of resources. It just happens that in
 * TensorBoard, currently, the only resources are experiments.
 */
export function areSameRouteKindAndExperiments(
  route1: Pick<Route, 'routeKind' | 'params'> | null,
  route2: Pick<Route, 'routeKind' | 'params'> | null
) {
  if (!route1 || !route2) {
    // At least one of the Routes are null. If they are both null then we
    // consider them to be the same.
    return route1 === route2;
  }

  if (route1.routeKind !== route2.routeKind) {
    // Not same kind of route. Escape early.
    return false;
  }

  // Check if same set of experiments.
  const route1Experiments = getExperimentIdsFromRouteParams(
    route1.routeKind,
    route1.params
  );
  const route2Experiments = getExperimentIdsFromRouteParams(
    route2.routeKind,
    route2.params
  );
  if (route1Experiments === null || route2Experiments === null) {
    // At least one of the routes does not contain experiments. Check whether
    // they both do not contain experiments.
    return route1Experiments === route2Experiments;
  }
  // Both routes contain experiments. Check if they have the exact same set of
  // experiments.
  if (route1Experiments.length !== route2Experiments.length) {
    return false;
  }
  const sortedRoute2Experiments = route2Experiments.sort();
  return route1Experiments
    .sort()
    .every((value, index) => sortedRoute2Experiments[index] === value);
}

export function createURLSearchParamsFromSerializableQueryParams(
  params: SerializableQueryParams
): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const {key, value} of params) {
    searchParams.append(key, value);
  }
  return searchParams;
}

/**
 * Checks whether two sets of URL path and query parameters are equal.
 *
 * Limitations: order of the params have to be equal too; e.g., a=1&b=2 will not
 * equal b=2&a=1).
 */
export function arePathsAndQueryParamsEqual(
  aRoute: {pathname: string; queryParams: SerializableQueryParams},
  bRoute: {pathname: string; queryParams: SerializableQueryParams}
): boolean {
  if (
    aRoute.pathname !== bRoute.pathname ||
    aRoute.queryParams.length !== bRoute.queryParams.length
  ) {
    return false;
  }

  return aRoute.queryParams.every((paramA, index) => {
    const paramB = bRoute.queryParams[index];
    return paramA.key === paramB.key && paramA.value === paramB.value;
  });
}

/**
 * Maps route kinds to their deep link groups.
 */
export function getDeepLinkGroup(routeKind: RouteKind): DeepLinkGroup | null {
  switch (routeKind) {
    case RouteKind.EXPERIMENTS:
      return DeepLinkGroup.EXPERIMENTS;
    case RouteKind.EXPERIMENT:
    case RouteKind.CARD:
    case RouteKind.COMPARE_EXPERIMENT:
      return DeepLinkGroup.DASHBOARD;
    case RouteKind.UNKNOWN:
    case RouteKind.NOT_SET:
      return null;
  }
}

/**
 * Determines whether a combination of route kind and namespace id should have
 * a URL deep link rehydrated into state.
 *
 * We limit the number of times we rehydrate deep links as a user navigates
 * through browser history using back and forward buttons -- rehydrating only
 * one time for each combination of namespaceId and deepLinkGroup.
 *
 * So, for example, when:
 *
 * 1. User reloads page into experiment list, rehydrate state for the
 *    EXPERIMENTS deep link group.
 * 2. User then navigates back to a compare view, rehydrate state for the
 *    DASHBOARD deep link group.
 * 3. User then navigates back to an experiment view, DO NOT rehydrate state
 *    again for the DASHBOARD deep link group as it was rehydrated in step (2).
 * 4. If user then navigates back to an experiment view but in a different
 *    namespace, then once again rehydrate state for the DASHBOARD deep link
 *    group.
 */
export function canRehydrateDeepLink(
  routeKind: RouteKind,
  namespaceId: string,
  rehydratedDeepLinks: RehydratedDeepLink[]
) {
  const deepLinkGroup = getDeepLinkGroup(routeKind);
  return (
    deepLinkGroup !== null &&
    !rehydratedDeepLinks.some(
      (rehydratedDeepLink) =>
        rehydratedDeepLink.deepLinkGroup === deepLinkGroup &&
        rehydratedDeepLink.namespaceId === namespaceId
    )
  );
}

/**
 * Generates a 32-character long random id for namespace suffix to avoid
 * collision of timestamp.
 */
export function generateRandomIdForNamespace() {
  const arr = new Uint8Array(32);

  crypto.getRandomValues(arr);

  let ret = '';
  for (const el of arr) {
    // We select base 16 which means the character of id is [0-9a-d].
    // We only need four bits to convert to base 16 string (2^4) from Uint8array.
    // Thus we get rid of the last 4 bit and then convert the rest of it.
    // For example, number 162 is 10100010 in binary. After dropping
    // the rightest 4 bit, it is 1010, which is 10 in decimal number. Converts
    // 10 to base 16 it is 'a'.
    ret += (el >> 4).toString(16);
  }

  return ret;
}
