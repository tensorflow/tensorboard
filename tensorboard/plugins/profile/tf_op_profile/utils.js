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
var tf_op_profile;
(function (tf_op_profile) {
    function rgba(red, green, blue, alpha) {
        return "rgba(" + Math.round(red * 255) + "," + Math.round(green * 255) +
            "," + Math.round(blue * 255) + "," + alpha + ")";
    }
    /**
     * Computes a flame color.
     * @param {number} fraction
     * @param {number=} brightness
     * @param {number=} opacity
     * @param {Function=} curve mapping [0-1] to [0-1]
     * @return {string} An RGBA color.
     */
    function flameColor(fraction, brightness, opacity, curve) {
        if (brightness === void 0) { brightness = 1; }
        if (opacity === void 0) { opacity = 1; }
        if (curve === void 0) { curve = Math.sqrt; }
        if (isNaN(fraction))
            return rgba(brightness, brightness, brightness, opacity);
        fraction = curve(fraction); // Or everything is depressing and red.
        return (fraction < 0.5) ?
            rgba(brightness, 2 * fraction * brightness, 0, opacity) :
            rgba(2 * (1 - fraction) * brightness, brightness, 0, opacity);
    }
    tf_op_profile.flameColor = flameColor;
    function utilization(node) {
        // NaN indicates undefined utilization for fused operations (we can't measure
        // performance inside a fusion). It could also indicate operations with zero
        // time, but they currently don't appear in the profile.
        if (!node || !node.metrics)
            return 0 / 0;
        return node.metrics.flops / node.metrics.time;
    }
    tf_op_profile.utilization = utilization;
    function memoryUtilization(node) {
        // NaN indicates undefined memory utilization (the profile was collected from
        // older versions of profiler).
        if (!node || !node.metrics || !node.metrics.memoryBandwidth)
            return 0 / 0;
        return node.metrics.memoryBandwidth;
    }
    tf_op_profile.memoryUtilization = memoryUtilization;
    function percent(fraction) {
        if (isNaN(fraction))
            return "-";
        return fraction >= 0.995 ? "100%" : fraction < 0.00001 ? "0.00%" :
            (fraction * 100).toPrecision(2) + "%";
    }
    tf_op_profile.percent = percent;
})(tf_op_profile || (tf_op_profile = {})); // namespace tf_op_profile
