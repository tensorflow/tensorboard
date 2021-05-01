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
import {DataLoadState, LoadState} from '../../types/data';
import {PluginsListFailureCode} from '../types';
import {PluginsListLoadState} from './core_types';

describe('core selectors', () => {
  describe('#getCoreDataLoadedState', () => {
    function assert(
      polymerRunsDataLoadState: DataLoadState,
      pluginsListDataLoadState: DataLoadState,
      expectedLoadState: DataLoadState
    ) {
      selectors.getCoreDataLoadedState.release();

      let pluginsListLoaded: PluginsListLoadState;
      if (pluginsListDataLoadState === DataLoadState.FAILED) {
        pluginsListLoaded = {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: 2,

          failureCode: PluginsListFailureCode.UNKNOWN,
        };
      } else {
        pluginsListLoaded = {
          state: pluginsListDataLoadState,
          lastLoadedTimeInMs: 2,
          failureCode: null,
        };
      }

      const state = createState(
        createCoreState({
          polymerRunsLoadState: {
            state: polymerRunsDataLoadState,
            lastLoadedTimeInMs: 1,
          },
          pluginsListLoaded,
        })
      );
      expect(selectors.getCoreDataLoadedState(state)).toBe(expectedLoadState);
    }

    it('returns DataLoadState of app basic data by combining loadStates', () => {
      assert(
        DataLoadState.NOT_LOADED,
        DataLoadState.NOT_LOADED,
        DataLoadState.NOT_LOADED
      );
      assert(
        DataLoadState.LOADING,
        DataLoadState.LOADING,
        DataLoadState.LOADING
      );
      assert(DataLoadState.FAILED, DataLoadState.FAILED, DataLoadState.FAILED);
      assert(DataLoadState.LOADED, DataLoadState.LOADED, DataLoadState.LOADED);

      assert(
        DataLoadState.LOADING,
        DataLoadState.LOADED,
        DataLoadState.LOADING
      );
      assert(
        DataLoadState.LOADED,
        DataLoadState.LOADING,
        DataLoadState.LOADING
      );
      // Loading takes precedence over others.
      assert(
        DataLoadState.FAILED,
        DataLoadState.LOADING,
        DataLoadState.LOADING
      );
      assert(
        DataLoadState.NOT_LOADED,
        DataLoadState.LOADING,
        DataLoadState.LOADING
      );
      // Failed takes precedence over NOT_LOADED
      assert(
        DataLoadState.NOT_LOADED,
        DataLoadState.FAILED,
        DataLoadState.FAILED
      );
      assert(DataLoadState.LOADED, DataLoadState.FAILED, DataLoadState.FAILED);
    });
  });

  describe('#getAppLastLoadedTimeInMs', () => {
    function assert(
      runsLoadState: LoadState,
      pluginsListingLoadState: PluginsListLoadState,
      expectedTimeInMs: number | null
    ) {
      selectors.getAppLastLoadedTimeInMs.release();

      const state = createState(
        createCoreState({
          polymerRunsLoadState: runsLoadState,
          pluginsListLoaded: pluginsListingLoadState,
        })
      );
      expect(selectors.getAppLastLoadedTimeInMs(state)).toBe(expectedTimeInMs);
    }

    it('takes max of plugins listing and runs load time when both are LOADED', () => {
      assert(
        {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 3,
        },
        {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 5,
          failureCode: null,
        },
        5
      );
    });

    it('returns null when both are not loaded', () => {
      assert(
        {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        },
        {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
          failureCode: null,
        },
        null
      );
    });

    it('returns max values when both are LOADING', () => {
      assert(
        {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
        },
        {
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
          failureCode: null,
        },
        null
      );
      assert(
        {
          state: DataLoadState.LOADING,
          // This timestamp was from previously successful load.
          lastLoadedTimeInMs: 3,
        },
        {
          state: DataLoadState.LOADING,
          // This timestamp was from previously successful load.
          lastLoadedTimeInMs: 7,
          failureCode: null,
        },
        7
      );
    });

    it('returns max values when both are FAILED', () => {
      assert(
        {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
        },
        {
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
          failureCode: PluginsListFailureCode.NOT_FOUND,
        },
        null
      );
      assert(
        {
          state: DataLoadState.FAILED,
          // This timestamp was from previously successful load.
          lastLoadedTimeInMs: 3,
        },
        {
          state: DataLoadState.FAILED,
          // This timestamp was from previously successful load.
          lastLoadedTimeInMs: 7,
          failureCode: PluginsListFailureCode.NOT_FOUND,
        },
        7
      );
    });

    it('returns lower value when one of two is still loading', () => {
      assert(
        {
          state: DataLoadState.LOADING,
          // never successfully loaded before.
          lastLoadedTimeInMs: null,
        },
        {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 1,
          failureCode: null,
        },
        null
      );
      assert(
        {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 5,
        },
        {
          state: DataLoadState.LOADING,
          // previously successfully loaded at t=1
          lastLoadedTimeInMs: 1,
          failureCode: null,
        },
        1
      );
    });

    it('returns lower value when one of two has failed to load', () => {
      assert(
        {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 5,
        },
        {
          state: DataLoadState.FAILED,
          // never successfully loaded before.
          lastLoadedTimeInMs: null,
          failureCode: PluginsListFailureCode.NOT_FOUND,
        },
        null
      );
      assert(
        {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 5,
        },
        {
          state: DataLoadState.FAILED,
          // never successfully loaded before.
          lastLoadedTimeInMs: 2,
          failureCode: PluginsListFailureCode.NOT_FOUND,
        },
        2
      );
    });

    it('returns null when one is loading and another is not loaded', () => {
      assert(
        {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        },
        {
          state: DataLoadState.LOADING,
          // never successfully loaded before.
          lastLoadedTimeInMs: null,
          failureCode: null,
        },
        null
      );
      assert(
        {
          state: DataLoadState.NOT_LOADED,
          lastLoadedTimeInMs: null,
        },
        {
          state: DataLoadState.LOADING,
          // never successfully loaded before.
          lastLoadedTimeInMs: 5,
          failureCode: null,
        },
        null
      );
    });
  });
});
