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
import {Injectable, Provider} from '@angular/core';

import {of} from 'rxjs';

import {navigated, NavigatedPayload} from './actions';
import {Location} from './location';
import {Route, RouteKind} from './types';

/** @typehack */ import * as _typeHackModels from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackRxjs from 'rxjs';
import {getRouteId} from './internal_utils';

export function buildRoute(routeOverride: Partial<Route> = {}): Route {
  return {
    routeKind: RouteKind.EXPERIMENTS,
    pathname: '/experiments',
    params: {},
    queryParams: [],
    ...routeOverride,
  };
}

export function buildCompareRoute(
  aliasAndExperimentIds: string[],
  routeOverride: Partial<Route> = {}
): Route {
  return {
    routeKind: RouteKind.COMPARE_EXPERIMENT,
    pathname: '/campare',
    params: {experimentIds: aliasAndExperimentIds.join(',')},
    queryParams: [],
    ...routeOverride,
  };
}

export function buildNavigatedAction(overrides?: Partial<NavigatedPayload>) {
  return navigated({
    before: null,
    after: buildRoute(),
    beforeNamespaceId: overrides?.before ? 'namespace' : null,
    afterNamespaceId: 'namespace',
    ...overrides,
  });
}

/**
 * A navigation that corresponds to a change in route id (new route context)
 * will be created.
 */
export function buildNavigatedToNewRouteIdAction() {
  const beforeRoute = buildRoute({
    routeKind: RouteKind.EXPERIMENT,
    params: {experimentId: 'abc'},
  });
  const afterRoute = buildRoute({
    routeKind: RouteKind.EXPERIMENT,
    params: {experimentId: 'xyz'},
  });
  return navigated({
    before: beforeRoute,
    after: afterRoute,
    beforeNamespaceId: getRouteId(beforeRoute.routeKind, beforeRoute.params),
    afterNamespaceId: getRouteId(afterRoute.routeKind, afterRoute.params),
  });
}

@Injectable()
export class TestableLocation extends Location {
  override getSearch() {
    return [];
  }

  override getHash() {
    return '';
  }

  override getPath() {
    return '/is/cool/';
  }

  override replaceState(path: string) {}

  override pushState(path: string) {}

  override onPopState() {
    return of({
      pathname: '/is/cool/',
    });
  }
}

export function provideLocationTesting(): Provider {
  return [
    TestableLocation,
    {
      provide: Location,
      useExisting: TestableLocation,
    },
  ];
}
