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
  DEFAULT_EXPERIMENT_ID,
  ExperimentRouteParams,
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

    if (!name) {
      throw new Error(`Expect name to be non-falsy: ${nameToIdStr}`);
    }

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
 * Returns an identifier that identifies known top-level routes. It is similar
 * to `url` but ignores hash and returns "unknown" for unknown routes.
 */
export function getRouteId(routeKind: RouteKind, params: RouteParams): string {
  switch (routeKind) {
    case RouteKind.COMPARE_EXPERIMENT:
    case RouteKind.EXPERIMENT: {
      const experimentIds =
        getExperimentIdsFromRouteParams(routeKind, params) ?? [];
      experimentIds.sort();
      return `${routeKind}/${experimentIds.join(',')}`;
    }
    case RouteKind.EXPERIMENTS:
      return String(routeKind);
    case RouteKind.NOT_SET:
      return '__not_set';
    default:
      return '';
  }
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
 * Checks whether two RouteOrNavs are equal. RouteOrNav is defined to be Route
 * or Navigation.
 *
 * Limitations: currently, they only match pathname and query parameter (order
 * of the params have to be equal too; e.g., a=1&b=2 will not equal b=2&a=1).
 */
export function areRoutesEqual(
  aRoute: Pick<Route, 'pathname' | 'queryParams'>,
  bRoute: Pick<Route, 'pathname' | 'queryParams'>
): boolean {
  // TODO(stephanwlee): support hashes.
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
