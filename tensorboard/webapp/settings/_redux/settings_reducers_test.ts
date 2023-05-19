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
import {persistentSettingsLoaded} from '../../persistent_settings';
import {DataLoadState} from '../../types/data';
import {createSettings, createSettingsState} from '../testing';
import * as actions from './settings_actions';
import {reducers} from './settings_reducers';

describe('settings reducer', () => {
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
        actions.changeReloadPeriod({periodInMs: 50000})
      );

      expect(nextState.settings.reloadPeriodInMs).toBe(50000);
    });

    it('takes the minimum value, 30 seconds', () => {
      const state = createSettingsState({
        settings: createSettings({reloadPeriodInMs: 1}),
      });

      const nextState = reducers(
        state,
        actions.changeReloadPeriod({periodInMs: 30000})
      );

      expect(nextState.settings.reloadPeriodInMs).toBe(30000);
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

    it('ignroes the action when new time is smaller than minimum value', () => {
      const state = createSettingsState({
        settings: createSettings({reloadPeriodInMs: 50000}),
      });

      const nextState = reducers(
        state,
        actions.changeReloadPeriod({periodInMs: 5000})
      );

      expect(nextState.settings.reloadPeriodInMs).toBe(50000);
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

  describe('#persistentSettingsLoaded', () => {
    it('loads settings from the persistent settings storage', () => {
      const state = createSettingsState({
        state: DataLoadState.LOADING,
        settings: createSettings({
          pageSize: 1,
          reloadEnabled: false,
          reloadPeriodInMs: 100,
        }),
      });

      const nextState = reducers(
        state,
        persistentSettingsLoaded({
          partialSettings: {
            autoReloadPeriodInMs: 50000,
            pageSize: 10,
          },
        })
      );

      expect(nextState.settings.pageSize).toBe(10);
      expect(nextState.settings.reloadEnabled).toBe(false);
      expect(nextState.settings.reloadPeriodInMs).toBe(50000);
    });

    it('sanitizes the settings value', () => {
      const state = createSettingsState({
        state: DataLoadState.LOADING,
        settings: createSettings({
          pageSize: 1,
          reloadPeriodInMs: 60000,
        }),
      });

      const nextState = reducers(
        state,
        persistentSettingsLoaded({
          partialSettings: {
            autoReloadPeriodInMs: 10,
            pageSize: NaN,
          },
        })
      );

      expect(nextState.settings.pageSize).toBe(1);
      expect(nextState.settings.reloadPeriodInMs).toBe(60000);
    });
  });
});
