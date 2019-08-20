var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/app.module", ["require", "exports", "@angular/platform-browser", "@angular/platform-browser/animations", "@angular/core", "@ngrx/store", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/app.component", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.module", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/reducers", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/header/header.module"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    const platform_browser_1 = require("@angular/platform-browser");
    const animations_1 = require("@angular/platform-browser/animations");
    const core_1 = require("@angular/core");
    const store_1 = require("@ngrx/store");
    const app_component_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/app.component");
    const core_module_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.module");
    const reducers_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/reducers");
    const header_module_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/header/header.module");
    let AppModule = class AppModule {
    };
    AppModule = __decorate([
        core_1.NgModule({
            declarations: [app_component_1.AppComponent],
            imports: [
                platform_browser_1.BrowserModule,
                animations_1.BrowserAnimationsModule,
                core_module_1.CoreModule,
                header_module_1.HeaderModule,
                store_1.StoreModule.forRoot(reducers_1.ROOT_REDUCERS, {
                    metaReducers: reducers_1.metaReducers,
                    runtimeChecks: {
                        strictStateImmutability: true,
                        strictActionImmutability: true,
                        strictStateSerializability: true,
                        strictActionSerializability: true,
                    },
                }),
            ],
            providers: [],
            bootstrap: [app_component_1.AppComponent],
        })
    ], AppModule);
    exports.AppModule = AppModule;
});
