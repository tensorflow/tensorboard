/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
import * as _ from 'lodash';
import {
  addHashListener,
  addStorageListener,
  fireStorageChanged,
  removeHashListenerByKey,
  removeStorageListenerByKey,
} from './listeners';
import {
  componentToDict,
  dictToComponent,
  readComponent,
  TAB_KEY,
  unsetFromURI,
  updateUrlDict,
  writeComponent,
} from './storage_utils';

export {getUrlDict as getUrlHashDict} from './storage_utils';

/**
 * The name of the property for users to set on a Polymer component
 * in order for its stored properties to be stored in the URI unambiguously.
 * (No need to set this if you want multiple instances of the component to
 * share URI state)
 *
 * Example:
 * <my-component disambiguator="0"></my-component>
 *
 * The disambiguator should be set to any unique value so that multiple
 * instances of the component can store properties in URI storage.
 *
 * Because it's hard to dereference this variable in HTML property bindings,
 * it is NOT safe to change the disambiguator string without find+replace
 * across the codebase.
 */
export const DISAMBIGUATOR = 'disambiguator';

export const {
  get: getString,
  set: setString,
  getInitializer: getStringInitializer,
  getObserver: getStringObserver,
  disposeBinding: disposeStringBinding,
} = makeBindings(
  (x) => x,
  (x) => x
);
export const {
  get: getBoolean,
  set: setBoolean,
  getInitializer: getBooleanInitializer,
  getObserver: getBooleanObserver,
  disposeBinding: disposeBooleanBinding,
} = makeBindings(
  (s) => (s === 'true' ? true : s === 'false' ? false : undefined),
  (b) => b.toString()
);
export const {
  get: getNumber,
  set: setNumber,
  getInitializer: getNumberInitializer,
  getObserver: getNumberObserver,
  disposeBinding: disposeNumberBinding,
} = makeBindings(
  (s) => +s,
  (n) => n.toString()
);
export const {
  get: getObject,
  set: setObject,
  getInitializer: getObjectInitializer,
  getObserver: getObjectObserver,
  disposeBinding: disposeObjectBinding,
} = makeBindings(
  (s) => JSON.parse(atob(s)) as Record<string, string>,
  (o) => btoa(JSON.stringify(o))
);
export interface StorageOptions<T> {
  defaultValue?: T;
  useLocalStorage?: boolean;
}
export interface AutoStorageOptions<T> extends StorageOptions<T> {
  polymerProperty?: string;
}
export interface SetterOptions<T> extends StorageOptions<T> {
  defaultValue?: T;
  useLocalStorage?: boolean;
  useLocationReplace?: boolean;
}
export function makeBindings<T>(
  fromString: (string) => T,
  toString: (T) => string
): {
  get: (key: string, option?: StorageOptions<T>) => T;
  set: (key: string, value: T, option?: SetterOptions<T>) => void;
  getInitializer: (key: string, options: AutoStorageOptions<T>) => Function;
  getObserver: (key: string, options: AutoStorageOptions<T>) => Function;
  disposeBinding: () => void;
} {
  const hashListeners = [];
  const storageListeners = [];
  function get(key: string, options: StorageOptions<T> = {}): T {
    const {defaultValue, useLocalStorage = false} = options;
    const value = useLocalStorage
      ? window.localStorage.getItem(key)
      : componentToDict(readComponent())[key];
    return value == undefined ? _.cloneDeep(defaultValue) : fromString(value);
  }
  function set(key: string, value: T, options: SetterOptions<T> = {}): void {
    const {
      defaultValue,
      useLocalStorage = false,
      useLocationReplace = false,
    } = options;
    const stringValue = toString(value);
    if (useLocalStorage) {
      window.localStorage.setItem(key, stringValue);
      // Because of listeners.ts:[1], we need to manually notify all UI elements
      // listening to storage within the tab of a change.
      fireStorageChanged();
    } else if (!_.isEqual(value, get(key, {useLocalStorage}))) {
      if (_.isEqual(value, defaultValue)) {
        unsetFromURI(key, useLocationReplace);
      } else {
        const items = componentToDict(readComponent());
        items[key] = stringValue;
        writeComponent(dictToComponent(items), useLocationReplace);
      }
    }
  }
  /**
   * Returns a function that can be used on a `value` declaration to a Polymer
   * property. It updates the `polymerProperty` when storage changes -- i.e.,
   * when `useLocalStorage`, it listens to storage change from another tab and
   * when `useLocalStorage=false`, it listens to hashchange.
   */
  function getInitializer(key: string, options: StorageOptions<T>): Function {
    const fullOptions = {
      defaultValue: options.defaultValue,
      polymerProperty: key,
      useLocalStorage: false,
      ...options,
    };
    return function () {
      const uriStorageName = getURIStorageName(this, key);
      // setComponentValue will be called every time the underlying storage
      // changes and is responsible for ensuring that new state will propagate
      // to the component with specified property. It is important that this
      // function does not re-assign needlessly, to avoid Polymer observer
      // churn.
      const setComponentValue = () => {
        const storedValue = get(uriStorageName, fullOptions);
        const currentValue = this[fullOptions.polymerProperty];
        if (!_.isEqual(storedValue, currentValue)) {
          this[fullOptions.polymerProperty] = storedValue;
        }
      };
      const addListener = fullOptions.useLocalStorage
        ? addStorageListener
        : addHashListener;
      // TODO(stephanwlee): When using fakeHash, it _should not_ listen to the
      //                    window.hashchange.
      const listenKey = addListener(() => setComponentValue());
      if (fullOptions.useLocalStorage) {
        storageListeners.push(listenKey);
      } else {
        hashListeners.push(listenKey);
      }
      // Set the value on the property.
      setComponentValue();
      return this[fullOptions.polymerProperty];
    };
  }
  function disposeBinding() {
    hashListeners.forEach((key) => removeHashListenerByKey(key));
    storageListeners.forEach((key) => removeStorageListenerByKey(key));
  }
  function getObserver(key: string, options: StorageOptions<T>): Function {
    const fullOptions = {
      defaultValue: options.defaultValue,
      polymerProperty: key,
      useLocalStorage: false,
      ...options,
    };
    return function () {
      const uriStorageName = getURIStorageName(this, key);
      const newVal = this[fullOptions.polymerProperty];
      set(uriStorageName, newVal, fullOptions);
    };
  }
  return {get, set, getInitializer, getObserver, disposeBinding};
}
export function migrateLegacyURLScheme() {
  /**
   * TODO(psybuzz): move to some compatibility file.
   * For each WIT URL param in the legacy scheme, create another URL param
   * in the new scheme. Once WIT migrates to using the new plugin API
   * `getURLPluginData()`, we can update this method to delete the legacy
   * scheme params.
   *
   * This list of params was taken on 1/16/2020. Luckily, WIT only stored
   * strings, booleans.
   */
  const witUrlCompatibilitySet = new Set<string>([
    'examplesPath',
    'hideModelPane2',
    'modelName1',
    'modelName2',
    'inferenceAddress1',
    'inferenceAddress2',
    'modelType',
    'modelVersion1',
    'modelVersion2',
    'modelSignature1',
    'modelSignature2',
    'maxExamples',
    'labelVocabPath',
    'multiClass',
    'sequenceExamples',
    'maxClassesToDisplay',
    'samplingOdds',
    'usePredictApi',
    'predictInputTensor',
    'predictOutputTensor',
  ]);
  const items = componentToDict(readComponent());
  if (items[TAB_KEY] === 'whatif') {
    for (let oldName of witUrlCompatibilitySet) {
      if (oldName in items) {
        const oldValue = items[oldName];
        items[`p.whatif.${oldName}`] = oldValue;
      }
    }
  }
  writeComponent(dictToComponent(items));
  updateUrlDict(items);
}
/**
 * Get a unique storage name for a (Polymer component, propertyName) tuple.
 *
 * DISAMBIGUATOR must be set on the component, if other components use the
 * same propertyName.
 */
function getURIStorageName(component: {}, propertyName: string): string {
  const d = component[DISAMBIGUATOR];
  const components = d == null ? [propertyName] : [d, propertyName];
  return components.join('.');
}
