/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_paginated_view {

const LIMIT_LOCAL_STORAGE_KEY = 'TF.TensorBoard.PaginatedView.limit';
const DEFAULT_LIMIT = 12;  // reasonably small and has lots of factors

let _limit: number = null;  // cached localStorage value

export type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Register a listener (nullary function) to be called when the page
 * limit changes.
 */
export function addLimitListener(listener: Listener): void {
  listeners.add(listener);
}

/**
 * Remove a listener registered with `addLimitListener`.
 */
export function removeLimitListener(listener: Listener): void {
  listeners.delete(listener);
}

export function getLimit() {
  if (_limit == null) {
    _limit = tf_storage.getNumber(LIMIT_LOCAL_STORAGE_KEY,
        {useLocalStorage: true});
    if (_limit == null || !isFinite(_limit) || _limit <= 0) {
      _limit = DEFAULT_LIMIT;
    }
  }
  return _limit;
}

export function setLimit(limit: number) {
  if (limit !== Math.floor(limit)) {
    throw new Error(`limit must be an integer, but got: ${limit}`);
  }
  if (limit <= 0) {
    throw new Error(`limit must be positive, but got: ${limit}`);
  }
  if (limit === _limit) {
    return;
  }
  _limit = limit;
  tf_storage.setNumber(LIMIT_LOCAL_STORAGE_KEY, _limit,
      {useLocalStorage: true});
  listeners.forEach(listener => {
    listener();
  });
}

}  // namespace tf_paginated_view
