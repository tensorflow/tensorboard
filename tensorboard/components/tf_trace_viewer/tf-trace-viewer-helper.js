/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
 * @fileoverview Helper utilities for the trace viewer within TensorBoard's profile plugin.
 */
var tf_component_traceviewer;
(function (tf_component_traceviewer) {
    /** Amount of zooming allowed before re-fetching. */
    tf_component_traceviewer.ZOOM_RATIO = 8;
    /** Minimum safety buffer relative to viewport size. */
    tf_component_traceviewer.PRESERVE_RATIO = 2;
    /** Amount to fetch relative to viewport size. */
    tf_component_traceviewer.FETCH_RATIO = 3;
    /**
     * Expand the input range by scale, keep the center invariant.
     */
    function expand(range, scale) {
        var width = range.max - range.min;
        var mid = range.min + width / 2;
        return {
            min: mid - (scale * width) / 2,
            max: mid + (scale * width) / 2,
        };
    }
    tf_component_traceviewer.expand = expand;
    /**
     * Check if range is within (totally included) in bounds.
     */
    function within(range, bounds) {
        return bounds.min <= range.min && range.max <= bounds.max;
    }
    tf_component_traceviewer.within = within;
    /**
     * Return length of the range.
     */
    function length(range) {
        return range.max - range.min;
    }
    tf_component_traceviewer.length = length;
    /**
     * Return the intersection of two ranges.
     */
    function intersect(range, bounds) {
        return {
            min: Math.max(range.min, bounds.min),
            max: Math.min(range.max, bounds.max),
        };
    }
    tf_component_traceviewer.intersect = intersect;
})(tf_component_traceviewer || (tf_component_traceviewer = {})); // namespace tf_component_traceviewer
