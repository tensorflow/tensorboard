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
import {Route, RouteKind} from '../types';

export const APP_ROUTING_FEATURE_KEY = 'app_routing';

export interface AppRoutingState {
  activeRoute: Route | null;
  // Transient state that tells certain components like the router-outlet to
  // make changes before a route change. `nextRoute` is non-null only while
  // we are navigating.
  nextRoute: Route | null;
  // The id of the namespace that is currently active.
  activeNamespaceId: string | null;
  // All namespaces that currently have a representation in state. This includes
  // the active namespace but also any cached namespaces.
  knownNamespaceIds: Set<string>;
  registeredRouteKeys: Set<RouteKind>;
}

export interface State {
  [APP_ROUTING_FEATURE_KEY]?: AppRoutingState;
}
