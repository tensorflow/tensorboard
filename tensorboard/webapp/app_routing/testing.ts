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

export function buildRoute(routeOverride: Partial<Route> = {}): Route {
  return {
    routeKind: RouteKind.EXPERIMENTS,
    params: {},
    ...routeOverride,
  };
}

export function buildCompareRoute(
  aliasAndExperimentIds: string[],
  routeOverride: Partial<Route> = {}
): Route {
  return {
    routeKind: RouteKind.COMPARE_EXPERIMENT,
    params: {experimentIds: aliasAndExperimentIds.join(',')},
    ...routeOverride,
  };
}

export function buildExperimentRouteFromId(experimentId: string): Route {
  return {
    routeKind: RouteKind.EXPERIMENT,
    params: {experimentId},
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
 * Builds a navigated() event that corresponds to a change in experiment.
 */
export function buildNavigatedToNewExperimentAction() {
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
    beforeNamespaceId: 'beforeNamespace',
    afterNamespaceId: 'afterNamespace',
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

  override replaceStateUrl(path: string) {}

  override pushStateUrl(path: string) {}

  override replaceStateData(data: any) {}

  override onPopState() {
    return of({
      pathname: '/is/cool/',
      state: null,
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
