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
import {Store} from '@ngrx/store';
import {combineLatest, Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {State} from '../../app_state';
import * as actions from '../_redux/notification_center_actions';
import {
  getLastReadTime,
  getNotifications,
} from '../_redux/notification_center_selectors';
import {CategoryEnum} from '../_redux/notification_center_types';
import {ViewNotificationExt} from './view_types';

const iconMap = new Map([[CategoryEnum.WHATS_NEW, 'info_outline_24px']]);

@Component({
  standalone: false,
  selector: 'notification-center',
  template: `
    <notification-center-component
      [notifications]="notificationNotes$ | async"
      [hasUnreadMessages]="hasUnreadMessages$ | async"
      (bellButtonClicked)="onBellButtonClicked()"
    ></notification-center-component>
  `,
})
export class NotificationCenterContainer {
  readonly notificationNotes$: Observable<ViewNotificationExt[]>;

  readonly hasUnreadMessages$;

  constructor(private readonly store: Store<State>) {
    this.notificationNotes$ = combineLatest([
      this.store.select(getNotifications),
      this.store.select(getLastReadTime),
    ]).pipe(
      map(([notifications, lastReadTimestampInMs]) => {
        return notifications.map((notification) => {
          return {
            ...notification,
            hasRead: notification.dateInMs < lastReadTimestampInMs,
            icon: iconMap.get(notification.category) ?? null,
          };
        });
      }),
      shareReplay()
    );
    this.hasUnreadMessages$ = this.notificationNotes$.pipe(
      map((notifications) => {
        return notifications.some(({hasRead}) => !hasRead);
      })
    );
  }

  onBellButtonClicked() {
    this.store.dispatch(actions.notificationBellClicked());
  }
}
