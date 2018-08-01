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
    _a = makeBindings(function (x) { return x; }, function (x) { return x; }), tf_storage.getString = _a.get, tf_storage.setString = _a.set, tf_storage.getStringInitializer = _a.getInitializer, tf_storage.getStringObserver = _a.getObserver;
    _b = makeBindings(function (s) { return (s === 'true' ? true : s === 'false' ? false : undefined); }, function (b) { return b.toString(); }), tf_storage.getBoolean = _b.get, tf_storage.setBoolean = _b.set, tf_storage.getBooleanInitializer = _b.getInitializer, tf_storage.getBooleanObserver = _b.getObserver;
    _c = makeBindings(function (s) { return +s; }, function (n) { return n.toString(); }), tf_storage.getNumber = _c.get, tf_storage.setNumber = _c.set, tf_storage.getNumberInitializer = _c.getInitializer, tf_storage.getNumberObserver = _c.getObserver;
    _d = makeBindings(function (s) { return JSON.parse(atob(s)); }, function (o) { return btoa(JSON.stringify(o)); }), tf_storage.getObject = _d.get, tf_storage.setObject = _d.set, tf_storage.getObjectInitializer = _d.getInitializer, tf_storage.getObjectObserver = _d.getObserver;
    function makeBindings(fromString, toString) {
        function get(key, options) {
            if (options === void 0) { options = {}; }
            var defaultValue = options.defaultValue, _a = options.useLocalStorage, useLocalStorage = _a === void 0 ? false : _a;
            var value = useLocalStorage ?
                window.localStorage.getItem(key) :
                componentToDict(readComponent())[key];
            return value == undefined ? _.cloneDeep(defaultValue) : fromString(value);
        }
        function set(key, value, options) {
            if (options === void 0) { options = {}; }
            var defaultValue = options.defaultValue, _a = options.useLocalStorage, useLocalStorage = _a === void 0 ? false : _a, _b = options.useLocationReplace, useLocationReplace = _b === void 0 ? false : _b;
            var stringValue = toString(value);
            if (useLocalStorage) {
                window.localStorage.setItem(key, stringValue);
            }
            else if (!_.isEqual(value, get(key, { useLocalStorage: useLocalStorage }))) {
                if (_.isEqual(value, defaultValue)) {
                    unsetFromURI(key);
                }
                else {
                    var items = componentToDict(readComponent());
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
            var fullOptions = __assign({ defaultValue: options.defaultValue, polymerProperty: key, useLocalStorage: false }, options);
            return function () {
                var _this = this;
                var uriStorageName = getURIStorageName(this, key);
                // setComponentValue will be called every time the underlying storage
                // changes and is responsible for ensuring that new state will propagate
                // to the component with specified property. It is important that this
                // function does not re-assign needlessly, to avoid Polymer observer
                // churn.
                var setComponentValue = function () {
                    var storedValue = get(uriStorageName, fullOptions);
                    var currentValue = _this[fullOptions.polymerProperty];
                    if (!_.isEqual(storedValue, currentValue)) {
                        _this[fullOptions.polymerProperty] = storedValue;
                    }
                };
                var eventName = fullOptions.useLocalStorage ? 'storage' : 'hashchange';
                // TODO(stephanwlee): When using fakeHash, it _should not_ listen to the
                //                    window.hashchange.
                // TODO(stephanwlee): Remove the event listen on component teardown.
                window.addEventListener(eventName, function () {
                    setComponentValue();
                });
                // Set the value on the property.
                setComponentValue();
                return this[fullOptions.polymerProperty];
            };
        }
        function getObserver(key, options) {
            var fullOptions = __assign({ defaultValue: options.defaultValue, polymerProperty: key, useLocalStorage: false }, options);
            return function () {
                var uriStorageName = getURIStorageName(this, key);
                var newVal = this[fullOptions.polymerProperty];
                set(uriStorageName, newVal, fullOptions);
            };
        }
        return { get: get, set: set, getInitializer: getInitializer, getObserver: getObserver };
    }
    tf_storage.makeBindings = makeBindings;
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
    function writeComponent(component, useLocationReplace) {
        if (useLocationReplace === void 0) { useLocationReplace = false; }
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
