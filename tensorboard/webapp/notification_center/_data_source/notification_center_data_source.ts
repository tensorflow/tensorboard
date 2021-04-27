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
import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';

import {TBHttpClient} from '../../webapp_data_source/tb_http_client';
import {
  NotificationCenterDataSource,
  NotificationCenterResponse,
  NOTIFICATION_LAST_READ_TIME_KEY,
} from './backend_types';

/**
 * An implementation of NotificationCenterDataSource that fetchs notifications.
 */
@Injectable()
export class TBNotificationCenterDataSource
  implements NotificationCenterDataSource {
  constructor(private readonly http: TBHttpClient) {}

  fetchNotifications(): Observable<NotificationCenterResponse> {
    return this.http.get<NotificationCenterResponse>(`data/notifications`);
  }

  updateLastReadTimeStampToNow(): Observable<number> {
    const timeNow = Date.now();
    window.localStorage.setItem(
      NOTIFICATION_LAST_READ_TIME_KEY,
      timeNow.toString()
    );
    return of(timeNow);
  }

  getLastReadTimeStampInMs(): Observable<number> {
    const lastReadTime =
      window.localStorage.getItem(NOTIFICATION_LAST_READ_TIME_KEY) ?? '-1';
    return of(Number(lastReadTime));
  }
}
