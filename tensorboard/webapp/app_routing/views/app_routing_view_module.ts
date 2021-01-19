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

import {RouteRegistryModule} from '../route_registry_module';

import {RouterLinkDirectiveContainer} from './router_link_directive_container';
import {RouterOutletComponent} from './router_outlet_component';
import {RouterOutletContainer} from './router_outlet_container';
import {LocationModule} from '../location_module';
import {AppRootModule} from '../app_root_module';

@NgModule({
  imports: [CommonModule, AppRootModule, LocationModule, RouteRegistryModule],
  exports: [RouterOutletContainer, RouterLinkDirectiveContainer],
  declarations: [
    RouterOutletContainer,
    RouterOutletComponent,
    RouterLinkDirectiveContainer,
  ],
})
export class AppRoutingViewModule {}
