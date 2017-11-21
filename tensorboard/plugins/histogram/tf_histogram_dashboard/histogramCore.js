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
var tf_histogram_dashboard;
(function (tf_histogram_dashboard) {
    function backendToIntermediate(histogram) {
        var wall_time = histogram[0], step = histogram[1], buckets = histogram[2];
        return {
            wall_time: wall_time,
            step: step,
            min: d3.min(buckets.map(function (_a) {
                var left = _a[0];
                return left;
            })),
            max: d3.max(buckets.map(function (_a) {
                var right = _a[1];
                return right;
            })),
            buckets: buckets.map(function (_a) {
                var left = _a[0], right = _a[1], count = _a[2];
                return ({ left: left, right: right, count: count });
            }),
        };
    }
    tf_histogram_dashboard.backendToIntermediate = backendToIntermediate;
    /**
     * Convert histogram data to the standard D3 format to make it more
     * compatible and easier to visualize. When rendering histograms, having
     * access to the left edge and width of each bin makes things quite a
     * bit easier, so we include these in the result. We also convert the
     * bins to have a uniform width, which makes the visualization easier to
     * understand.
     *
     * @param histogram
     * @param min The leftmost edge. The binning will start on it.
     * @param max The rightmost edge. The binning will end on it.
     * @param numBins The number of bins of the converted data. The default
     * of 30 is sensible: if you use more, you start to get artifacts
     * because the event data is stored in buckets, and you start being able
     * to see the aliased borders between each bucket.
     *
     * @return A list of histogram bins. Each bin has an `x` (left
     *     edge), a `dx` (width), and a `y` (count). If the given
     *     right edges are inclusive, then these left edges (`x`) are
     *     exclusive.
     */
    function intermediateToD3(histogram, min, max, numBins) {
        if (numBins === void 0) { numBins = 30; }
        if (max === min) {
            // Create bins even if all the data has a single value.
            max = min * 1.1 + 1;
            min = min / 1.1 - 1;
        }
        // Terminology note: _buckets_ are the input to this function,
        // while _bins_ are our output.
        var binWidth = (max - min) / numBins;
        var bucketIndex = 0;
        return d3.range(min, max, binWidth).map(function (binLeft) {
            var binRight = binLeft + binWidth;
            // Take the count of each existing bucket, multiply it by the
            // proportion of overlap with the new bin, then sum and store as the
            // count for the new bin. If no overlap, will add to zero; if 100%
            // overlap, will include the full count into new bin.
            var binY = 0;
            while (bucketIndex < histogram.buckets.length) {
                // Clip the right edge because right-most edge can be
                // infinite-sized.
                var bucketRight = Math.min(max, histogram.buckets[bucketIndex].right);
                var bucketLeft = Math.max(min, histogram.buckets[bucketIndex].left);
                var intersect = Math.min(bucketRight, binRight) - Math.max(bucketLeft, binLeft);
                var count = (intersect / (bucketRight - bucketLeft)) *
                    histogram.buckets[bucketIndex].count;
                binY += intersect > 0 ? count : 0;
                // If `bucketRight` is bigger than `binRight`, then this bin is
                // finished and there is data for the next bin, so don't increment
                // `bucketIndex`.
                if (bucketRight > binRight) {
                    break;
                }
                bucketIndex++;
            }
            return { x: binLeft, dx: binWidth, y: binY };
        });
    }
    tf_histogram_dashboard.intermediateToD3 = intermediateToD3;
    function backendToVz(histograms) {
        var intermediateHistograms = histograms.map(backendToIntermediate);
        var minmin = d3.min(intermediateHistograms, function (h) { return h.min; });
        var maxmax = d3.max(intermediateHistograms, function (h) { return h.max; });
        return intermediateHistograms.map(function (h) { return ({
            wall_time: h.wall_time,
            step: h.step,
            bins: intermediateToD3(h, minmin, maxmax),
        }); });
    }
    tf_histogram_dashboard.backendToVz = backendToVz;
})(tf_histogram_dashboard || (tf_histogram_dashboard = {})); // namespace tf_histogram_dashboard
