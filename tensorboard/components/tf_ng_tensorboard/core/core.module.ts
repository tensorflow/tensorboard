/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {HttpClientModule} from '@angular/common/http';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';

import {CORE_FEATURE_KEY, reducers} from './core.reducers';
import {CoreService} from './core.service';
import {CoreEffects} from './core.effects';

@NgModule({
  imports: [
    HttpClientModule,
    StoreModule.forFeature(CORE_FEATURE_KEY, reducers),
    EffectsModule.forFeature([CoreEffects]),
  ],
  providers: [CoreService],
})
export class CoreModule {}
