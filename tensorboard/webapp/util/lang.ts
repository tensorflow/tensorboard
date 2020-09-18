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
type MapObjectValuesTransformer = (value: any, key: string) => any;

/**
 * Returns a new object where all values have been transformed.
 * For familiarity, the API signature was made to be as close as possible to the
 * signatures of equivalent functions in popular libraries:
 * - https://lodash.com/docs/#mapValues
 * - https://underscorejs.org/#mapObject
 */
export function mapObjectValues<T extends {} = {}>(
  object: Record<keyof T, any>,
  transform: MapObjectValuesTransformer
) {
  const result = {} as Record<keyof T, T[keyof T]>;
  for (const key of Object.keys(object)) {
    const typedKey = key as keyof T;
    result[typedKey] = transform(object[typedKey], key);
  }
  return result as T;
}
