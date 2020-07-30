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

import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
//import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';

import {TagGroupModule} from './views/tag_group/tag_group_module';
import {Tftext2ServerDataSourceModule} from './data_source/tftext2_data_source_module';
import {TextComponent} from './text_component';
import {TextContainer} from './text_container';
import {TextEffects} from './effects';
//import {TEXT_FEATURE_KEY} from './store/text_types';
//import {TextReducers} from './store/text_reducers';
import {PluginRegistryModule} from '../plugin_registry_module';

@NgModule({
  declarations: [TextComponent, TextContainer],
  imports: [
    CommonModule,
    TagGroupModule,
    // StoreModule.forFeature(TEXT_FEATURE_KEY, TextReducers),
    Tftext2ServerDataSourceModule,
    EffectsModule.forFeature([TextEffects]),
    PluginRegistryModule.forPlugin('text_v2', TextContainer),
  ],
  exports: [TextContainer],
  entryComponents: [TextContainer],
})
export class TextModule {}
