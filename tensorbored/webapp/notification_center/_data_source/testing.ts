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
import {of} from 'rxjs';
import {
  BackendNotification,
  NotificationCenterDataSource,
  NotificationCenterResponse,
} from './backend_types';

@Injectable()
export class TestingNotificationCenterDataSource
  implements NotificationCenterDataSource
{
  fetchNotifications() {
    return of({
      notifications: [],
    });
  }

  updateLastReadTimeStampToNow() {
    return of(123);
  }

  getLastReadTimeStampInMs() {
    return of(456);
  }
}

export function provideTestingNotificationCenterDataSource() {
  return [
    TestingNotificationCenterDataSource,
    {
      provide: NotificationCenterDataSource,
      useExisting: TestingNotificationCenterDataSource,
    },
  ];
}

export function buildNotification(
  override: Partial<BackendNotification> = {}
): BackendNotification {
  return {
    dateInMs: 123,
    title: 'test title',
    content: 'random content',
    ...override,
  };
}

export function buildNotificationResponse(
  notifications?: BackendNotification[]
): NotificationCenterResponse {
  return {
    notifications: notifications ?? [buildNotification()],
  };
}
