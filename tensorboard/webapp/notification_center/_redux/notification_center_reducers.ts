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
import {Action, createReducer, on} from '@ngrx/store';
import {persistentSettingsLoaded} from '../../persistent_settings';
import * as actions from './notification_center_actions';
import {Notification, NotificationState} from './notification_center_types';

const initialState: NotificationState = {
  notifications: [],
  lastReadTimestampInMs: null,
};

const reducer = createReducer(
  initialState,
  on(
    actions.fetchNotificationsLoaded,
    (
      state: NotificationState,
      {notifications}: {notifications: Notification[]}
    ): NotificationState => {
      return {...state, notifications};
    }
  ),
  on(
    actions.notificationBellClicked,
    (state: NotificationState): NotificationState => {
      return {
        ...state,
        lastReadTimestampInMs: Date.now(),
      };
    }
  ),
  on(
    persistentSettingsLoaded,
    (state: NotificationState, {partialSettings}): NotificationState => {
      if (
        typeof partialSettings.notificationLastReadTimeInMs === 'undefined' ||
        !Number.isFinite(partialSettings.notificationLastReadTimeInMs)
      ) {
        return state;
      }
      return {
        ...state,
        lastReadTimestampInMs: partialSettings.notificationLastReadTimeInMs,
      };
    }
  )
);

export function reducers(state: NotificationState | undefined, action: Action) {
  return reducer(state, action);
}
