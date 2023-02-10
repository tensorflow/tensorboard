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
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {PluginApiHostModule} from '../components/experimental/plugin_util/plugin_api_host_module';
import {AlertModule} from './alert/alert_module';
import {AlertSnackbarModule} from './alert/views/alert_snackbar_module';
import {AppContainer} from './app_container';
import {AppRoutingModule} from './app_routing/app_routing_module';
import {RouteRegistryModule} from './app_routing/route_registry_module';
import {AppRoutingViewModule} from './app_routing/views/app_routing_view_module';
import {CoreModule} from './core/core_module';
import {DarkModeSupportModule} from './core/views/dark_mode_supporter_module';
import {HashStorageModule} from './core/views/hash_storage_module';
import {PageTitleModule} from './core/views/page_title_module';
import {ExperimentsModule} from './experiments/experiments_module';
import {FeatureFlagModule} from './feature_flag/feature_flag_module';
import {FeatureFlagModalTriggerModule} from './feature_flag/views/feature_flag_modal_trigger_module';
import {HeaderModule} from './header/header_module';
import {HparamsModule} from './hparams/hparams_module';
import {MatIconModule} from './mat_icon_module';
import {OssPluginsModule} from './oss_plugins_module';
import {PersistentSettingsModule} from './persistent_settings';
import {PluginsModule} from './plugins/plugins_module';
import {routesFactory} from './routes';
import {RunsModule} from './runs/runs_module';
import {SettingsModule} from './settings/settings_module';
import {StoreModule} from './store_module';
import {TensorBoardWrapperModule} from './tb_wrapper/tb_wrapper_module';

@NgModule({
  declarations: [AppContainer],
  imports: [
    // Ensure feature flags are enabled before they are consumed.
    FeatureFlagModule,
    FeatureFlagModalTriggerModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    AppRoutingViewModule,
    RouteRegistryModule.registerRoutes(routesFactory),
    AlertModule,
    AlertSnackbarModule,
    DarkModeSupportModule,
    TensorBoardWrapperModule,
    CoreModule,
    ExperimentsModule,
    HashStorageModule,
    HeaderModule,
    HparamsModule,
    MatIconModule,
    PageTitleModule,
    PersistentSettingsModule,
    PluginApiHostModule,
    PluginsModule,
    RunsModule,
    SettingsModule,
    StoreModule,
    OssPluginsModule,
  ],
  bootstrap: [AppContainer],
})
export class AppModule {}
