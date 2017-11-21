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
/**
 * @fileoverview Interfaces that parallel proto definitions in
 * third_party/tensorflow/core/framework/...
 *     graph.proto
 *     step_stats.proto
 * These should stay in sync.
 *
 * When adding a repeated field to this file, make sure to update the
 * GRAPH_REPEATED_FIELDS and METADATA_REPEATED_FIELDS lists within parser.ts.
 * Otherwise, the parser has no way of differentiating between a field with a
 * certain value and a repeated field that has only 1 occurence, resulting in
 * subtle bugs.
 */
var tf;
(function (tf) {
    var graph;
    (function (graph) {
        var proto;
        (function (proto) {
            ;
            ;
            ;
            ;
            ;
            ;
        })(proto = graph.proto || (graph.proto = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {}));
