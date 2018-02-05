var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
    /**
     * A key that users cannot use, since TensorBoard uses this to store info
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
    _a = makeBindings(function (x) { return x; }, function (x) { return x; }), tf_storage.getString = _a.get, tf_storage.setString = _a.set, tf_storage.getStringInitializer = _a.getInitializer, tf_storage.getStringObserver = _a.getObserver;
    _b = makeBindings(function (s) { return (s === 'true' ? true : s === 'false' ? false : undefined); }, function (b) { return b.toString(); }), tf_storage.getBoolean = _b.get, tf_storage.setBoolean = _b.set, tf_storage.getBooleanInitializer = _b.getInitializer, tf_storage.getBooleanObserver = _b.getObserver;
    _c = makeBindings(function (s) { return +s; }, function (n) { return n.toString(); }), tf_storage.getNumber = _c.get, tf_storage.setNumber = _c.set, tf_storage.getNumberInitializer = _c.getInitializer, tf_storage.getNumberObserver = _c.getObserver;
    _d = makeBindings(function (s) { return JSON.parse(atob(s)); }, function (o) { return btoa(JSON.stringify(o)); }), tf_storage.getObject = _d.get, tf_storage.setObject = _d.set, tf_storage.getObjectInitializer = _d.getInitializer, tf_storage.getObjectObserver = _d.getObserver;
    function makeBindings(fromString, toString) {
        function get(key, useLocalStorage) {
            if (useLocalStorage === void 0) { useLocalStorage = false; }
            var value = useLocalStorage ?
                window.localStorage.getItem(key) :
                componentToDict(readComponent())[key];
            return value == undefined ? undefined : fromString(value);
        }
        function set(key, value, useLocalStorage) {
            if (useLocalStorage === void 0) { useLocalStorage = false; }
            var stringValue = toString(value);
            if (useLocalStorage) {
                window.localStorage.setItem(key, stringValue);
            }
            else {
                var items = componentToDict(readComponent());
                items[key] = stringValue;
                writeComponent(dictToComponent(items));
            }
        }
        function getInitializer(key, options) {
            var fullOptions = __assign({ defaultValue: options.defaultValue, polymerProperty: key, useLocalStorage: false }, options);
            return function () {
                var _this = this;
                var uriStorageName = getURIStorageName(this, key);
                // setComponentValue will be called every time the hash changes,
                // and is responsible for ensuring that new state in the hash will
                // be propagated to the component with that property. It is
                // important that this function does not re-assign needlessly,
                // to avoid Polymer observer churn.
                var setComponentValue = function () {
                    var uriValue = get(uriStorageName, false);
                    var currentValue = _this[fullOptions.polymerProperty];
                    // if uriValue is undefined, we will ensure that the property has the
                    // default value
                    if (uriValue === undefined) {
                        var valueToSet = void 0;
                        // if we are using localStorage, we will set the value to the value
                        // from localStorage. Then, the corresponding observer will proxy
                        // the localStorage value into URI storage.
                        // in this way, localStorage takes precedence over the default val
                        // but not over the URI value.
                        if (fullOptions.useLocalStorage) {
                            var useLocalStorageValue = get(uriStorageName, true);
                            valueToSet = useLocalStorageValue === undefined ?
                                fullOptions.defaultValue :
                                useLocalStorageValue;
                        }
                        else {
                            valueToSet = fullOptions.defaultValue;
                        }
                        if (!_.isEqual(currentValue, valueToSet)) {
                            // If we don't have an explicit URI value, then we need to ensure
                            // the property value is equal to the default value.
                            // We will assign a clone rather than the canonical default, because
                            // the component receiving this property may mutate it, and we need
                            // to keep a pristine copy of the default.
                            _this[fullOptions.polymerProperty] = _.cloneDeep(valueToSet);
                        }
                        // In this case, we have an explicit URI value, so we will ensure that
                        // the component has an equivalent value.
                    }
                    else {
                        if (!_.isEqual(uriValue, currentValue)) {
                            _this[fullOptions.polymerProperty] = uriValue;
                        }
                    }
                };
                // Set the value on the property.
                setComponentValue();
                // Update it when the hashchanges.
                window.addEventListener('hashchange', setComponentValue);
            };
        }
        function getObserver(key, options) {
            var fullOptions = __assign({ defaultValue: options.defaultValue, polymerProperty: key, useLocalStorage: false }, options);
            return function () {
                var uriStorageName = getURIStorageName(this, key);
                var newVal = this[fullOptions.polymerProperty];
                // if this is a localStorage property, we always synchronize the value
                // in localStorage to match the one currently in the URI.
                if (fullOptions.useLocalStorage) {
                    set(uriStorageName, newVal, true);
                }
                if (!_.isEqual(newVal, get(uriStorageName, false))) {
                    if (_.isEqual(newVal, fullOptions.defaultValue)) {
                        unsetFromURI(uriStorageName);
                    }
                    else {
                        set(uriStorageName, newVal, false);
                    }
                }
            };
        }
        return { get: get, set: set, getInitializer: getInitializer, getObserver: getObserver };
    }
    /**
     * Get a unique storage name for a (Polymer component, propertyName) tuple.
     *
     * DISAMBIGUATOR must be set on the component, if other components use the
     * same propertyName.
     */
    function getURIStorageName(component, propertyName) {
        var d = component[tf_storage.DISAMBIGUATOR];
        var components = d == null ? [propertyName] : [d, propertyName];
        return components.join('.');
    }
    /**
     * Read component from URI (e.g. returns "events&runPrefix=train*").
     */
    function readComponent() {
        return tf_globals.useHash() ? window.location.hash.slice(1) : tf_globals.getFakeHash();
    }
    /**
     * Write component to URI.
     */
    function writeComponent(component) {
        if (tf_globals.useHash()) {
            window.location.hash = component;
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
        var component = '';
        // Add the tab name e.g. 'events', 'images', 'histograms' as a prefix
        // for backwards compatbility.
        if (items[tf_storage.TAB] !== undefined) {
            component += items[tf_storage.TAB];
        }
        // Join other strings with &key=value notation
        var nonTab = _.pairs(items)
            .filter(function (pair) { return pair[0] !== tf_storage.TAB; })
            .map(function (pair) {
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
    function componentToDict(component) {
        var items = {};
        var tokens = component.split('&');
        tokens.forEach(function (token) {
            var kv = token.split('=');
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
        var items = componentToDict(readComponent());
        delete items[key];
        writeComponent(dictToComponent(items));
    }
    var _a, _b, _c, _d;
})(tf_storage || (tf_storage = {})); // namespace tf_storage
