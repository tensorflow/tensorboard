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
export {HttpTestingController} from '@angular/common/http/testing';

import {HttpClientTestingModule} from '@angular/common/http/testing';
import {NgModule} from '@angular/core';
import {provideMockStore} from '@ngrx/store/testing';
import {
  buildFeatureFlagState,
  buildState as buildFeatureFlagAppState,
} from '../feature_flag/store/testing';
import {TBHttpClientModule} from './tb_http_client_module';

@NgModule({
  imports: [TBHttpClientModule, HttpClientTestingModule],
  providers: [
    provideMockStore({
      initialState: buildFeatureFlagAppState(
        buildFeatureFlagState({
          isFeatureFlagsLoaded: true,
        })
      ),
    }),
  ],
  jit: true,
})
export class TBHttpClientTestingModule {}
