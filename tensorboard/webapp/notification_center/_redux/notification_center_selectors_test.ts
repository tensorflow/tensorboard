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
import * as selectors from './notification_center_selectors';
import {CategoryEnum} from './notification_center_types';
import {
  buildNotificationState,
  buildStateFromNotificationState,
} from './testing';

describe('notification_center_selectors', () => {
  describe('getNotification', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getNotifications.release();
      selectors.getLastReadTime.release();
    });

    it('returns empty list when there is no notification', () => {
      const state = buildStateFromNotificationState(
        buildNotificationState({
          notifications: [],
        })
      );
      expect(selectors.getNotifications(state)).toEqual([]);
    });

    it('returns the notifications', () => {
      const state = buildStateFromNotificationState(
        buildNotificationState({
          notifications: [
            {
              category: CategoryEnum.NONE,
              dateInMs: 1579766400000,
              title: 'test title',
              content: '<li>test</li>',
            },
          ],
        })
      );
      expect(selectors.getNotifications(state)).toEqual([
        {
          category: CategoryEnum.NONE,
          dateInMs: 1579766400000,
          title: 'test title',
          content: '<li>test</li>',
        },
      ]);
    });

    it('returns last read null timestamp', () => {
      const state = buildStateFromNotificationState(
        buildNotificationState(buildNotificationState({}))
      );

      expect(selectors.getLastReadTime(state)).toBe(-1);
    });

    it('returns last read non-null timestamp', () => {
      const state = buildStateFromNotificationState(
        buildNotificationState({
          lastReadTimestampInMs: 1235813,
        })
      );

      expect(selectors.getLastReadTime(state)).toBe(1235813);
    });
  });
});
