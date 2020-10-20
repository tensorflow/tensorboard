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
import * as selectors from './alert_selectors';
import {buildAlertState, buildStateFromAlertState} from './testing';

describe('alert_selectors', () => {
  describe('getAlert', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getLatestAlert.release();
    });

    it('returns null when there is no alert', () => {
      const state = buildStateFromAlertState(
        buildAlertState({
          latestAlert: null,
        })
      );
      expect(selectors.getLatestAlert(state)).toBe(null);
    });

    it('returns the current alert', () => {
      const state = buildStateFromAlertState(
        buildAlertState({
          latestAlert: {
            localizedMessage: 'The sky is orange',
            created: 2020,
          },
        })
      );
      expect(selectors.getLatestAlert(state)).toEqual({
        localizedMessage: 'The sky is orange',
        created: 2020,
      });
    });
  });
});
