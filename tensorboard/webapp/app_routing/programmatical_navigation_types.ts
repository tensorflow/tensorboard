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
import {InjectionToken} from '@angular/core';
import {Action, ActionCreator, Creator} from '@ngrx/store';
import {ExperimentRouteParams, RouteKind} from './types';

export const NAVIGATION_PROVIDER = new InjectionToken<NavigationLambda[]>(
  '[App Routing] Programmatical Navigation Provider'
);

export interface NavigateToExperiment {
  routeKind: RouteKind.EXPERIMENT;
  routeParams: ExperimentRouteParams;
  resetNamespacedState?: boolean;
}

export interface NavigateToCompare {
  routeKind: RouteKind.COMPARE_EXPERIMENT;
  routeParams: {
    aliasAndExperimentIds: Array<{alias: string; id: string}>;
  };
  resetNamespacedState?: boolean;
}

export interface NavigateToExperiments {
  routeKind: RouteKind.EXPERIMENTS;
  routeParams: {};
  resetNamespacedState?: boolean;
}

export type ProgrammaticalNavigation =
  | NavigateToExperiment
  | NavigateToCompare
  | NavigateToExperiments;

export interface NavigationLambda {
  actionCreator: ActionCreator<string, Creator>;
  /**
   * The function that determines the navigation to be performed when the action
   * is triggered. May return `null` to indicate that no navigation should
   * occur.
   */
  lambda(action: Action): ProgrammaticalNavigation | null;
}
