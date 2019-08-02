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
namespace tf_histogram_dashboard {

/**
 * Functions for converting between the different representations of
 * histograms.
 */
export type BackendHistogramBin = [
  number,  // left
  number,  // right
  number   // count
];

export type BackendHistogram = [
  number,  // wall_time, in seconds
  number,  // step
  BackendHistogramBin[]
];

export type IntermediateHistogram = {
  wall_time: number,  // in seconds
  step: number,
  min: number,
  max: number,
  buckets: {
    left: number,
    right: number,
    count: number,
  }[],
};

export type D3HistogramBin = {
  x: number,
  dx: number,
  y: number,
};

export type VzHistogram = {
  wall_time: number,  // in seconds
  step: number,
  bins: D3HistogramBin[],
};

export function backendToIntermediate(histogram: BackendHistogram):
    IntermediateHistogram {
  const [wall_time, step, buckets] = histogram;
  return {
    wall_time,
    step,
    min: d3.min(buckets.map(([left, , ]) => left)),
    max: d3.max(buckets.map(([, right, ]) => right)),
    buckets: buckets.map(([left, right, count]) => ({left, right, count})),
  };
}

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
export function intermediateToD3(
    histogram: IntermediateHistogram, min: number, max: number,
    numBins = 30): D3HistogramBin[] {
  if (max === min) {
    // Create bins even if all the data has a single value.
    max = min * 1.1 + 1;
    min = min / 1.1 - 1;
  }

  // Terminology note: _buckets_ are the input to this function,
  // while _bins_ are our output.
  const binWidth = (max - min) / numBins;

  let bucketIndex = 0;
  return d3.range(min, max, binWidth).map((binLeft) => {
    const binRight = binLeft + binWidth;

    // Take the count of each existing bucket, multiply it by the
    // proportion of overlap with the new bin, then sum and store as the
    // count for the new bin. If no overlap, will add to zero; if 100%
    // overlap, will include the full count into new bin.
    let binY = 0;
    while (bucketIndex < histogram.buckets.length) {
      // Clip the right edge because right-most edge can be
      // infinite-sized.
      const bucketRight = Math.min(max, histogram.buckets[bucketIndex].right);
      const bucketLeft = Math.max(min, histogram.buckets[bucketIndex].left);

      const intersect =
          Math.min(bucketRight, binRight) - Math.max(bucketLeft, binLeft);
      const count = (intersect / (bucketRight - bucketLeft)) *
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
    return {x: binLeft, dx: binWidth, y: binY};
  });
}

export function backendToVz(histograms: BackendHistogram[]): VzHistogram[] {
  const intermediateHistograms = histograms.map(backendToIntermediate);
  const minmin = d3.min(intermediateHistograms, h => h.min);
  const maxmax = d3.max(intermediateHistograms, h => h.max);
  return intermediateHistograms.map(h => ({
    wall_time: h.wall_time,
    step: h.step,
    bins: intermediateToD3(h, minmin, maxmax),
  }));
}

}  // namespace tf_histogram_dashboard
