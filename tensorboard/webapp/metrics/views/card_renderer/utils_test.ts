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
import {buildRun} from '../../../runs/store/testing';
import {PartialSeries} from './scalar_card_types';
import {
  clipStepWithinMinMax,
  formatTimeSelection,
  getClosestStep,
  getDisplayNameForRun,
  maybeClipTimeSelectionView,
  maybeOmitTimeSelectionEnd,
  maybeSetClosestStartStep,
  partitionSeries,
} from './utils';

describe('metrics card_renderer utils test', () => {
  describe('#getDisplayNameForRun', () => {
    it('returns runId when Run and experimentId are not present', () => {
      expect(getDisplayNameForRun('rid', null, null)).toBe('rid');
    });

    it('returns only run name when only experiment name is not present', () => {
      expect(getDisplayNameForRun('rid', buildRun({name: 'foo'}), null)).toBe(
        'foo'
      );
    });

    it('returns "..." for run name, when only run is not present', () => {
      expect(
        getDisplayNameForRun('rid', null, {aliasText: 'eid', aliasNumber: 1})
      ).toBe('[1] eid/...');
    });

    it('returns exp and run name delimited by "/" when both are present', () => {
      expect(
        getDisplayNameForRun('rid', buildRun({name: 'foo/bar'}), {
          aliasText: 'eid',
          aliasNumber: 2,
        })
      ).toBe('[2] eid/foo/bar');
    });
  });

  function buildPoints(xs: number[]): PartialSeries['points'] {
    return xs.map((x) => {
      return {
        x,
        y: x * 10,
        value: x * 10,
        wallTime: 0,
        relativeTimeInMs: 0,
        step: x,
      };
    });
  }

  describe('#partitionSeries', () => {
    it('partitions series when non-monotonic points are detected', () => {
      const actual = partitionSeries([
        {
          runId: 'a',
          points: buildPoints([1, 2, 2, 1, 5, 10]),
        },
        {
          runId: 'b',
          points: buildPoints([1, 1, 1]),
        },
      ]);

      expect(actual).toEqual([
        {
          seriesId: '["a",0]',
          runId: 'a',
          points: buildPoints([1, 2, 2]),
          partitionIndex: 0,
          partitionSize: 2,
        },
        {
          seriesId: '["a",1]',
          runId: 'a',
          points: buildPoints([1, 5, 10]),
          partitionIndex: 1,
          partitionSize: 2,
        },
        {
          seriesId: '["b",0]',
          runId: 'b',
          points: buildPoints([1, 1, 1]),
          partitionIndex: 0,
          partitionSize: 1,
        },
      ]);
    });

    it('behaves correctly with non-positive steps', () => {
      const actual = partitionSeries([
        {
          runId: 'a',
          points: buildPoints([0, -30, -15, -50]),
        },
        {
          runId: 'b',
          points: buildPoints([-2, -1, 0]),
        },
      ]);

      expect(actual).toEqual([
        {
          seriesId: '["a",0]',
          runId: 'a',
          points: buildPoints([0]),
          partitionIndex: 0,
          partitionSize: 3,
        },
        {
          seriesId: '["a",1]',
          runId: 'a',
          points: buildPoints([-30, -15]),
          partitionIndex: 1,
          partitionSize: 3,
        },
        {
          seriesId: '["a",2]',
          runId: 'a',
          points: buildPoints([-50]),
          partitionIndex: 2,
          partitionSize: 3,
        },
        {
          seriesId: '["b",0]',
          runId: 'b',
          points: buildPoints([-2, -1, 0]),
          partitionIndex: 0,
          partitionSize: 1,
        },
      ]);
    });

    it('handles zero length points', () => {
      const actual = partitionSeries([
        {
          runId: 'a',
          points: buildPoints([]),
        },
      ]);

      expect(actual).toEqual([
        {
          seriesId: '["a",0]',
          runId: 'a',
          points: [],
          partitionIndex: 0,
          partitionSize: 1,
        },
      ]);
    });

    describe('non-finite xs', () => {
      it('handles only non-finite numbers', () => {
        const actual = partitionSeries([
          {
            runId: 'a',
            points: buildPoints([Infinity, NaN, -Infinity]),
          },
        ]);

        expect(actual).toEqual([
          {
            seriesId: '["a",0]',
            runId: 'a',
            points: buildPoints([Infinity, NaN, -Infinity]),
            partitionIndex: 0,
            partitionSize: 1,
          },
        ]);
      });

      it('disregards non-finite numbers', () => {
        const actual = partitionSeries([
          {
            runId: 'a',
            points: buildPoints([0, Infinity, NaN, 1, -1]),
          },
        ]);

        expect(actual).toEqual([
          {
            seriesId: '["a",0]',
            runId: 'a',
            points: buildPoints([0, Infinity, NaN, 1]),
            partitionIndex: 0,
            partitionSize: 2,
          },
          {
            seriesId: '["a",1]',
            runId: 'a',
            points: buildPoints([-1]),
            partitionIndex: 1,
            partitionSize: 2,
          },
        ]);
      });

      it('keeps trailing non-finites', () => {
        const actual = partitionSeries([
          {
            runId: 'a',
            points: buildPoints([-1, Infinity, NaN]),
          },
        ]);

        expect(actual).toEqual([
          {
            seriesId: '["a",0]',
            runId: 'a',
            points: buildPoints([-1, Infinity, NaN]),
            partitionIndex: 0,
            partitionSize: 1,
          },
        ]);
      });

      it('does not put starting infinite in a separate partition', () => {
        const actual = partitionSeries([
          {
            runId: 'a',
            points: buildPoints([Infinity, 0, 1]),
          },
        ]);

        expect(actual).toEqual([
          {
            seriesId: '["a",0]',
            runId: 'a',
            points: buildPoints([Infinity, 0, 1]),
            partitionIndex: 0,
            partitionSize: 1,
          },
        ]);
      });
    });
  });

  describe('#maybeSetClosestStartStep', () => {
    it('sets startStep to closest step', () => {
      const timeSelectionView = {
        startStep: 0,
        endStep: null,
        clipped: false,
      };

      expect(maybeSetClosestStartStep(timeSelectionView, [10, 20, 30])).toEqual(
        {
          startStep: 10,
          endStep: null,
          clipped: false,
        }
      );
    });

    it('does not set startStep on an empty array of steps', () => {
      const timeSelectionView = {
        startStep: 0,
        endStep: null,
        clipped: false,
      };

      expect(maybeSetClosestStartStep(timeSelectionView, [])).toEqual({
        startStep: 0,
        endStep: null,
        clipped: false,
      });
    });

    it('does not set startStep when time selection is range selection', () => {
      const timeSelectionView = {
        startStep: 0,
        endStep: 3,
        clipped: false,
      };

      expect(maybeSetClosestStartStep(timeSelectionView, [10, 20, 30])).toEqual(
        {
          startStep: 0,
          endStep: 3,
          clipped: false,
        }
      );
    });
  });

  describe('#getClosestStep', () => {
    it('gets closest step', () => {
      expect(getClosestStep(11, [0, 10, 20])).toBe(10);
    });

    it('gets null on empty steps', () => {
      expect(getClosestStep(11, [])).toBe(null);
    });

    it('gets closeset step equal to selected step', () => {
      expect(getClosestStep(10, [0, 10, 20])).toBe(10);
    });
  });

  describe('#clipStepWithinMinMax', () => {
    it('returns step if greater than min', () => {
      expect(clipStepWithinMinMax(1, 0, 5)).toBe(1);
    });

    it('returns step if less than max', () => {
      expect(clipStepWithinMinMax(1, 0, 5)).toBe(1);
    });

    it('returns min if greater than step', () => {
      expect(clipStepWithinMinMax(1, 3, 5)).toBe(3);
      expect(clipStepWithinMinMax(1, 5, 3)).toBe(5);
    });

    it('returns max if less than step', () => {
      expect(clipStepWithinMinMax(6, 0, 5)).toBe(5);
    });
  });

  describe('#maybeClipLinkedTimeSelection', () => {
    it('clips to the minStep when time selection start step is smaller than the view extend', () => {
      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 0},
            end: null,
          },
          1,
          4
        )
      ).toEqual({
        startStep: 1,
        endStep: null,
        clipped: true,
      });
    });

    it('clips to maxStep when time selection end step is greater than view extend', () => {
      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 0},
            end: {step: 4},
          },
          0,
          3
        )
      ).toEqual({
        startStep: 0,
        endStep: 3,
        clipped: true,
      });
    });

    it('does not clip when time selection falls into the view extend', () => {
      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 10},
            end: null,
          },
          0,
          20
        )
      ).toEqual({
        startStep: 10,
        endStep: null,
        clipped: false,
      });
    });

    it('returns minStep and maxStep when the timeselection is a superset of the min/maxstep', () => {
      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 0},
            end: {step: 100},
          },
          30,
          50
        )
      ).toEqual({
        startStep: 30,
        endStep: 50,
        clipped: true,
      });
    });

    it('clips both fobs to maxStep when timeSelection is greater than maxStep', () => {
      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 50},
            end: {step: 100},
          },
          10,
          20
        )
      ).toEqual({
        startStep: 20,
        endStep: 20,
        clipped: true,
      });
    });

    it('returns startStep === endStep === minStep when timeSelection is below minStep', () => {
      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 0},
            end: {step: 10},
          },
          20,
          30
        )
      ).toEqual({
        startStep: 20,
        endStep: 20,
        clipped: true,
      });
    });

    it('does not clip when time selection falls within the view extent', () => {
      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 0},
            end: {step: 4},
          },
          0,
          4
        )
      ).toEqual({
        startStep: 0,
        endStep: 4,
        clipped: false,
      });

      expect(
        maybeClipTimeSelectionView(
          {
            start: {step: 1},
            end: {step: 3},
          },
          0,
          4
        )
      ).toEqual({
        startStep: 1,
        endStep: 3,
        clipped: false,
      });
    });
  });

  describe('#maybeOmitTimeSelectionEnd', () => {
    it('does nothing when range selection is enabled', () => {
      expect(
        maybeOmitTimeSelectionEnd(
          {
            start: {step: 5},
            end: {step: 10},
          },
          true
        )
      ).toEqual({
        start: {step: 5},
        end: {step: 10},
      });
    });

    it('sets end step to null when range selection is disabled', () => {
      expect(
        maybeOmitTimeSelectionEnd(
          {
            start: {step: 5},
            end: {step: 10},
          },
          false
        )
      ).toEqual({
        start: {step: 5},
        end: null,
      });
    });
  });

  describe('#formatTimeSelection', () => {
    it('returns [maxStep, maxStep] when above minMax', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 100},
            end: {step: 105},
          },
          {
            minStep: 0,
            maxStep: 50,
          },
          true
        )
      ).toEqual({
        start: {step: 50},
        end: {step: 50},
      });
    });

    it('returns [minStep, minStep] when below minMax', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 0},
            end: {step: 50},
          },
          {
            minStep: 100,
            maxStep: 150,
          },
          true
        )
      ).toEqual({
        start: {step: 100},
        end: {step: 100},
      });
    });

    it('does not add an end step when none is provided', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 0},
            end: null,
          },
          {
            minStep: 100,
            maxStep: 150,
          },
          true
        )
      ).toEqual({
        start: {step: 100},
        end: null,
      });

      expect(
        formatTimeSelection(
          {
            start: {step: 100},
            end: null,
          },
          {
            minStep: 0,
            maxStep: 50,
          },
          true
        )
      ).toEqual({
        start: {step: 50},
        end: null,
      });

      expect(
        formatTimeSelection(
          {
            start: {step: 100},
            end: null,
          },
          {
            minStep: 50,
            maxStep: 150,
          },
          true
        )
      ).toEqual({
        start: {step: 100},
        end: null,
      });
    });

    it('returns input when timeSelection is a subset of minMax', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 100},
            end: {step: 150},
          },
          {
            minStep: 50,
            maxStep: 200,
          },
          true
        )
      ).toEqual({
        start: {step: 100},
        end: {step: 150},
      });
    });

    it('clips start when less than min', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 100},
            end: {step: 150},
          },
          {
            minStep: 125,
            maxStep: 200,
          },
          true
        )
      ).toEqual({
        start: {step: 125},
        end: {step: 150},
      });
    });

    it('clips end when greater than max', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 100},
            end: {step: 250},
          },
          {
            minStep: 50,
            maxStep: 200,
          },
          true
        )
      ).toEqual({
        start: {step: 100},
        end: {step: 200},
      });
    });

    it('sets end to null when rangeSelection is disabled', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 50},
            end: {step: 100},
          },
          {
            minStep: 50,
            maxStep: 200,
          },
          false
        )
      ).toEqual({
        start: {step: 50},
        end: null,
      });
    });

    it('does nothing when rangeSelection is enabled', () => {
      expect(
        formatTimeSelection(
          {
            start: {step: 50},
            end: {step: 100},
          },
          {
            minStep: 50,
            maxStep: 200,
          },
          true
        )
      ).toEqual({
        start: {step: 50},
        end: {step: 100},
      });
    });
  });
});
