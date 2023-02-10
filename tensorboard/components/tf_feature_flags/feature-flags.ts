/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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

import {FeatureFlags} from '../../webapp/feature_flag/types';

// FeatureFlags are managed and injected by the Angular portion of the TB code
// base. In practice they are set one time soon after application load and never
// again for the lifetime of the application.
let _featureFlags: FeatureFlags | null;
let _featureFlagsToSendToServer: Partial<FeatureFlags> | null;
initializeFeatureFlags();

export function initializeFeatureFlags(): void {
  _featureFlags = null;
  _featureFlagsToSendToServer = null;
}

/**
 * Sets FeatureFlags-related properties for use in the Polymer portion of the TB
 * code base.
 *
 * In practice this should only be called by the Angular portion of the TB code
 * base immediately after it determines the final set of FeatureFlags.
 */
export function setFeatureFlags(
  featureFlags: FeatureFlags,
  featureFlagsToSendToServer: Partial<FeatureFlags>
): void {
  _featureFlags = featureFlags;
  _featureFlagsToSendToServer = featureFlagsToSendToServer;
}

/**
 * Retrieves FeatureFlags.
 *
 * @throws Error if FeatureFlags have not yet been set. In practice they should
 *     be set soon after application load before any Polymer code is invoked.
 *     This runtime check acts as a sanity check to enforce that assumption.
 */
export function getFeatureFlags(): FeatureFlags {
  if (_featureFlags === null) {
    throw Error('FeatureFlags have not yet been determined by TensorBoard.');
  }
  return _featureFlags;
}

/**
 * Retrieves the set of FeatureFlags that should be sent to the server.
 *
 * @throws Error if FeatureFlags have not yet been set. In practice they should
 *     be set soon after application load before any Polymer code is invoked.
 *     This runtime check acts as a sanity check to enforce that assumption.
 */
export function getFeatureFlagsToSendToServer(): Partial<FeatureFlags> {
  if (_featureFlagsToSendToServer === null) {
    throw Error('FeatureFlags have not yet been determined by TensorBoard.');
  }
  return _featureFlagsToSendToServer;
}
