/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_storage {

// TODO(stephanwlee): Combine this with tf_backend.ListenKey and put it in a
// sensible place.
// A unique reference to a listener for an easier dereferencing.
export class ListenKey {
  public readonly listener: Function;
  constructor(listener: Function) {
    this.listener = listener;
  }
}

const hashListeners = new Set<ListenKey>();
const storageListeners = new Set<ListenKey>();

window.addEventListener('hashchange', () => {
  hashListeners.forEach(listenKey => listenKey.listener());
});

// [1]: The event only triggers when another tab edits the storage. Changing a
// value in current browser tab will NOT trigger below event.
window.addEventListener('storage', () => {
  storageListeners.forEach(listenKey => listenKey.listener());
});

export function addHashListener(fn: Function): ListenKey {
  const key = new ListenKey(fn);
  hashListeners.add(key);
  return key;
}

export function addStorageListener(fn: Function): ListenKey {
  const key = new ListenKey(fn);
  storageListeners.add(key);
  return key;
}

export function fireStorageChanged() {
  storageListeners.forEach(listenKey => listenKey.listener());
}

export function removeHashListenerByKey(key: ListenKey) {
  hashListeners.delete(key);
}

export function removeStorageListenerByKey(key: ListenKey) {
  storageListeners.delete(key);
}

}  // namespace tf_storage
