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
import {Notification} from '../_redux/notification_center_types';
import {notificationNotes} from './notification_notes';

type StringDict = {
  [key: string]: string;
};
const iconMap: StringDict = {
  "What's New": 'info_outline_24px',
};

@Component({
  selector: 'notification-center',
  template: `
    <notification-center-component
      [notifications]="notifications"
      [dateStringList]="dateStringList"
      [iconList]="iconList"
    ></notification-center-component>
  `,
})
export class NotificationCenterContainer {
  notifications: Notification[] = notificationNotes;
  dateStringList: string[] = [];
  iconList: string[] = [];

  ngOnInit() {
    for (let notfication of this.notifications) {
      const dateObj = new Date(notfication.date);
      const month = dateObj.toLocaleString('en-US', {month: 'long'});
      const date = dateObj.getDate();
      const year = dateObj.getFullYear();
      this.dateStringList.push(`${month} ${date} ${year}`);
      this.iconList.push(iconMap[notfication.category]);
    }
  }
}
