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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {State} from '../../app_state';
import {areSameRouteKindAndExperiments} from '../internal_utils';
import {RouteRegistryModule} from '../route_registry_module';
import {
  getActiveRoute,
  getNextRouteForRouterOutletOnly,
} from '../store/app_routing_selectors';

@Component({
  standalone: false,
  selector: 'router-outlet',
  template: `
    <router-outlet-component
      [activeNgComponent]="activeNgComponent$ | async"
    ></router-outlet-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouterOutletContainer {
  activeNgComponent$;

  constructor(
    private readonly store: Store<State>,
    private readonly registry: RouteRegistryModule
  ) {
    this.activeNgComponent$ = combineLatest([
      this.store.select(getActiveRoute),
      this.store.select(getNextRouteForRouterOutletOnly),
    ]).pipe(
      map(([activeRoute, nextRoute]) => {
        if (!activeRoute) {
          return null;
        }
        const isRouteTransitioning =
          nextRoute !== null &&
          !areSameRouteKindAndExperiments(activeRoute, nextRoute);
        return isRouteTransitioning
          ? null
          : this.registry.getNgComponentByRouteKind(activeRoute.routeKind);
      })
    );
  }
}
