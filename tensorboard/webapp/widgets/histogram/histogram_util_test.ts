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

import {Bin, HistogramDatum} from './histogram_types';
import {buildNormalizedHistograms} from './histogram_util';

function createBins(count: number = 1) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({x: i, dx: 1, y: 1});
  }
  return result;
}

function binsToHistogram(bins: Bin[]): HistogramDatum {
  return {step: 0, wallTime: 0, bins};
}

function histogramsToBins(histograms: HistogramDatum[]) {
  return histograms.map((histogram) => histogram.bins);
}

describe('histogram util', () => {
  describe('buildNormalizedHistograms', () => {
    describe('empty or invalid inputs', () => {
      it('handles no histograms', () => {
        expect(histogramsToBins(buildNormalizedHistograms([], 3))).toEqual([]);
      });

      it('handles histogram with no bins', () => {
        expect(
          histogramsToBins(buildNormalizedHistograms([binsToHistogram([])], 3))
        ).toEqual([[]]);
      });

      it('handles invalid bin count request', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms([binsToHistogram(createBins())], 0)
          )
        ).toEqual([]);
      });
    });

    describe('single histogram', () => {
      it('converts a 0 width bin into a default bin', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [binsToHistogram([{x: 0, dx: 0, y: 300}])],
              1
            )
          )
        ).toEqual([[{x: -1, dx: 2, y: 300}]]);
      });

      it('preserves a single bin', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [binsToHistogram([{x: 0, dx: 10, y: 300}])],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 10, y: 300}]]);
      });

      it('splits a single bin into multiple', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [binsToHistogram([{x: 0, dx: 9, y: 300}])],
              3
            )
          )
        ).toEqual([
          [
            {x: 0, dx: 3, y: 100},
            {x: 3, dx: 3, y: 100},
            {x: 6, dx: 3, y: 100},
          ],
        ]);
      });

      it('merges multiple bins into one', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 3, y: 100},
                  {x: 3, dx: 3, y: 200},
                  {x: 6, dx: 3, y: 300},
                ]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 9, y: 600}]]);
      });

      it('handles unequal sizes', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 3, y: 100},
                  {x: 3, dx: 6, y: 200},
                ]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 9, y: 300}]]);
      });

      it('handles non-contiguous bins', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 3, y: 100},
                  {x: 7, dx: 3, y: 200},
                ]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 10, y: 300}]]);
      });

      it('handles duplicate bins', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 10, y: 100},
                  {x: 0, dx: 10, y: 200},
                ]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 10, y: 300}]]);
      });

      it('handles partially overlapping bins', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 8, y: 100},
                  {x: 2, dx: 8, y: 200},
                ]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 10, y: 300}]]);
      });

      it('N bin to N bin, non-contiguous, N > 1', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 3, y: 100},
                  {x: 7, dx: 3, y: 200},
                ]),
              ],
              2
            )
          )
        ).toEqual([
          [
            {x: 0, dx: 5, y: 100},
            {x: 5, dx: 5, y: 200},
          ],
        ]);
      });

      it('N bin to N+1 bin, non-contiguous, N > 1', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 3, y: 100},
                  {x: 6, dx: 3, y: 200},
                ]),
              ],
              3
            )
          )
        ).toEqual([
          [
            {x: 0, dx: 3, y: 100},
            {x: 3, dx: 3, y: 0},
            {x: 6, dx: 3, y: 200},
          ],
        ]);
      });

      it('redistributes across multiple result bins', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 3, y: 300},
                  {x: 3, dx: 7, y: 700},
                ]),
              ],
              2
            )
          )
        ).toEqual([
          [
            {x: 0, dx: 5, y: 500},
            {x: 5, dx: 5, y: 500},
          ],
        ]);
      });

      it('redistributes 0 width bins', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 0, y: 300},
                  {x: 10, dx: 0, y: 700},
                ]),
              ],
              2
            )
          )
        ).toEqual([
          [
            {x: 0, dx: 5, y: 300},
            {x: 5, dx: 5, y: 700},
          ],
        ]);
      });

      it('redistributes bin counts where the last bin has zero width', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 1, y: 10},
                  {x: 1, dx: 1, y: 10},
                  {x: 2, dx: 0, y: 10},
                ]),
              ],
              2
            )
          )
        ).toEqual([
          [
            {x: 0, dx: 1, y: 10},
            {x: 1, dx: 1, y: 20},
          ],
        ]);
      });

      it(
        'preserves 0 width bin counts in a result bin that has no other ' +
          'contributions',
        () => {
          expect(
            histogramsToBins(
              buildNormalizedHistograms(
                [
                  binsToHistogram([
                    {x: 0, dx: 1, y: 0},
                    {x: 5, dx: 0, y: 200},
                    {x: 8, dx: 1, y: 0},
                  ]),
                ],
                3
              )
            )
          ).toEqual([
            [
              {x: 0, dx: 3, y: 0},
              {x: 3, dx: 3, y: 200},
              {x: 6, dx: 3, y: 0},
            ],
          ]);
        }
      );

      it('merges counts from multiple 0 width bins', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([
                  {x: 0, dx: 0, y: 100},
                  {x: 10, dx: 0, y: 200},
                ]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 10, y: 300}]]);
      });
    });

    describe('multiple histograms', () => {
      it('preserves counts across histograms', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([{x: 0, dx: 10, y: 100}]),
                binsToHistogram([{x: 0, dx: 10, y: 200}]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 10, y: 100}], [{x: 0, dx: 10, y: 200}]]);
      });

      it('produces bins over the full range', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([{x: 0, dx: 1, y: 100}]),
                binsToHistogram([{x: 9, dx: 1, y: 200}]),
              ],
              1
            )
          )
        ).toEqual([[{x: 0, dx: 10, y: 100}], [{x: 0, dx: 10, y: 200}]]);
      });

      it('redistributes bins over the full range', () => {
        expect(
          histogramsToBins(
            buildNormalizedHistograms(
              [
                binsToHistogram([{x: 0, dx: 6, y: 100}]),
                binsToHistogram([{x: 3, dx: 6, y: 200}]),
              ],
              3
            )
          )
        ).toEqual([
          [
            {x: 0, dx: 3, y: 50},
            {x: 3, dx: 3, y: 50},
            {x: 6, dx: 3, y: 0},
          ],
          [
            {x: 0, dx: 3, y: 0},
            {x: 3, dx: 3, y: 100},
            {x: 6, dx: 3, y: 100},
          ],
        ]);
      });

      it(
        'produces result bins from multiple 0 width bins in different ' +
          'steps',
        () => {
          expect(
            histogramsToBins(
              buildNormalizedHistograms(
                [
                  binsToHistogram([{x: 0, dx: 0, y: 200}]),
                  binsToHistogram([{x: 1.0, dx: 0, y: 100}]),
                ],
                2
              )
            )
          ).toEqual([
            [
              {x: 0, dx: 0.5, y: 200},
              {x: 0.5, dx: 0.5, y: 0},
            ],
            [
              {x: 0, dx: 0.5, y: 0},
              {x: 0.5, dx: 0.5, y: 100},
            ],
          ]);
        }
      );
    });
  });
});
