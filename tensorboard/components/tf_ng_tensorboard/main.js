(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/main", ["require", "exports", "@angular/core", "@angular/platform-browser", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/app.module.ngfactory", "zone.js/dist/zone.js"], factory);
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
    const platform_browser_1 = require("@angular/platform-browser");
    const app_module_ngfactory_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/app.module.ngfactory");
    require("zone.js/dist/zone.js"); // Angular runtime dep
    core_1.enableProdMode();
    // Bootstrap needs to happen after body is ready but we cannot reliably
    // controls the order in which script gets loaded (Vulcanization inlines
    // the script in <head>).
    window.addEventListener('DOMContentLoaded', () => {
        platform_browser_1.platformBrowser().bootstrapModuleFactory(app_module_ngfactory_1.AppModuleNgFactory);
    });
});
