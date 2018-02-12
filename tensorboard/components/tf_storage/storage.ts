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
namespace tf_storage {

/**
 * The Storage Module provides storage for URL parameters, and an API for
 * getting and setting TensorBoard's stateful URI.
 *
 * It generates URI components like: events&runPrefix=train*
 * which TensorBoard uses after like localhost:8000/#events&runPrefix=train*
 * to store state in the URI.
 *
 * It also allows saving the values to localStorage for long-term persistence.
 */
type StringDict = {[key: string]: string};

/**
 * A key that users cannot use, since TensorBoard uses this to store info
 * about the active tab.
 */
export const TAB = '__tab__';

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
} = makeBindings(x => x, x => x);

export const {
  get: getBoolean,
  set: setBoolean,
  getInitializer: getBooleanInitializer,
  getObserver: getBooleanObserver,
} = makeBindings(
  s => (s === 'true' ? true: s === 'false' ? false : undefined),
  b => b.toString());

export const {
  get: getNumber,
  set: setNumber,
  getInitializer: getNumberInitializer,
  getObserver: getNumberObserver,
} = makeBindings(
  s => +s,
  n => n.toString());

export const {
  get: getObject,
  set: setObject,
  getInitializer: getObjectInitializer,
  getObserver: getObjectObserver,
} = makeBindings(
  s => JSON.parse(atob(s)),
  o => btoa(JSON.stringify(o)));

export interface StorageOptions<T> {
  defaultValue: T;
  polymerProperty?: string;
  useLocalStorage?: boolean;
}

function makeBindings<T>(fromString: (string) => T, toString: (T) => string): {
    get: (key: string, useLocalStorage?: boolean) => T,
    set: (key: string, value: T, useLocalStorage?: boolean) => void,
    getInitializer: (key: string, options: StorageOptions<T>) => Function,
    getObserver: (key: string, options: StorageOptions<T>) => Function,
} {
  function get(key: string, useLocalStorage = false): T {
    const value = useLocalStorage ?
      window.localStorage.getItem(key) :
      componentToDict(readComponent())[key];
    return value == undefined ? undefined : fromString(value);
  }

  function set(key: string, value: T, useLocalStorage = false, useLocationReplace = false): void {
    const stringValue = toString(value);
    if (useLocalStorage) {
      window.localStorage.setItem(key, stringValue);
    } else {
      const items = componentToDict(readComponent());
      items[key] = stringValue;
      writeComponent(dictToComponent(items), useLocationReplace);
    }
  }

  function getInitializer(key: string, options: StorageOptions<T>): Function {
    const fullOptions = {
      defaultValue: options.defaultValue,
      polymerProperty: key,
      useLocalStorage: false,
      ...options,
    };
    return function() {
      const uriStorageName = getURIStorageName(this, key);
      // setComponentValue will be called every time the hash changes,
      // and is responsible for ensuring that new state in the hash will
      // be propagated to the component with that property. It is
      // important that this function does not re-assign needlessly,
      // to avoid Polymer observer churn.
      const setComponentValue = () => {
        const uriValue = get(uriStorageName, false);
        const currentValue = this[fullOptions.polymerProperty];
        // if uriValue is undefined, we will ensure that the property has the
        // default value
        if (uriValue === undefined) {
          let valueToSet: T;
          // if we are using localStorage, we will set the value to the value
          // from localStorage. Then, the corresponding observer will proxy
          // the localStorage value into URI storage.
          // in this way, localStorage takes precedence over the default val
          // but not over the URI value.
          if (fullOptions.useLocalStorage) {
            const useLocalStorageValue = get(uriStorageName, true);
            valueToSet = useLocalStorageValue === undefined ?
              fullOptions.defaultValue :
              useLocalStorageValue;
          } else {
            valueToSet = fullOptions.defaultValue;
          }
          if (!_.isEqual(currentValue, valueToSet)) {
            // If we don't have an explicit URI value, then we need to ensure
            // the property value is equal to the default value.
            // We will assign a clone rather than the canonical default, because
            // the component receiving this property may mutate it, and we need
            // to keep a pristine copy of the default.
            this[fullOptions.polymerProperty] = _.cloneDeep(valueToSet);
          }
          // In this case, we have an explicit URI value, so we will ensure that
          // the component has an equivalent value.
        } else {
          if (!_.isEqual(uriValue, currentValue)) {
            this[fullOptions.polymerProperty] = uriValue;
          }
        }
      };
      // Set the value on the property.
      setComponentValue();
      // Update it when the hashchanges.
      window.addEventListener('hashchange', setComponentValue);
    };
  }

  function getObserver(key: string, options: StorageOptions<T>): Function {
    const fullOptions = {
      defaultValue: options.defaultValue,
      polymerProperty: key,
      useLocalStorage: false,
      ...options,
    };
    return function() {
      const uriStorageName = getURIStorageName(this, key);
      const newVal = this[fullOptions.polymerProperty];
      // if this is a localStorage property, we always synchronize the value
      // in localStorage to match the one currently in the URI.
      if (fullOptions.useLocalStorage) {
        set(uriStorageName, newVal, true);
      }
      if (!_.isEqual(newVal, get(uriStorageName, false))) {
        if (_.isEqual(newVal, fullOptions.defaultValue)) {
          unsetFromURI(uriStorageName);
        } else {
          set(uriStorageName, newVal, false);
        }
      }
    };
  }

  return {get, set, getInitializer, getObserver};
}

/**
 * Get a unique storage name for a (Polymer component, propertyName) tuple.
 *
 * DISAMBIGUATOR must be set on the component, if other components use the
 * same propertyName.
 */
function getURIStorageName(
    component: {}, propertyName: string): string {
  const d = component[DISAMBIGUATOR];
  const components = d == null ? [propertyName] : [d, propertyName];
  return components.join('.');
}


/**
 * Read component from URI (e.g. returns "events&runPrefix=train*").
 */
function readComponent(): string {
  return tf_globals.useHash() ? window.location.hash.slice(1) : tf_globals.getFakeHash();
}

/**
 * Write component to URI.
 */
function writeComponent(component: string, useLocationReplace = false) {
  if (tf_globals.useHash()) {
      if (useLocationReplace) {
          window.location.replace(window.location.origin + window.location.pathname + component);
      } else {
          window.location.hash = component;
      }
  } else {
    tf_globals.setFakeHash(component);
  }
}

/**
 * Convert dictionary of strings into a URI Component.
 * All key value entries get added as key value pairs in the component,
 * with the exception of a key with the TAB value, which if present
 * gets prepended to the URI Component string for backwards compatibility
 * reasons.
 */
function dictToComponent(items: StringDict): string {
  let component = '';

  // Add the tab name e.g. 'events', 'images', 'histograms' as a prefix
  // for backwards compatbility.
  if (items[TAB] !== undefined) {
    component += items[TAB];
  }

  // Join other strings with &key=value notation
  const nonTab = _.pairs(items)
                   .filter((pair) =>  pair[0] !== TAB)
                   .map((pair) => {
                     return encodeURIComponent(pair[0]) + '=' +
                         encodeURIComponent(pair[1]);
                   })
                   .join('&');

  return nonTab.length > 0 ? (component + '&' + nonTab) : component;
}

/**
 * Convert a URI Component into a dictionary of strings.
 * Component should consist of key-value pairs joined by a delimiter
 * with the exception of the tabName.
 * Returns dict consisting of all key-value pairs and
 * dict[TAB] = tabName
 */
function componentToDict(component: string): StringDict {
  const items = {} as StringDict;

  const tokens = component.split('&');
  tokens.forEach((token) => {
    const kv = token.split('=');
    // Special backwards compatibility for URI components like #scalars.
    if (kv.length === 1) {
      items[TAB] = kv[0];
    } else if (kv.length === 2) {
      items[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    }
  });
  return items;
}

/**
 * Delete a key from the URI.
 */
function unsetFromURI(key) {
  const items = componentToDict(readComponent());
  delete items[key];
  writeComponent(dictToComponent(items));
}

}  // namespace tf_storage
