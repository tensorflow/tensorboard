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
import {Action, createReducer, on} from '@ngrx/store';
import * as actions from '../actions';
import {canRehydrateDeepLink, getDeepLinkGroup} from '../internal_utils';
import {AppRoutingState} from './app_routing_types';

const initialState: AppRoutingState = {
  activeRoute: null,
  nextRoute: null,
  activeNamespaceId: null,
  rehydratedDeepLinks: [],
  registeredRouteKeys: new Set(),
};

const reducer = createReducer(
  initialState,
  on(actions.navigating, (state, {after}) => {
    return {...state, nextRoute: after};
  }),
  on(actions.navigated, (state, {after, afterNamespaceId}) => {
    let rehydratedDeepLinks = state.rehydratedDeepLinks;
    if (
      canRehydrateDeepLink(
        after.routeKind,
        afterNamespaceId,
        rehydratedDeepLinks
      )
    ) {
      rehydratedDeepLinks = [...rehydratedDeepLinks];
      rehydratedDeepLinks.push({
        // Note: getDeepLinkGroup() should return non-null given that
        // canRehydrateDeepLink() returned true.
        deepLinkGroup: getDeepLinkGroup(after.routeKind)!,
        namespaceId: afterNamespaceId,
      });
    }
    return {
      ...state,
      activeRoute: after,
      nextRoute: null,
      activeNamespaceId: afterNamespaceId,
      rehydratedDeepLinks,
    };
  }),
  on(actions.routeConfigLoaded, (state, {routeKinds}) => {
    return {
      ...state,
      registeredRouteKeys: routeKinds,
    };
  })
);

export function reducers(state: AppRoutingState, action: Action) {
  return reducer(state, action);
}
