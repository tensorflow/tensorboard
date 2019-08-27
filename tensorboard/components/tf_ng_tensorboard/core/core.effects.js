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
        define("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.effects", ["require", "exports", "@angular/core", "@ngrx/effects", "rxjs", "rxjs/operators", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.service", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.actions"], factory);
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
    const effects_1 = require("@ngrx/effects");
    const rxjs_1 = require("rxjs");
    const operators_1 = require("rxjs/operators");
    const core_service_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.service");
    const core_actions_1 = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.actions");
    let CoreEffects = class CoreEffects {
        constructor(actions$, coreService) {
            this.actions$ = actions$;
            this.coreService = coreService;
            this.loadPluginsListing$ = effects_1.createEffect(() => this.actions$.pipe(effects_1.ofType(core_actions_1.coreLoaded), operators_1.flatMap(() => this.coreService
                .fetchPluginsListing()
                .pipe(operators_1.map((plugins) => core_actions_1.pluginsListingLoaded({ plugins }), operators_1.catchError(() => rxjs_1.of(core_actions_1.pluginsListingFailed())))))));
        }
    };
    CoreEffects = __decorate([
        core_1.Injectable(),
        __metadata("design:paramtypes", [effects_1.Actions, core_service_1.CoreService])
    ], CoreEffects);
    exports.CoreEffects = CoreEffects;
});
