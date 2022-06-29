/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {ExperimentAlias} from '../experiments/types';
import {
  getExperimentIdsFromRouteParams,
  parseCompareExperimentStr,
} from './internal_utils';
import {CompareRouteParams, Route} from './types';

// Ideally, we would not be exposing this utility method this, but there is no
// way to share the structured information to other stores without changing
// contract at the RouteConfig level.
/**
 * Returns experimentId to alias text and number information encoded in
 * CompareRouteParams. Alias numbers are generated using 1-based indexing of the
 * encoded aliases.
 *
 * This utility is used by only limited packages. Please refer to visiblity in
 * BUILD.
 */
export function getCompareExperimentIdAliasWithNumberSpec(
  routeParams: CompareRouteParams
): Map<string, ExperimentAlias> {
  const idToDisplayName = new Map<string, ExperimentAlias>();
  const nameAndIds = parseCompareExperimentStr(routeParams.experimentIds);
  let aliasNumber = 0;
  for (const {id, name} of nameAndIds) {
    aliasNumber++;
    if (idToDisplayName.has(id)) {
      continue;
    }
    idToDisplayName.set(id, {aliasText: name, aliasNumber: aliasNumber});
  }
  return idToDisplayName;
}

/**
 * @deprecated
 */
export function getCompareExperimentIdAliasSpec(
  routeParams: CompareRouteParams
): Map<string, string> {
  const idToDisplayName = new Map<string, string>();
  const nameAndIds = parseCompareExperimentStr(routeParams.experimentIds);
  for (const {id, name} of nameAndIds) {
    if (name) {
      idToDisplayName.set(id, name);
    }
  }
  return idToDisplayName;
}

/**
 * Returns experimentIds from navigation.
 *
 * This utility is used by only limited packages. Please refer to visiblity in
 * BUILD.
 */
export function getExperimentIdsFromNavigation(
  navigation: Route
): string[] | null {
  return getExperimentIdsFromRouteParams(
    navigation.routeKind,
    navigation.params
  );
}
