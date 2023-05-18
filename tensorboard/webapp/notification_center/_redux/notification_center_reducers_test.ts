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
import * as notificationActions from './notification_center_actions';
import * as notificationReducers from './notification_center_reducers';
import {buildNotification, buildNotificationState} from './testing';

describe('notification reducers', () => {
  describe('#fetchNotificationsLoaded', () => {
    it('sets notifications from the new data', () => {
      const state1 = buildNotificationState({
        notifications: [buildNotification({title: 'title1'})],
      });

      const state2 = notificationReducers.reducers(
        state1,
        notificationActions.fetchNotificationsLoaded({
          notifications: [
            buildNotification({title: 'new_title1'}),
            buildNotification({title: 'new_title2'}),
          ],
        })
      );
      expect(state2.notifications).toEqual([
        buildNotification({title: 'new_title1'}),
        buildNotification({title: 'new_title2'}),
      ]);
    });
  });

  describe('#notificationBellClicked', () => {
    it('sets lastReadTimestampInMs to current after bell icon clicked', () => {
      spyOn(Date, 'now').and.returnValue(1000);
      const action1 = notificationActions.notificationBellClicked();
      const state1 = buildNotificationState({
        lastReadTimestampInMs: 0,
      });

      const state2 = notificationReducers.reducers(state1, action1);
      expect(state2.lastReadTimestampInMs).toBe(1000);
    });
  });

  describe('#persistentSettingsLoaded', () => {
    it('sets lastReadTimestampInMs if its related state is present', () => {
      const state1 = buildNotificationState({
        lastReadTimestampInMs: 0,
      });

      const state2 = notificationReducers.reducers(
        state1,
        persistentSettingsLoaded({
          partialSettings: {
            notificationLastReadTimeInMs: 500,
          },
        })
      );
      expect(state2.lastReadTimestampInMs).toBe(500);
    });

    it('ignores `notificationLastReadTimeInMs` if it is not a number', () => {
      const state1 = buildNotificationState({
        lastReadTimestampInMs: 1337,
      });

      const state2 = notificationReducers.reducers(
        state1,
        persistentSettingsLoaded({
          partialSettings: {
            notificationLastReadTimeInMs: NaN,
          },
        })
      );
      expect(state2.lastReadTimestampInMs).toBe(1337);

      const state3 = notificationReducers.reducers(
        state2,
        persistentSettingsLoaded({
          partialSettings: {},
        })
      );
      expect(state3.lastReadTimestampInMs).toBe(1337);
    });
  });
});
