/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

// Type override of lib.es2015.collection.d.ts. Make sure key/value types are
// not inferred as any.
interface MapConstructor {
  new <K, V>(): Map<K, V>;
}

// Type override of TypeScript's 'src/lib/es5.d.ts'.
interface JSON {
  /**
   * In default TypeScript, `JSON.parse` is typed as:
   * ```
   *   parse(
   *     text: string,
   *     reviver?: (this: any, key: string, value: any) => any
   *   ): any
   * ```
   * We upgrade some of the `any`s to stricter `unknown`s, and drop the `this`.
   */
  parse(
    text: string,
    reviver?: (key: string, value: unknown) => unknown
  ): unknown;
}
