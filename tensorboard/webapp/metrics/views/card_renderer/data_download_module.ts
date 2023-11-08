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
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {FeatureFlagDirectiveModule} from '../../../feature_flag/directives/feature_flag_directive_module';
import {MetricsDataSourceModule} from '../../data_source';
import {DataDownloadDialogComponent} from './data_download_dialog_component';
import {DataDownloadDialogContainer} from './data_download_dialog_container';

@NgModule({
  declarations: [DataDownloadDialogContainer, DataDownloadDialogComponent],
  exports: [DataDownloadDialogContainer],
  imports: [
    CommonModule,
    FeatureFlagDirectiveModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
    MetricsDataSourceModule,
  ],
})
export class DataDownloadModule {}
