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

export type RunId = string;

export interface Run {
  id: RunId;
  name: string;
}

export enum PluginsListFailureCode {
  UNKNOWN = 'UNKNOWN',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export const TB_BRAND_NAME = new InjectionToken<string>(
  'TensorBoard brand name'
);

export interface URLDeserializedState {
  // Query parameters not recognized by TensorBoard will be stored here.
  // This is necessary so that they can be readded to the query params
  // when the application serializes itself in the deeplink_provider.
  unknownQueryParams: Record<string, string>;
}
