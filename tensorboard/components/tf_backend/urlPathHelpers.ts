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
namespace tf_backend {

/**
 * A query parameter value can either be a string or a list of strings.
 * A string `"foo"` is encoded as `key=foo`; a list `["foo", "bar"]` is
 * encoded as `key=foo&key=bar`.
 */
export type QueryValue = string | string[];

export type QueryParams = {[key: string]: QueryValue};

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
 *
 * @deprecated If used with `router.pluginRoute`, please use the queryParams
 * argument.
 */
export function addParams(baseURL: string, params: QueryParams): string {
  const keys = Object.keys(params).sort().filter(k => params[k] !== undefined);
  if (!keys.length) {
    return baseURL;  // no need to change '/foo' to '/foo?'
  }
  const delimiter = baseURL.indexOf('?') !== -1 ? '&' : '?';
  const parts = [].concat(...keys.map(key => {
    const rawValue = params[key];
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    return values.map(value => `${key}=${_encodeURIComponent(value)}`);
  }));
  const query = parts.join('&');
  return baseURL + delimiter + query;
}

function _encodeURIComponent(x: string): string {
  // Replace parentheses for consistency with Python's urllib.urlencode.
  return encodeURIComponent(x).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

}  // namespace tf_backend
