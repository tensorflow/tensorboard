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
import * as notificationActions from './notification_center_actions';
import * as notificationReducers from './notification_center_reducers';
import {buildNotificationState} from './testing';

describe('notification reducers', () => {
  it('sets lastReadTimestampInMs to current after bell icon clicked', () => {
    const action1 = notificationActions.notificationBellClicked();
    const state1 = buildNotificationState({
      notifications: [],
      lastReadTimestampInMs: 0,
    });

    const state2 = notificationReducers.reducers(state1, action1);
    expect(state2.lastReadTimestampInMs).toBeLessThanOrEqual(Date.now());
  });
});
