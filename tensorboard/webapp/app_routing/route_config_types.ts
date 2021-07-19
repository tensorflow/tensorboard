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
import {Component, Type} from '@angular/core';

import {DeepLinkProvider} from './deep_link_provider';
import {RouteKind} from './types';

export interface ConcreteRouteDef {
  routeKind: RouteKind;
  // Has similar syntax as Angular Router's route spec.m
  // e.g.,
  // '/experiments'
  // '/experiment/:experimentId'
  // Parameter has to be denoted with ":" prefix and "/" has to precede it.
  path: string;

  ngComponent: Type<Component>;

  // Redirect to this `path` if current navigation does not match any known
  // routes. Only one RouteConfig can have defaultRoute = true.
  defaultRoute?: boolean;

  // In TensorBoard, query parameters are only used to reflect certain state in
  // the application that can be used to bootstrap the application. It provides,
  // for user, to open TensorBoard in specific state with a link.
  //
  // Because only handful of application state should be reflected so URL is
  // more readable and more maintainable and because the state that is pertinent
  // to current view is tied strongly to the route, the deep linking will be
  // defined as part of the route configuration.
  //
  // The function is called when navigating to this route. The Observable can
  // emit when the state that needs to be persisted changes.
  deepLinkProvider?: DeepLinkProvider;
}

export interface RedirectionRouteDef {
  routeKind?: null;
  path: string;
  redirectionPath: string;
}

export interface ProgrammticRedirectionRouteDef {
  /**
   * A path that should activate the route definition. A Parameter, see
   * definition in `ConcreteRouteDef`, is only used as a wild card and its value
   * is not used meaningfully as all raw `pathParts` are passed to the
   * `redirector`.
   */
  path: string;
  /**
   * A function that returns, from a pathParts, a new pathParts it should
   * redirect to.
   */
  redirector: (pathParts: string[]) => string[];
}

export type RouteDef =
  | ConcreteRouteDef
  | RedirectionRouteDef
  | ProgrammticRedirectionRouteDef;

export function isConcreteRouteDef(
  definition: RouteDef
): definition is ConcreteRouteDef {
  return (definition as ConcreteRouteDef).routeKind != undefined;
}

export function isStaticRedirectionRouteDef(
  definition: RouteDef
): definition is RedirectionRouteDef {
  return (definition as RedirectionRouteDef).redirectionPath !== undefined;
}
