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
import {DataLoadState} from '../../types/data';
import {createCoreState, createState} from '../testing';
import * as selectors from './core_selectors';

describe('core selectors', () => {
  describe('#getCoreDataLoadedState', () => {
    beforeEach(() => {
      selectors.getCoreDataLoadedState.release();
    });

    it('returns DataLoadState of app basic data by combining loadStates', () => {
      const state = createState(
        createCoreState({
          coreDataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: 1,
          },
        })
      );
      expect(selectors.getCoreDataLoadedState(state)).toBe(
        DataLoadState.LOADING
      );
    });
  });

  describe('#getAppLastLoadedTimeInMs', () => {
    beforeEach(() => {
      selectors.getAppLastLoadedTimeInMs.release();
    });

    it('returns null when both are not loaded', () => {
      const state = createState(
        createCoreState({
          coreDataLoadState: {
            state: DataLoadState.LOADING,
            lastLoadedTimeInMs: 1,
          },
        })
      );
      expect(selectors.getAppLastLoadedTimeInMs(state)).toBe(1);
    });
  });

  describe('#getSideBarWidthInPercent', () => {
    beforeEach(() => {
      selectors.getSideBarWidthInPercent.release();
    });

    it('returns sidebar width information', () => {
      const state = createState(
        createCoreState({
          sideBarWidthInPercent: 15,
        })
      );
      expect(selectors.getSideBarWidthInPercent(state)).toBe(15);
    });
  });
});
