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

import {
  TBFeatureFlagDataSource,
  TbFeatureFlagDataSources,
} from './tb_feature_flag_data_source_types';
import {
  MediaQueryFeatureFlagDataSource,
  QueryParamsFeatureFlagDataSource,
} from './tb_feature_flag_data_source';

@NgModule({
  providers: [
    // TODO(stephanwlee): remove below comments when TensorBoard mostly looks
    // okay with dark mode enabled automatically based on the media query.
    // {
    //   provide: TBFeatureFlagDataSources,
    //   useClass: MediaQueryFeatureFlagDataSource,
    //   multi: true,
    // },
    // QueryParameter provider should appear the last as it should
    // override feature flags from any other sources.
    {
      provide: TBFeatureFlagDataSource,
      useClass: QueryParamsFeatureFlagDataSource,
    },
    {
      provide: TbFeatureFlagDataSources,
      useExisting: TBFeatureFlagDataSource,
      multi: true,
    },
  ],
})
export class TBFeatureFlagModule {}
