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
import {
  createSettingsState,
} from '../testing';


describe('settings reducer', () => {
  describe('#toggleReloadEnabled', () => {
    it('toggles reloadEnabled', () => {
      const state1 = createSettingsState({reloadEnabled: false});

      const state2 = reducers(state1, actions.toggleReloadEnabled());

      expect(state2.reloadEnabled).toBe(true);

      const state3 = reducers(state2, actions.toggleReloadEnabled());

      expect(state3.reloadEnabled).toBe(false);
    });
  });

  describe('#changeReloadPeriod', () => {
    it('sets the reloadPeriodInMs', () => {
      const state = createSettingsState({reloadPeriodInMs: 1});

      const nextState = reducers(
        state,
        actions.changeReloadPeriod({periodInMs: 1000})
      );

      expect(nextState.reloadPeriodInMs).toBe(1000);
    });

    it('ignores the action when periodInMs is non-positive', () => {
      const baseState = createSettingsState({reloadPeriodInMs: 1});

      const state1 = reducers(
        baseState,
        actions.changeReloadPeriod({periodInMs: 0})
      );
      expect(state1.reloadPeriodInMs).toBe(1);

      const state2 = reducers(
        baseState,
        actions.changeReloadPeriod({periodInMs: -1000})
      );
      expect(state2.reloadPeriodInMs).toBe(1);
    });
  });
});
