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
import {Inject, ModuleWithProviders, NgModule, Optional} from '@angular/core';
import {Action, ActionCreator, Creator} from '@ngrx/store';
import {
  NavigationLambda,
  NAVIGATION_PROVIDER,
  ProgrammaticalNavigation,
} from './programmatical_navigation_types';

export {
  NavigateToCompare,
  NavigateToExperiment,
  NavigateToExperiments,
} from './programmatical_navigation_types';

@NgModule({})
export class ProgrammaticalNavigationModule {
  private readonly providers = new Map<string, NavigationLambda['lambda']>();

  constructor(
    @Optional() @Inject(NAVIGATION_PROVIDER) providers: NavigationLambda[]
  ) {
    for (const provider of providers || []) {
      if (this.providers.has(provider.actionCreator.type)) {
        throw new RangeError(
          `"${provider.actionCreator.type}" is already registered for nav.` +
            ' Multiple navigations on same kick is not allowed.'
        );
      }
      this.providers.set(provider.actionCreator.type, provider.lambda);
    }
  }

  getNavigation(action: Action): ProgrammaticalNavigation | null {
    const lambda = this.providers.get(action.type);
    if (!lambda) {
      return null;
    }
    return lambda(action);
  }

  /**
   * An NgModule that provides programmmatic navigation routines.
   * On an action subscribed fire, it invokes a navigation.
   *
   * WARN: internally, it is implemented with Ngrx composite actions so there
   * may be a timing issue. Mitigate the issue by account for potential data
   * inconsistency issue in the container.
   *
   * function provider() {
   *   return {
   *     actionCreator: somethingHappened,
   *     lambda: (action: typeof somethingHappened) => {
   *       return {routeKind: RouteKind.EXPERIMENT, routeParams: {}};
   *     },
   *   };
   * }
   *
   * @NgModule({
   *   imports: [
   *     RouteRegistryModule.registerProgrammaticalNavigation(provider),
   *     RouteRegistryModule.registerProgrammaticalNavigation(anotherProvider),
   *   ],
   * })
   */
  static registerProgrammaticalNavigation<
    AC extends ActionCreator<string, Creator>,
    U extends Action = Action
  >(
    providerFactory: () => {
      actionCreator: AC;
      lambda: (action: U) => ProgrammaticalNavigation | null;
    }
  ): ModuleWithProviders<ProgrammaticalNavigationModule> {
    return {
      ngModule: ProgrammaticalNavigationModule,
      providers: [
        {
          provide: NAVIGATION_PROVIDER,
          multi: true,
          useFactory: providerFactory,
        },
      ],
    };
  }
}
