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

import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {RouteRegistryModule} from './route_registry_module';
import {RouteKind} from './types';

@Component({
  standalone: false,
  selector: 'experiment',
  template: 'I am experiment',
})
class Experiment {}

@Component({
  standalone: false,
  selector: 'experiments',
  template: 'List of experiment',
})
class Experiments {}

@Component({
  standalone: false,
  selector: 'not_found',
  template: 'Unknown route',
})
class NotFound {}

describe('route_registry_module', () => {
  let registry: RouteRegistryModule;

  describe('with configs', () => {
    beforeEach(async () => {
      function routeFactory() {
        return [
          {
            routeKind: RouteKind.EXPERIMENT,
            path: '/experiment/:experimentId',
            ngComponent: Experiment,
          },
          {
            routeKind: RouteKind.EXPERIMENTS,
            path: '/experiments',
            ngComponent: Experiments,
          },
          {
            routeKind: RouteKind.UNKNOWN,
            path: '/crabs',
            ngComponent: NotFound,
          },
        ];
      }

      await TestBed.configureTestingModule({
        imports: [RouteRegistryModule.registerRoutes(routeFactory)],
        declarations: [Experiments, Experiment, NotFound],
      }).compileComponents();

      registry = TestBed.inject<RouteRegistryModule>(RouteRegistryModule);
    });

    it('getNgComponentByRouteKind finds a component for routeKind', () => {
      expect(registry.getNgComponentByRouteKind(RouteKind.EXPERIMENT)).toBe(
        Experiment
      );
      expect(registry.getNgComponentByRouteKind(RouteKind.EXPERIMENTS)).toBe(
        Experiments
      );
      expect(registry.getNgComponentByRouteKind(RouteKind.UNKNOWN)).toBe(
        NotFound
      );
    });
  });

  describe('without configs', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          // Creates RouteRegistryModule without any registered routes.
          RouteRegistryModule,
        ],
        declarations: [Experiments, Experiment, NotFound],
      }).compileComponents();

      registry = TestBed.inject<RouteRegistryModule>(RouteRegistryModule);
    });

    it('getRouteConfigs is not null', () => {
      expect(registry.getRouteConfigs()).not.toBeNull();
    });
  });
});
