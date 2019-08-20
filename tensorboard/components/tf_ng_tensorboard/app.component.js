var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/app.component", ["require", "exports", "@angular/core", "@ngrx/store", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.actions"], factory);
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
    const store_1 = require("@ngrx/store");
    const core_actions_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.actions");
    let AppComponent = class AppComponent {
        constructor(store) {
            this.store = store;
        }
        ngOnInit() {
            // TODO(stephanwlee): Instead of hardcoding it, consider reading it off of the
            // tf_dashboard.registry. It is current infeasible unless Angular source is also
            // compiled with JSCompiler.
            this.store.dispatch(core_actions_1.changePlugin({ plugin: 'Core' }));
        }
    };
    AppComponent = __decorate([
        core_1.Component({
            selector: 'tf-ng-tensorboard',
            template: "<!--\n@license\nCopyright 2019 The TensorFlow Authors. All Rights Reserved.\n\nLicensed under the Apache License, Version 2.0 (the \"License\");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an \"AS IS\" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.\n-->\n<div>\n  <app-header></app-header>\n</div>\n",
            styles: ["/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.\n\nLicensed under the Apache License, Version 2.0 (the \"License\");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an \"AS IS\" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.\n==============================================================================*/\n"]
        }),
        __metadata("design:paramtypes", [store_1.Store])
    ], AppComponent);
    exports.AppComponent = AppComponent;
});
