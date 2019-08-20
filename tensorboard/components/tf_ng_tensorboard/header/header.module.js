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
        define("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/header/header.module", ["require", "exports", "@angular/core", "@angular/common", "@angular/material/tabs", "@angular/material/toolbar", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/header/containers/header.component", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.module"], factory);
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
    const core_1 = require("@angular/core");
    // Uses `async` pipe.
    const common_1 = require("@angular/common");
    const tabs_1 = require("@angular/material/tabs");
    const toolbar_1 = require("@angular/material/toolbar");
    const header_component_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/header/containers/header.component");
    const core_module_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.module");
    let HeaderModule = class HeaderModule {
    };
    HeaderModule = __decorate([
        core_1.NgModule({
            declarations: [header_component_1.HeaderComponent],
            exports: [header_component_1.HeaderComponent],
            providers: [],
            imports: [toolbar_1.MatToolbarModule, tabs_1.MatTabsModule, common_1.CommonModule, core_module_1.CoreModule],
        })
    ], HeaderModule);
    exports.HeaderModule = HeaderModule;
});
