/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {
  clipStepWithinMinMax,
  formatTimeSelection,
} from './time_selection_utils';

describe('time selection utils', () => {
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

  describe('#formatTimeSelection', () => {
    it('returns [minStep, minStep] when above minMax', () => {
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

    it('returns [maxStep, maxStep] when below minMax', () => {
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
