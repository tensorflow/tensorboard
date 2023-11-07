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
  Component,
  Inject,
  ModuleWithProviders,
  NgModule,
  Optional,
  Type,
} from '@angular/core';
import {RouteConfigs} from './route_config';
import {isConcreteRouteDef, RouteDef} from './route_config_types';
import {ROUTE_CONFIGS_TOKEN} from './route_registry_types';
import {RouteKind} from './types';

@NgModule({})
export class RouteRegistryModule {
  private readonly routeConfigs: RouteConfigs;
  private readonly routeKindToNgComponent = new Map<
    RouteKind,
    Type<Component>
  >();

  constructor(
    @Optional() @Inject(ROUTE_CONFIGS_TOKEN) configsList: RouteDef[][]
  ) {
    if (!configsList) {
      this.routeConfigs = new RouteConfigs([]);
      return;
    }

    const configs: RouteDef[] = [];
    for (const routeDefList of configsList) {
      for (const routeDef of routeDefList) {
        configs.push(routeDef);
      }
    }
    this.routeConfigs = new RouteConfigs(configs);
    configs.forEach((config) => {
      if (isConcreteRouteDef(config)) {
        this.routeKindToNgComponent.set(config.routeKind, config.ngComponent);
      }
    });
  }

  getRegisteredRouteKinds(): Iterable<RouteKind> {
    return this.routeKindToNgComponent.keys();
  }

  /**
   * Returns RouteConfigs of current route configuration. Returnsn null if no
   * routes are registered.
   */
  getRouteConfigs(): RouteConfigs {
    return this.routeConfigs;
  }

  getNgComponentByRouteKind(routeKind: RouteKind): Type<Component> | null {
    return this.routeKindToNgComponent.get(routeKind) || null;
  }

  /**
   * An NgModule that registers routes.
   *
   * Note: especially because Polymer based TensorBoard requires relative paths
   * for making requests, although not required, prefer to have path that ends
   * with "/".
   *
   * Example:
   *
   * function routeProvider() {
   *   return [{
   *     path: '/experiments/',
   *     ngComponent: ScalarsDashboard,
   *     routeKind: RouteKind.EXPERIMENTS,
   *   }];
   * }
   *
   * @NgModule({
   *   imports: [
   *     RouteRegistryModule.registerRoutes(routesProvider),
   *   ],
   * })
   */
  static registerRoutes(
    routeConfigProvider: () => RouteDef[]
  ): ModuleWithProviders<RouteRegistryModule> {
    return {
      ngModule: RouteRegistryModule,
      providers: [
        {
          provide: ROUTE_CONFIGS_TOKEN,
          multi: true,
          useFactory: routeConfigProvider,
        },
      ],
    };
  }
}
