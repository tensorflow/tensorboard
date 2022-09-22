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
  getClosestStep,
  getDisplayNameForRun,
  maybeClipLinkedTimeSelection,
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

  describe('#maybeClipLinkedTimeSelection', () => {
    it('changes start when start.step < minStep', () => {
      expect(
        maybeClipLinkedTimeSelection(
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

    it('changes end when end.step < maxStep', () => {
      expect(
        maybeClipLinkedTimeSelection(
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

    it('returns clipped === false when provided timeSelection is a subspace of minStep, maxStep', () => {
      expect(
        maybeClipLinkedTimeSelection(
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
        maybeClipLinkedTimeSelection(
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
});
