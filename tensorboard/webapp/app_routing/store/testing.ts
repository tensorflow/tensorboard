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
  AppRoutingState,
  APP_ROUTING_FEATURE_KEY,
  State,
} from './app_routing_types';

export function buildAppRoutingState(
  override?: Partial<AppRoutingState>
): AppRoutingState {
  return {
    activeRoute: null,
    nextRoute: null,
    activeNamespaceId: null,
    rehydratedDeepLinks: [],
    registeredRouteKeys: new Set(),
    ...override,
  };
}
export function buildStateFromAppRoutingState(
  appRoutingState: AppRoutingState
): State {
  return {[APP_ROUTING_FEATURE_KEY]: appRoutingState};
}
