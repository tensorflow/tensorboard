/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
var tf_debugger_dashboard;
(function (tf_debugger_dashboard) {
    var maxElements1D = 1000;
    var maxElements2D = 250;
    /**
     * Get a Python-style slicing string representing strided slicing.
     * @param size Total size along the dimension being sliced.
     * @param maxElements Maximum number of elements allowed in the slicing result.
     * @returns A Python-style slicing string beginning with two colons, without
     *   surrounding brackets.
     */
    function getStridedSlicing(size, maxElements) {
        if (size <= maxElements) {
            return '::';
        }
        else {
            return '::' + Math.ceil(size / maxElements);
        }
    }
    /**
     * Get the default slicing given a tensor shape.
     * @param shape: The tensor shape, represented as an Array of number.
     * @return: Numpy-style slicing string, with the surrounding brackets, e.g.,
     *   '[::2, 0:10]'.
     */
    function getDefaultSlicing(shape) {
        if (shape.length === 0) {
            // Scalar: no slicing.
            return '';
        }
        else if (shape.length === 1) {
            return '[' + getStridedSlicing(shape[0], maxElements1D) + ']';
        }
        else if (shape.length === 2) {
            return '[' + getStridedSlicing(shape[0], maxElements2D) + ', ' +
                getStridedSlicing(shape[1], maxElements2D) + ']';
        }
        else if (shape.length === 3) {
            return '[0, ' + getStridedSlicing(shape[1], maxElements2D) + ', ' +
                getStridedSlicing(shape[2], maxElements2D) + ']';
        }
        else if (shape.length === 4) {
            // Assume NHWC as the default.
            return '[0, ' + getStridedSlicing(shape[1], maxElements2D) + ', ' +
                getStridedSlicing(shape[2], maxElements2D) + ', 0]';
        }
        else {
            var slicing = '[';
            for (var i = 0; i < shape.length; ++i) {
                if (i < shape.length - 2) {
                    slicing += '0';
                }
                else {
                    slicing += getStridedSlicing(shape[i], maxElements2D);
                }
                if (i < shape.length - 1) {
                    slicing += ', ';
                }
            }
            slicing += ']';
            return slicing;
        }
    }
    tf_debugger_dashboard.getDefaultSlicing = getDefaultSlicing;
    /**
     * Determine rank of a slicing string.
     * @param slicing The slicing string.
     * @return The rank.
     */
    function rankFromSlicing(slicing) {
        if (slicing.startsWith('[')) {
            slicing = slicing.slice(1, slicing.length - 1);
        }
        if (slicing.length === 0) {
            // Scalar: no slicing.
            return 0;
        }
        else {
            var slicingElements = slicing.split(',');
            var rank = slicingElements.length;
            // Examine how many of the slicing elements are single numbers, which leads
            // to a decrement in rank.
            for (var _i = 0, slicingElements_1 = slicingElements; _i < slicingElements_1.length; _i++) {
                var element = slicingElements_1[_i];
                if (!isNaN(Number(element))) {
                    rank--;
                }
            }
            return rank;
        }
    }
    tf_debugger_dashboard.rankFromSlicing = rankFromSlicing;
})(tf_debugger_dashboard || (tf_debugger_dashboard = {})); // namespace tf_debugger_dashboard
