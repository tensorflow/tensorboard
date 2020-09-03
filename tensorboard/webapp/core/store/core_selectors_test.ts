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
import * as selectors from './core_selectors';
import {createState, createCoreState} from '../testing';

describe('core selectors', () => {
  describe('#getRuns', () => {
    beforeEach(() => {
      selectors.getRuns.release();
    });

    it('returns state', () => {
      const state = createState(
        createCoreState({
          polymerInteropRuns: [{id: '1', name: 'Run name'}],
        })
      );
      expect(selectors.getRuns(state)).toEqual([{id: '1', name: 'Run name'}]);
    });
  });

  describe('#getRunSelection', () => {
    beforeEach(() => {
      selectors.getRunSelection.release();
    });

    it('returns state', () => {
      const state = createState(
        createCoreState({
          polymerInteropRuns: [
            {id: '1', name: 'Run name'},
            {id: '2', name: 'Run 2 name'},
          ],
          polymerInteropRunSelection: new Set(['2']),
        })
      );
      expect(selectors.getRunSelection(state)).toEqual(
        new Map([
          ['1', false],
          ['2', true],
        ])
      );
    });

    it('omits selection when run is not in the list', () => {
      const state = createState(
        createCoreState({
          polymerInteropRuns: [
            {id: '1', name: 'Run name'},
            {id: '2', name: 'Run 2 name'},
          ],
          polymerInteropRunSelection: new Set(['1', '5']),
        })
      );
      expect(selectors.getRunSelection(state)).toEqual(
        new Map([
          ['1', true],
          ['2', false],
        ])
      );
    });
  });
});
