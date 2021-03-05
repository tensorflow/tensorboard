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
import {Component} from '@angular/core';
import {ViewNotification, ViewNotificationExt} from './view_types';
import {notificationNotes} from './notification_notes';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {CategoryEnum} from '../_redux/notification_center_types';

const iconMap = new Map([[CategoryEnum.WHATS_NEW, 'info_outline_24px']]);

@Component({
  selector: 'notification-center',
  template: `
    <notification-center-component
      [aaanotifications]="notificationNotes$ | async"
    ></notification-center-component>
  `,
})
export class NotificationCenterContainer {
  /*readonly notificationNotes$: Observable<ViewNotificationExt[]> = from(
    notificationNotes as ViewNotificationExt[]
  ).pipe(
    map((notification) => {
      const viewnotification: ViewNotificationExt = notification;
      viewnotification.icon = iconMap.get(notification.category)!;
      return viewnotification;
    })
  );*/

  // This is okay
  // readonly notificationNotes$: ViewNotificationExt[] = notificationNotes;
  // Type 'ViewNotificationExt' is missing the following properties from type 'ViewNotificationExt[]': length, pop, push, concat, and 28 more.
  readonly notificationNotes$: Observable<ViewNotificationExt[]> = from(
    notificationNotes
  );
}
