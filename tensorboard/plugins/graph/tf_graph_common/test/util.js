/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
/* tslint:disable:no-namespace */
var tf;
(function (tf) {
    var graph;
    (function (graph) {
        var test;
        (function (test) {
            var util;
            (function (util) {
                /**
                 * Converts a utf-8 string to an ArrayBuffer.
                 */
                function stringToArrayBuffer(str) {
                    var buf = new ArrayBuffer(str.length);
                    var bufView = new Uint8Array(buf);
                    for (var i = 0, strLen = str.length; i < strLen; i++) {
                        bufView[i] = str.charCodeAt(i);
                    }
                    return buf;
                }
                util.stringToArrayBuffer = stringToArrayBuffer;
            })(util = test.util || (test.util = {}));
        })(test = graph.test || (graph.test = {}));
    })(graph = tf.graph || (tf.graph = {}));
})(tf || (tf = {})); // module
