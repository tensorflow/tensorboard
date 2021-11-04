/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
/**
 * @fileoverview Utilities for formatting histogram data.
 *
 * For the traditional TensorBoard logic, see
 * third_party/tensorboard/plugins/histogram/tf_histogram_dashboard/histogramCore.ts
 */

import {Bin, HistogramDatum} from './histogram_types';

interface Range {
  left: number;
  right: number;
}

const DEFAULT_BIN_COUNT = 30;

/**
 * Histogram normalization logic.
 *
 * - Create a normalized bin template with 'binCount' # of bins. The range of
 *   all histograms should fit into this new bin list.
 * - Each histogram gets its own copy of the normalized bins.
 * - Each histogram's old counts are redistributed among their new bins.
 */
export function buildNormalizedHistograms(
  histograms: HistogramDatum[],
  binCount: number = DEFAULT_BIN_COUNT
): HistogramDatum[] {
  if (!histograms.length || binCount < 1) {
    return [];
  }
  const range = getBinRange(histograms);
  // If the output range is 0 width, use a default non 0 range.
  if (range && range.left === range.right) {
    range.right = range.right * 1.1 + 1;
    range.left = range.left / 1.1 - 1;
  }

  return histograms.map((histogram) => {
    return {
      step: histogram.step,
      wallTime: histogram.wallTime,
      bins: range ? rebuildBins(histogram.bins, range, binCount) : [],
    };
  });
}

/**
 * Computes a range that covers the bins of all input histograms. Fields may
 * be null if the histogram bins were empty.
 *
 * For example,
 * histogram[0]: [          ][  ]
 * histogram[1]:        [               ]
 * result:       [                      ]
 */
function getBinRange(histograms: HistogramDatum[]): Range | null {
  let left = null;
  let right = null;

  for (const {bins} of histograms) {
    if (!bins.length) {
      continue;
    }

    const lastBin = bins[bins.length - 1];
    const histogramLeft = bins[0].x;
    const histogramRight = lastBin.x + lastBin.dx;
    if (left === null || histogramLeft < left) {
      left = histogramLeft;
    }
    if (right === null || histogramRight > right) {
      right = histogramRight;
    }
  }
  if (left === null || right === null) {
    return null;
  }
  return {left, right};
}

/**
 * Builds a new list of 'binCount' bins.The 'y' counts from input bins are
 * distributed among the new bins based on amount of overlap.
 * Input bins must be sorted in increasing order and non-overlapping.
 *
 * Characteristics:
 * - The output bins are guaranteed contiguous, non-overlapping, equal width,
 *   and nonzero width.
 * - Handles 0 width input bins. When a 0 width bin is between 2 output bins,
 *   its counts are distributed evenly between the neighboring bins.
 *
 * For example,
 * bins:       [ 5 ][   10   ]
 * range:      [                  ]
 * binsCount:  2
 * results:    [   10   ][    5   ]
 */
function rebuildBins(bins: Bin[], range: Range, binCount: number): Bin[] {
  const results: Bin[] = [];
  const {left, right} = range;
  const dx = (right - left) / binCount;

  let binIndex = 0;
  let nextBinContribution = 0;
  for (let i = 0; i < binCount; i++) {
    const resultLeft = left + i * dx;
    const resultRight = resultLeft + dx;
    const isLastResultBin = i === binCount - 1;

    let resultY = nextBinContribution;
    nextBinContribution = 0;
    while (binIndex < bins.length) {
      const bin = bins[binIndex];
      const contribution = getBinContribution(
        bin,
        resultLeft,
        resultRight,
        !isLastResultBin
      );
      resultY += contribution.curr;
      nextBinContribution += contribution.next;

      // When the result bin completes, break without incrementing binIndex, in
      // case it contributes to the the next result bin.
      if (bin.x + bin.dx > resultRight) {
        break;
      }
      binIndex++;
    }
    results.push({x: resultLeft, dx, y: resultY});
  }
  return results;
}

/**
 * Computes how much of the input bin's 'y' counts should be allocated to this output bin.
 *
 * Where both bins have non-zero width, this is computed by multiplying the input y value by
 * the ratio of the width-wise overlap in the bins to the total width of the output bin.
 * (This can be thought of redistributing the overlapping "area" of the bar in the input
 * histogram across the full width of the output bin.)
 *
 * When the input bin has zero width (the output bin cannot have zero width by construction),
 * we instead have to consider several cases depending on the open/closed-ness of the
 * underlying intervals. If the zero width input bin has y value 0, the contribution is
 * always 0. Otherwise, if zero width input bin has y value greater than 0, it must represent
 * the closed interval [x, x]. In this case, it contributes the full value of y if and only
 * if the output bin's interval contains x. This interval is the closed-open interval
 * [resultLeft, resultRight), except if resultHasRightNeighbor is false, in which case it's
 * the closed interval [resultLeft, resultRight].
 */
function getBinContribution(
  bin: Bin,
  resultLeft: number,
  resultRight: number,
  resultHasRightNeighbor: boolean
): {curr: number; next: number} {
  const binLeft = bin.x;
  const binRight = bin.x + bin.dx;
  if (binLeft > resultRight || binRight < resultLeft) {
    return {curr: 0, next: 0};
  }

  if (bin.dx === 0) {
    if (resultHasRightNeighbor && binRight >= resultRight) {
      return {curr: 0, next: bin.y};
    }
    return {curr: bin.y, next: 0};
  }

  const intersection =
    Math.min(binRight, resultRight) - Math.max(binLeft, resultLeft);
  return {curr: (bin.y * intersection) / bin.dx, next: 0};
}
