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
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CategoryEnum} from '../_redux/notification_center_types';
import {ViewNotificationExt} from './view_types';

@Component({
  standalone: false,
  selector: 'notification-center-component',
  templateUrl: './notification_center_component.ng.html',
  styleUrls: ['./notification_center_component.css'],
})
export class NotificationCenterComponent {
  readonly CategoryEnum = CategoryEnum;

  @Input() notifications!: ViewNotificationExt[];
  @Input() hasUnreadMessages!: boolean;

  @Output() bellButtonClicked = new EventEmitter<void>();
}
