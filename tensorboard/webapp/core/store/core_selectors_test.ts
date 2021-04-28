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
import {DataLoadState} from '../../types/data';
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
      runsLastLoadedTimeInMs: number | null,
      pluginsListingLastLoadedTimeInMs: number | null,
      expectedTimeInMs: number | null
    ) {
      selectors.getAppLastLoadedTimeInMs.release();

      const state = createState(
        createCoreState({
          polymerRunsLoadState: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: runsLastLoadedTimeInMs,
          },
          pluginsListLoaded: {
            state: DataLoadState.LOADED,
            lastLoadedTimeInMs: pluginsListingLastLoadedTimeInMs,
            failureCode: null,
          },
        })
      );
      expect(selectors.getAppLastLoadedTimeInMs(state)).toBe(expectedTimeInMs);
    }

    it('combines data load time of plugins listing and runs by taking max', () => {
      assert(2, 3, 3);
      assert(1, null, 1);
      assert(null, 5, 5);
      assert(null, null, null);
    });
  });
});
