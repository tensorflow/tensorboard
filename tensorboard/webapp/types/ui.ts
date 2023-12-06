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
 * @fileoverview Type definition of the UI data that spans action, store, view,
 * and data sources.
 */

export enum SearchTokenKey {
  EXPERIMENT_ID = 'id',
  USER = 'user',
  BEFORE = 'before',
  AFTER = 'after',
  REGEX = 'regex',
}

interface Token {
  key: SearchTokenKey;
  stringValue: string;
}

export interface UserSearchToken extends Token {
  key: SearchTokenKey.USER;
}

export interface DateSearchToken extends Token {
  key: SearchTokenKey.BEFORE | SearchTokenKey.AFTER;
}

export interface RegexSearchToken extends Token {
  key: SearchTokenKey.REGEX;
}

export interface ExperimentIdSearchToken extends Token {
  key: SearchTokenKey.EXPERIMENT_ID;
}

/**
 * key-value token for queries in the search input box. For instance, Gmail has
 * from:foo@gmail.com where "from" would be the key and "foo@gmail.com" would be
 * the value.
 */
export type SearchToken =
  | ExperimentIdSearchToken
  | UserSearchToken
  | DateSearchToken
  | RegexSearchToken;

/**
 * Returns run color for a given runId in hex.
 */
export type RunColorScale = (runId: string) => string;
