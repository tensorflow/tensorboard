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
import {AppRoutingModule} from '../../../webapp/app_routing/app_routing_module';
import {CoreModule} from '../../../webapp/core/core_module';
import {RunsModule} from '../../../webapp/runs/runs_module';
import {PluginCoreApiHostImpl} from './core-host-impl';
import {Ipc, registerPluginIframe} from './plugin-host-ipc';
import {PluginRunsApiHostImpl} from './runs-host-impl';

@NgModule({
  providers: [Ipc, PluginCoreApiHostImpl, PluginRunsApiHostImpl],
  imports: [AppRoutingModule, CoreModule, RunsModule],
})
export class PluginApiHostModule {
  constructor(
    runsImpl: PluginRunsApiHostImpl,
    coreImpl: PluginCoreApiHostImpl
  ) {
    coreImpl.init();
    runsImpl.init();
  }

  registerPluginIframe(iframe: HTMLIFrameElement, pluginId: string): void {
    registerPluginIframe(iframe, pluginId);
  }
}
