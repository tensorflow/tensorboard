/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
var tf_backend;
(function (tf_backend) {
    /**
     * Add query parameters to a URL. Values will be URL-encoded. The URL
     * may or may not already have query parameters. For convenience,
     * parameters whose value is `undefined` will be dropped.
     *
     * For example, the following expressions are equivalent:
     *
     *     addParams("http://foo", {a: "1", b: ["2", "3+4"], c: "5"})
     *     addParams("http://foo?a=1", {b: ["2", "3+4"], c: "5", d: undefined})
     *     "http://foo?a=1&b=2&b=3%2B4&c=5"
     */
    function addParams(baseURL, params) {
        var keys = Object.keys(params).sort().filter(function (k) { return params[k] !== undefined; });
        if (!keys.length) {
            return baseURL; // no need to change '/foo' to '/foo?'
        }
        var delimiter = baseURL.indexOf('?') !== -1 ? '&' : '?';
        var parts = [].concat.apply([], keys.map(function (key) {
            var rawValue = params[key];
            var values = Array.isArray(rawValue) ? rawValue : [rawValue];
            return values.map(function (value) { return key + "=" + _encodeURIComponent(value); });
        }));
        var query = parts.join('&');
        return baseURL + delimiter + query;
    }
    tf_backend.addParams = addParams;
    function _encodeURIComponent(x) {
        // Replace parentheses for consistency with Python's urllib.urlencode.
        return encodeURIComponent(x).replace(/\(/g, '%28').replace(/\)/g, '%29');
    }
})(tf_backend || (tf_backend = {})); // namespace tf_backend
