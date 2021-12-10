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
import {buildStepDatum} from '../testing';
import {buildState, buildTextState} from './testing';
import * as selectors from './text_v2_selectors';

describe('core selectors', () => {
  describe('#getTextRunToTags', () => {
    beforeEach(() => {
      selectors.getTextRunToTags.release();
    });

    it('returns state', () => {
      const state = buildState(
        buildTextState({
          runToTags: new Map([['run', ['tag1', 'tag2']]]),
        })
      );
      expect(selectors.getTextRunToTags(state)).toEqual(
        new Map([['run', ['tag1', 'tag2']]])
      );
    });
  });

  describe('#getTextData', () => {
    beforeEach(() => {
      selectors.getTextData.release();
    });

    it('returns state', () => {
      const state = buildState(
        buildTextState({
          data: new Map([['run1', new Map([['tag1', [buildStepDatum({})]]])]]),
        })
      );
      expect(selectors.getTextData(state, {run: 'run1', tag: 'tag1'})).toEqual([
        buildStepDatum({}),
      ]);
    });

    it('returns null when accessing tag that is not present', () => {
      const state = buildState(
        buildTextState({
          data: new Map([['run1', new Map([['tag1', [buildStepDatum({})]]])]]),
        })
      );
      expect(selectors.getTextData(state, {run: 'run1', tag: '??'})).toBeNull();
    });

    it('returns null when accessing run that is not present', () => {
      const state = buildState(
        buildTextState({
          data: new Map([['run1', new Map([['tag1', [buildStepDatum({})]]])]]),
        })
      );
      expect(selectors.getTextData(state, {run: '??', tag: 'tag1'})).toBeNull();
    });
  });
});
