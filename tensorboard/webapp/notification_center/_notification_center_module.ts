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
import {NgModule} from '@angular/core';
import {EffectsModule} from '@ngrx/effects';
import {createSelector, StoreModule} from '@ngrx/store';
import {
  PersistableSettings,
  PersistentSettingsConfigModule,
} from '../persistent_settings';
import {NotificationCenterDataSourceModule} from './_data_source';
import {NotificationCenterEffects} from './_redux/notification_center_effects';
import {reducers} from './_redux/notification_center_reducers';
import {getLastReadTime} from './_redux/notification_center_selectors';
import {
  NOTIFICATION_FEATURE_KEY,
  State,
} from './_redux/notification_center_types';
import {NotificationCenterViewModule} from './_views/views_module';

export function getNotificationLastReadTimeSettingSelector() {
  return createSelector(getLastReadTime, (lastReadTime) => {
    return {notificationLastReadTimeInMs: lastReadTime};
  });
}

@NgModule({
  imports: [
    StoreModule.forFeature(NOTIFICATION_FEATURE_KEY, reducers),
    EffectsModule.forFeature([NotificationCenterEffects]),
    NotificationCenterDataSourceModule,
    NotificationCenterViewModule,
    PersistentSettingsConfigModule.defineGlobalSetting<
      State,
      PersistableSettings
    >(getNotificationLastReadTimeSettingSelector),
  ],
  exports: [NotificationCenterViewModule],
})
export class NotificationCenterModule {}
