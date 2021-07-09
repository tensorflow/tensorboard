/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import * as actions from './settings_actions';
import {reducers} from './settings_reducers';
import {createSettings, createSettingsState} from '../testing';
import {DataLoadState} from '../../types/data';

describe('settings reducer', () => {
  describe('#fetchSavedSettingsRequested', () => {
    it('preserves existing settings and signals settings are LOADING', () => {
      const state1 = createSettingsState({
        state: DataLoadState.NOT_LOADED,
        lastLoadedTimeInMs: null,
        settings: createSettings(),
      });
      const state2 = reducers(state1, actions.fetchSavedSettingsRequested());
      expect(state2).toEqual(
        createSettingsState({
          state: DataLoadState.LOADING,
          lastLoadedTimeInMs: null,
          settings: createSettings(),
        })
      );
    });
  });

  describe('#fetchSavedSettingsSucceeded', () => {
    it('overwrites saved settings and signals settings are LOADED', () => {
      // Mock call to Date.now();
      jasmine.clock().mockDate(new Date(1111));

      const state1 = createSettingsState({
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
        settings: createSettings({
          reloadEnabled: false,
          reloadPeriodInMs: 2222,
          pageSize: 3333,
        }),
      });
      const state2 = reducers(
        state1,
        actions.fetchSavedSettingsSucceeded({
          savedSettings: {
            reloadEnabled: true,
            pageSize: 3,
          },
        })
      );
      expect(state2).toEqual(
        createSettingsState({
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: 1111,
          settings: createSettings({
            reloadEnabled: true,
            // Note that reloadPeriodMs is not overriden since it was not
            // specified.
            reloadPeriodInMs: 2222,
            pageSize: 3,
          }),
        })
      );
    });
  });

  describe('#fetchSavedSettingsFailed', () => {
    it('preserves existing settings and signals settings are FAILED', () => {
      const state1 = createSettingsState({
        state: DataLoadState.LOADING,
        lastLoadedTimeInMs: null,
        settings: createSettings(),
      });
      const state2 = reducers(state1, actions.fetchSavedSettingsFailed());
      expect(state2).toEqual(
        createSettingsState({
          state: DataLoadState.FAILED,
          lastLoadedTimeInMs: null,
          settings: createSettings(),
        })
      );
    });
  });

  describe('#toggleReloadEnabled', () => {
    it('toggles reloadEnabled', () => {
      const state1 = createSettingsState({
        settings: createSettings({reloadEnabled: false}),
      });

      const state2 = reducers(state1, actions.toggleReloadEnabled());

      expect(state2.settings.reloadEnabled).toBe(true);

      const state3 = reducers(state2, actions.toggleReloadEnabled());

      expect(state3.settings.reloadEnabled).toBe(false);
    });

    it('does not toggle reloadEnabled if settings not loaded', () => {
      const state1 = createSettingsState({
        state: DataLoadState.NOT_LOADED,
        settings: createSettings({reloadEnabled: false}),
      });
      const state2 = reducers(state1, actions.toggleReloadEnabled());
      expect(state2.settings.reloadEnabled).toBe(false);
    });

    it('does not toggle reloadEnabled if settings loading', () => {
      const state1 = createSettingsState({
        state: DataLoadState.LOADING,
        settings: createSettings({reloadEnabled: false}),
      });
      const state2 = reducers(state1, actions.toggleReloadEnabled());
      expect(state2.settings.reloadEnabled).toBe(false);
    });

    it('toggles reloadEnabled if settings failed to load', () => {
      const state1 = createSettingsState({
        state: DataLoadState.FAILED,
        settings: createSettings({reloadEnabled: false}),
      });
      const state2 = reducers(state1, actions.toggleReloadEnabled());
      expect(state2.settings.reloadEnabled).toBe(true);
    });
  });

  describe('#changeReloadPeriod', () => {
    it('sets the reloadPeriodInMs', () => {
      const state = createSettingsState({
        settings: createSettings({reloadPeriodInMs: 1}),
      });

      const nextState = reducers(
        state,
        actions.changeReloadPeriod({periodInMs: 1000})
      );

      expect(nextState.settings.reloadPeriodInMs).toBe(1000);
    });

    it('ignores the action when periodInMs is non-positive', () => {
      const baseState = createSettingsState({
        settings: createSettings({reloadPeriodInMs: 1}),
      });

      const state1 = reducers(
        baseState,
        actions.changeReloadPeriod({periodInMs: 0})
      );
      expect(state1.settings.reloadPeriodInMs).toBe(1);

      const state2 = reducers(
        baseState,
        actions.changeReloadPeriod({periodInMs: -1000})
      );
      expect(state2.settings.reloadPeriodInMs).toBe(1);
    });

    it('does not set the reloadPeriodInMs when settings not loaded', () => {
      const state = createSettingsState({
        state: DataLoadState.LOADING,
        settings: createSettings({reloadPeriodInMs: 1}),
      });

      const nextState = reducers(
        state,
        actions.changeReloadPeriod({periodInMs: 1000})
      );

      expect(nextState.settings.reloadPeriodInMs).toBe(1);
    });
  });

  describe('#changePageSize', () => {
    it('sets pageSize', () => {
      const state = createSettingsState({
        settings: createSettings({pageSize: 1}),
      });

      const nextState = reducers(state, actions.changePageSize({size: 400}));

      expect(nextState.settings.pageSize).toBe(400);
    });

    it('does not set the reloadPeriodInMs when settings not loaded', () => {
      const state = createSettingsState({
        state: DataLoadState.LOADING,
        settings: createSettings({pageSize: 1}),
      });

      const nextState = reducers(state, actions.changePageSize({size: 400}));

      expect(nextState.settings.pageSize).toBe(1);
    });
  });
});
