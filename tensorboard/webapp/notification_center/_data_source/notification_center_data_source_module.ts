/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {TBHttpClientModule} from '../../webapp_data_source/tb_http_client_module';
import {NotificationCenterDataSource} from './backend_types';
import {TBNotificationCenterDataSource} from './notification_center_data_source';

@NgModule({
  imports: [TBHttpClientModule],
  providers: [
    {
      provide: NotificationCenterDataSource,
      useClass: TBNotificationCenterDataSource,
    },
  ],
})
export class NotificationCenterDataSourceModule {}
