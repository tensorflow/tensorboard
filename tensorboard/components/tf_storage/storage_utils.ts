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
import {getFakeHash, setFakeHash, useHash} from '../tf_globals/globals';
import {addHashListener} from './listeners';

/**
 * A keyword that users cannot use, since TensorBoard uses this to store info
 * about the active tab.
 */
export const TAB_KEY = '__tab__';

export interface StringDict {
  [key: string]: string;
}

// Keep an up-to-date store of URL params, which iframed plugins can request.
let urlDict: StringDict = {};

export function getUrlDict(): StringDict {
  return urlDict;
}

export function updateUrlDict(dict: StringDict) {
  urlDict = dict;
}

addHashListener(() => {
  urlDict = componentToDict(readComponent());
});

/**
 * Read component from URI (e.g. returns "events&runPrefix=train*").
 */
export function readComponent(): string {
  return useHash() ? window.location.hash.slice(1) : getFakeHash();
}

/**
 * Convert a URI Component into a dictionary of strings.
 * Component should consist of key-value pairs joined by a delimiter
 * with the exception of the tabName.
 * Returns dict consisting of all key-value pairs and
 * dict[TAB] = tabName
 */
export function componentToDict(component: string): StringDict {
  const items = {} as StringDict;
  const tokens = component.split('&');
  tokens.forEach((token) => {
    const kv = token.split('=');
    // Special backwards compatibility for URI components like #scalars.
    if (kv.length === 1) {
      items[TAB_KEY] = kv[0];
    } else if (kv.length === 2) {
      items[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    }
  });
  return items;
}

/**
 * Write component to URI.
 */
export function writeComponent(component: string, useLocationReplace = false) {
  if (useHash()) {
    if (useLocationReplace) {
      const url = new URL(window.location.href);
      url.hash = component;
      window.history.replaceState(window.history.state, '', url.toString());
    } else {
      window.location.hash = component;
    }
  } else {
    setFakeHash(component);
  }
}

/**
 * Convert dictionary of strings into a URI Component.
 * All key value entries get added as key value pairs in the component,
 * with the exception of a key with the TAB value, which if present
 * gets prepended to the URI Component string for backwards compatibility
 * reasons.
 */
export function dictToComponent(items: StringDict): string {
  let component = '';
  // Add the tab name e.g. 'events', 'images', 'histograms' as a prefix
  // for backwards compatbility.
  if (items[TAB_KEY] !== undefined) {
    component += items[TAB_KEY];
  }
  // Join other strings with &key=value notation
  const nonTab = Object.keys(items)
    .map((key) => [key, items[key]])
    .filter((pair) => pair[0] !== TAB_KEY)
    .map((pair) => {
      return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]);
    })
    .join('&');
  return nonTab.length > 0 ? component + '&' + nonTab : component;
}

/**
 * Delete a key from the URI.
 */
export function unsetFromURI(key, useLocationReplace = false) {
  const items = componentToDict(readComponent());
  delete items[key];
  writeComponent(dictToComponent(items), useLocationReplace);
}
