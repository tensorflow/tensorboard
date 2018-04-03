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

var tf_component_traceViewer = new Object({
  /** Amount of zooming allowed before re-fetching. */
  ZOOM_RATIO : 8,

  /** Minimum safety buffer relative to viewport size. */
  PRESERVE_RATIO : 2,

  /** Amount to fetch relative to viewport size. */
  FETCH_RATIO : 3,

  /**
   * Expand the input range by scale, keep the center invariant.
   */
  expand: function(range, scale) {
    var width = range.max - range.min;
    var mid = range.min + width / 2;
    return {
      min: mid - scale * width / 2,
      max: mid + scale * width / 2,
    };
  },
  /**
   * Check if range is within (totally included) in bounds.
   */
  within: function(range, bounds) {
    return bounds.min <= range.min && range.max <= bounds.max;
  },
  /**
   * Return length of the range.
   */
  length: function(range) {
    return range.max - range.min;
  },
  /**
   * Return the intersection of two ranges.
   */
  intersect: function(range, bounds) {
    return {
      min: Math.max(range.min, bounds.min),
      max: Math.min(range.max, bounds.max),
    };
  },
  /**
   *  Compute the {min, max} range of a trackView.
   *  TODO: Spec out an interface for the trackView.
   */
  trackViewRange: function(trackView) {
    var xfm = trackView.viewport.currentDisplayTransform;
    const pixelRatio = window.devicePixelRatio || 1;
    const devicePixelWidth = pixelRatio * trackView.viewWidth_;
    return {
      min: xfm.xViewToWorld(0),
      max: xfm.xViewToWorld(devicePixelWidth),
    };
  },
});
