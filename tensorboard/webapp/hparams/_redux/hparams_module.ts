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
import {NgModule} from '@angular/core';
import {StoreModule} from '@ngrx/store';
import {reducers} from './hparams_reducers';
import {HPARAMS_FEATURE_KEY} from './types';
import {EffectsModule} from '@ngrx/effects';
import {HparamsEffects} from './hparams_effects';
import {HparamsDataSource} from './hparams_data_source';

@NgModule({
  providers: [HparamsDataSource],
  imports: [
    StoreModule.forFeature(HPARAMS_FEATURE_KEY, reducers),
    EffectsModule.forFeature([HparamsEffects]),
  ],
})
export class HparamsModule {}
