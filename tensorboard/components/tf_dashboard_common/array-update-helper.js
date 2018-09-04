/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
var tf_dashboard_common;
(function (tf_dashboard_common) {
    /**
     * @polymerBehavior
     */
    tf_dashboard_common.ArrayUpdateHelper = {
        updateArrayProp: function (prop, value, getKey) {
            var orig = this[prop];
            var newVal = value;
            var lookup = new Set(newVal.map(function (item, i) { return getKey(item, i); }));
            if (!Array.isArray(orig)) {
                throw RangeError("Expected '" + prop + "' to be an array.");
            }
            if (!Array.isArray(value)) {
                throw RangeError("Expected new value to '" + prop + "' to be an array.");
            }
            var origInd = 0;
            var newValInd = 0;
            while (origInd < orig.length && newValInd < newVal.length) {
                if (!lookup.has(getKey(orig[origInd], origInd))) {
                    this.splice(prop, origInd, 1);
                    continue;
                }
                else if (getKey(orig[origInd], origInd) ==
                    getKey(newVal[newValInd], newValInd)) {
                    // update the element.
                    // TODO(stephanwlee): We may be able to update the original reference of
                    // the `value` by deep-copying the new value over.
                    this.set(prop + "." + origInd, newVal[newValInd]);
                }
                else {
                    this.splice(prop, origInd, 0, newVal[newValInd]);
                }
                newValInd++;
                origInd++;
            }
            if (origInd < orig.length) {
                this.splice(prop, origInd);
            }
            if (newValInd < newVal.length) {
                this.push.apply(this, [prop].concat(newVal.slice(newValInd)));
            }
        },
    };
})(tf_dashboard_common || (tf_dashboard_common = {})); // namespace tf_dashboard_common
