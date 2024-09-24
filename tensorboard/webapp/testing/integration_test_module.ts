/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
 * Module for helping with integrational style testing.
 *
 * This module does not facilitate any screenshot testing.
 */
import {Component, NgModule} from '@angular/core';
import {EffectsModule as NgrxEffectsModule} from '@ngrx/effects';
import {StoreModule as NgrxStoreModule} from '@ngrx/store';
import {AppRoutingModule} from '../app_routing/app_routing_module';
import {RouteDef} from '../app_routing/route_config_types';
import {RouteRegistryModule} from '../app_routing/route_registry_module';
import {RouteKind} from '../app_routing/types';
import {CoreModule} from '../core/core_module';
import {TestableNoopHashDeepLinkerModule} from '../deeplink/testing';
import {FeatureFlagModule} from '../feature_flag/feature_flag_module';
import {RunsModule} from '../runs/runs_module';
import {MatIconTestingModule} from './mat_icon_module';

@Component({
  standalone: false,
  selector: 'test',
  template: 'hello',
})
export class TestableComponent {}

// Fake route definition to prevent route redirection due to the `defaultRoute` on the
// real one.
export function provideRoute(): RouteDef[] {
  return [
    {
      routeKind: RouteKind.EXPERIMENT,
      path: '/',
      ngComponent: TestableComponent,
    },
  ];
}

@NgModule({
  imports: [
    MatIconTestingModule,
    FeatureFlagModule,
    CoreModule,
    AppRoutingModule,
    RunsModule,
    TestableNoopHashDeepLinkerModule,
    RouteRegistryModule.registerRoutes(provideRoute),
    NgrxStoreModule.forRoot([]),
    NgrxEffectsModule.forRoot([]),
  ],
  declarations: [TestableComponent],
  exports: [TestableComponent],
  jit: true,
})
export class IntegrationTestSetupModule {}
