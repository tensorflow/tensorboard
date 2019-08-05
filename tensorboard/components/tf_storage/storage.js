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
var tf_storage;
(function (tf_storage) {
    var _a, _b, _c, _d;
    /**
     * A keyword that users cannot use, since TensorBoard uses this to store info
     * about the active tab.
     */
    tf_storage.TAB = '__tab__';
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
    tf_storage.DISAMBIGUATOR = 'disambiguator';
    _a = makeBindings((x) => x, (x) => x), tf_storage.getString = _a.get, tf_storage.setString = _a.set, tf_storage.getStringInitializer = _a.getInitializer, tf_storage.getStringObserver = _a.getObserver, tf_storage.disposeStringBinding = _a.disposeBinding;
    _b = makeBindings((s) => (s === 'true' ? true : s === 'false' ? false : undefined), (b) => b.toString()), tf_storage.getBoolean = _b.get, tf_storage.setBoolean = _b.set, tf_storage.getBooleanInitializer = _b.getInitializer, tf_storage.getBooleanObserver = _b.getObserver, tf_storage.disposeBooleanBinding = _b.disposeBinding;
    _c = makeBindings((s) => +s, (n) => n.toString()), tf_storage.getNumber = _c.get, tf_storage.setNumber = _c.set, tf_storage.getNumberInitializer = _c.getInitializer, tf_storage.getNumberObserver = _c.getObserver, tf_storage.disposeNumberBinding = _c.disposeBinding;
    _d = makeBindings((s) => JSON.parse(atob(s)), (o) => btoa(JSON.stringify(o))), tf_storage.getObject = _d.get, tf_storage.setObject = _d.set, tf_storage.getObjectInitializer = _d.getInitializer, tf_storage.getObjectObserver = _d.getObserver, tf_storage.disposeObjectBinding = _d.disposeBinding;
    function makeBindings(fromString, toString) {
        const hashListeners = [];
        const storageListeners = [];
        function get(key, options = {}) {
            const { defaultValue, useLocalStorage = false } = options;
            const value = useLocalStorage
                ? window.localStorage.getItem(key)
                : componentToDict(readComponent())[key];
            return value == undefined ? _.cloneDeep(defaultValue) : fromString(value);
        }
        function set(key, value, options = {}) {
            const { defaultValue, useLocalStorage = false, useLocationReplace = false, } = options;
            const stringValue = toString(value);
            if (useLocalStorage) {
                window.localStorage.setItem(key, stringValue);
                // Because of listeners.ts:[1], we need to manually notify all UI elements
                // listening to storage within the tab of a change.
                tf_storage.fireStorageChanged();
            }
            else if (!_.isEqual(value, get(key, { useLocalStorage }))) {
                if (_.isEqual(value, defaultValue)) {
                    unsetFromURI(key);
                }
                else {
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
        function getInitializer(key, options) {
            const fullOptions = Object.assign({ defaultValue: options.defaultValue, polymerProperty: key, useLocalStorage: false }, options);
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
                    ? tf_storage.addStorageListener
                    : tf_storage.addHashListener;
                // TODO(stephanwlee): When using fakeHash, it _should not_ listen to the
                //                    window.hashchange.
                const listenKey = addListener(() => setComponentValue());
                if (fullOptions.useLocalStorage) {
                    storageListeners.push(listenKey);
                }
                else {
                    hashListeners.push(listenKey);
                }
                // Set the value on the property.
                setComponentValue();
                return this[fullOptions.polymerProperty];
            };
        }
        function disposeBinding() {
            hashListeners.forEach((key) => tf_storage.removeHashListenerByKey(key));
            storageListeners.forEach((key) => tf_storage.removeStorageListenerByKey(key));
        }
        function getObserver(key, options) {
            const fullOptions = Object.assign({ defaultValue: options.defaultValue, polymerProperty: key, useLocalStorage: false }, options);
            return function () {
                const uriStorageName = getURIStorageName(this, key);
                const newVal = this[fullOptions.polymerProperty];
                set(uriStorageName, newVal, fullOptions);
            };
        }
        return { get, set, getInitializer, getObserver, disposeBinding };
    }
    tf_storage.makeBindings = makeBindings;
    /**
     * Get a unique storage name for a (Polymer component, propertyName) tuple.
     *
     * DISAMBIGUATOR must be set on the component, if other components use the
     * same propertyName.
     */
    function getURIStorageName(component, propertyName) {
        const d = component[tf_storage.DISAMBIGUATOR];
        const components = d == null ? [propertyName] : [d, propertyName];
        return components.join('.');
    }
    /**
     * Read component from URI (e.g. returns "events&runPrefix=train*").
     */
    function readComponent() {
        return tf_globals.useHash()
            ? window.location.hash.slice(1)
            : tf_globals.getFakeHash();
    }
    /**
     * Write component to URI.
     */
    function writeComponent(component, useLocationReplace = false) {
        if (tf_globals.useHash()) {
            if (useLocationReplace) {
                window.location.replace('#' + component);
            }
            else {
                window.location.hash = component;
            }
        }
        else {
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
    function dictToComponent(items) {
        let component = '';
        // Add the tab name e.g. 'events', 'images', 'histograms' as a prefix
        // for backwards compatbility.
        if (items[tf_storage.TAB] !== undefined) {
            component += items[tf_storage.TAB];
        }
        // Join other strings with &key=value notation
        const nonTab = Object.keys(items)
            .map((key) => [key, items[key]])
            .filter((pair) => pair[0] !== tf_storage.TAB)
            .map((pair) => {
            return encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]);
        })
            .join('&');
        return nonTab.length > 0 ? component + '&' + nonTab : component;
    }
    /**
     * Convert a URI Component into a dictionary of strings.
     * Component should consist of key-value pairs joined by a delimiter
     * with the exception of the tabName.
     * Returns dict consisting of all key-value pairs and
     * dict[TAB] = tabName
     */
    function componentToDict(component) {
        const items = {};
        const tokens = component.split('&');
        tokens.forEach((token) => {
            const kv = token.split('=');
            // Special backwards compatibility for URI components like #scalars.
            if (kv.length === 1) {
                items[tf_storage.TAB] = kv[0];
            }
            else if (kv.length === 2) {
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
})(tf_storage || (tf_storage = {})); // namespace tf_storage
