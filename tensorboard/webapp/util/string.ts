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
/**
 * This regex escape character set is also used in lodash's `escapeRegExp`.
 */
const REGEXP_ESCAPE_CHARS = /[\\^$.*+?()[\]{}|]/g;

/**
 * Converts a string into a form that has been escaped for use as a literal
 * argument to a regular expression constructor.
 *
 * Takes a string V and escapes characters to produce a new string E, such that
 * new RegExp(E).test(V) === true.
 */
export function escapeForRegex(value: string): string {
  // '$&' in a regex replacement indicates the last match.
  return value.replace(REGEXP_ESCAPE_CHARS, '\\$&');
}
