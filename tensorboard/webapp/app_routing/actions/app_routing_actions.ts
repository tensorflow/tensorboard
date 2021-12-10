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
import {createAction, props} from '@ngrx/store';
import {Navigation, Route, RouteKind} from '../types';

/**
 * Created when user wants to discard unsaved edits and navigate away.
 */
export const discardDirtyUpdates = createAction(
  '[App Routing] Discarding Unsaved Updates'
);

/**
 * Created when router rehydrates state from the URL after a browser initiated
 * event. Please do note that the action is fired before `navigated` so make
 * sure the view can handle inconsistent state right before a navigation.
 */
export const stateRehydratedFromUrl = createAction(
  '[App Routing] State Rehydrated From Url',
  props<{
    routeKind: RouteKind;
    partialState: {};
  }>()
);

/**
 * Created when the route configurations are loaded on the initial load.
 */
export const routeConfigLoaded = createAction(
  '[App Routing] Route Config Loaded',
  props<{routeKinds: Set<RouteKind>}>()
);

/**
 * Created when user intends to navigate in the application
 */
export const navigationRequested = createAction(
  '[App Routing] In App Navigation Requested',
  props<Navigation>()
);

export interface NavigatingPayload {
  after: Route;
}

/**
 * Created after a route is matched but before navigated.
 */
export const navigating = createAction(
  '[App Routing] In App Navigating',
  props<NavigatingPayload>()
);

export interface NavigatedPayload {
  before: Route | null;
  after: Route;
  beforeNamespaceId: string | null;
  afterNamespaceId: string;
}

/**
 * Created after navigation is successful.
 */
export const navigated = createAction(
  '[App Routing] In App Navigated',
  props<NavigatedPayload>()
);
