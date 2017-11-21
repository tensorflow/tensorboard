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
var tf_backend;
(function (tf_backend) {
    tf_backend.TYPES = [];
    /** Given a RunToTag, return sorted array of all runs */
    function getRunsNamed(r) {
        return _.keys(r).sort(vz_sorting.compareTagNames);
    }
    tf_backend.getRunsNamed = getRunsNamed;
    /** Given a RunToTag, return array of all tags (sorted + dedup'd) */
    function getTags(r) {
        return _.union.apply(null, _.values(r)).sort(vz_sorting.compareTagNames);
    }
    tf_backend.getTags = getTags;
    /**
     * Given a RunToTag and an array of runs, return every tag that appears for
     * at least one run.
     * Sorted, deduplicated.
     */
    function filterTags(r, runs) {
        var result = [];
        runs.forEach(function (x) { return result = result.concat(r[x]); });
        return _.uniq(result).sort(vz_sorting.compareTagNames);
    }
    tf_backend.filterTags = filterTags;
    function timeToDate(x) {
        return new Date(x * 1000);
    }
    ;
    /**  Just a curryable map to make things cute and tidy. */
    function map(f) {
        return function (arr) {
            return arr.map(f);
        };
    }
    ;
    /**
     * This is a higher order function that takes a function that transforms a
     * T into a G, and returns a function that takes TupleData<T>s and converts
     * them into the intersection of a G and a Datum.
     */
    function detupler(xform) {
        return function (x) {
            // Create a G, assert it has type <G & Datum>
            var obj = xform(x[2]);
            // ... patch in the properties of datum
            obj.wall_time = timeToDate(x[0]);
            obj.step = x[1];
            return obj;
        };
    }
    ;
})(tf_backend || (tf_backend = {})); // namespace tf_backend
