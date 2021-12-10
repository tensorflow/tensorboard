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
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {EffectsModule} from '@ngrx/effects';
import {StoreModule} from '@ngrx/store';
import {PluginRegistryModule} from '../../plugins/plugin_registry_module';
import {NpmiServerDataSourceModule} from './data_source/npmi_data_source_module';
import {NpmiEffects} from './effects';
import {NpmiComponent} from './npmi_component';
import {NpmiContainer} from './npmi_container';
import {reducers} from './store/npmi_reducers';
import {NPMI_FEATURE_KEY} from './store/npmi_types';
import {EmbeddingsModule} from './views/embeddings/embeddings_module';
import {InactiveModule} from './views/inactive/inactive_module';
import {MainModule} from './views/main/main_module';

@NgModule({
  declarations: [NpmiComponent, NpmiContainer],
  imports: [
    CommonModule,
    InactiveModule,
    MainModule,
    EmbeddingsModule,
    NpmiServerDataSourceModule,
    StoreModule.forFeature(NPMI_FEATURE_KEY, reducers),
    EffectsModule.forFeature([NpmiEffects]),
    PluginRegistryModule.forPlugin('npmi', NpmiContainer),
  ],
  exports: [NpmiContainer],
  entryComponents: [NpmiContainer],
})
export class NpmiModule {}
