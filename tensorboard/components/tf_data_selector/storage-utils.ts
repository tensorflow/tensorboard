/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
namespace tf_data_selector {

export function decodeIdArray(str: string): Array<number> {
  return str.split(',').map(idStr => parseInt(idStr, 36)).filter(Boolean);
}

export function encodeIdArray(arr: Array<number>): string {
  return arr.map(encodeId).join(',');
}

export function encodeId(id: number): string {
  return id.toString(36);
}

export const NO_EXPERIMENT_ID = null;

export const STORAGE_ALL_VALUE = '$all';
export const STORAGE_NONE_VALUE = '$none';

export const {
  getInitializer: getIdInitializer,
  getObserver: getIdObserver,
  set: setId,
} = tf_storage.makeBindings(
    (str: string): number[] => tf_data_selector.decodeIdArray(str),
    (ids: number[]): string => tf_data_selector.encodeIdArray(ids));

}  // namespace tf_data_selector
