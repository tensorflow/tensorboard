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
import {EffectsModule as NgrxEffectsModule} from '@ngrx/effects';
import {META_REDUCERS, StoreModule as NgrxStoreModule} from '@ngrx/store';
import {loggerMetaReducerFactory, ROOT_REDUCERS} from './reducer_config';

@NgModule({
  imports: [
    NgrxStoreModule.forRoot(ROOT_REDUCERS, {
      runtimeChecks: {
        strictStateImmutability: true,
        strictActionImmutability: true,
        // We use `Map` and `Set`. Remember not to abuse it and
        // introduce too many class instances with many instance methods.
        strictActionSerializability: false,
        strictStateSerializability: false,
      },
    }),
    NgrxEffectsModule.forRoot([]),
  ],
  providers: [
    {
      provide: META_REDUCERS,
      useFactory: loggerMetaReducerFactory,
      multi: true,
    },
  ],
})
export class StoreModule {}
