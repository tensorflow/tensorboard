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
import {EffectsModule} from '@ngrx/effects';
import {StoreModule} from '@ngrx/store';
import {CoreModule} from '../../../webapp/core/core_module';
import {PluginRegistryModule} from '../../../webapp/plugins/plugin_registry_module';
import {Tfdbg2ServerDataSourceModule} from './data_source/tfdbg2_data_source_module';
import {DebuggerComponent} from './debugger_component';
import {DebuggerContainer} from './debugger_container';
import {DebuggerEffects} from './effects';
import {reducers} from './store/debugger_reducers';
import {DEBUGGER_FEATURE_KEY} from './store/debugger_types';
import {PLUGIN_ID} from './types';
import {AlertsModule} from './views/alerts/alerts_module';
import {GraphModule} from './views/graph/graph_module';
import {GraphExecutionsModule} from './views/graph_executions/graph_executions_module';
import {InactiveModule} from './views/inactive/inactive_module';
import {SourceFilesModule} from './views/source_files/source_files_module';
import {StackTraceModule} from './views/stack_trace/stack_trace_module';
import {TimelineModule} from './views/timeline/timeline_module';

@NgModule({
  declarations: [DebuggerComponent, DebuggerContainer],
  imports: [
    AlertsModule,
    CommonModule,
    CoreModule,
    GraphExecutionsModule,
    GraphModule,
    InactiveModule,
    SourceFilesModule,
    StackTraceModule,
    Tfdbg2ServerDataSourceModule,
    TimelineModule,
    StoreModule.forFeature(DEBUGGER_FEATURE_KEY, reducers),
    EffectsModule.forFeature([DebuggerEffects]),
    PluginRegistryModule.forPlugin(PLUGIN_ID, DebuggerContainer),
  ],
  exports: [DebuggerContainer],
})
export class DebuggerModule {}
