(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/reducers", ["require", "exports", "@angular/core"], factory);
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
    // console.log all actions
    function logger(reducer) {
        return (state, action) => {
            const result = reducer(state, action);
            console.groupCollapsed(action.type);
            console.log('prev state', state);
            console.log('action', action);
            console.log('next state', result);
            console.groupEnd();
            return result;
        };
    }
    exports.logger = logger;
    // TODO(stephanwlee): Create dev mode and conditionally enable this.
    exports.metaReducers = false ? [logger] : [];
    exports.ROOT_REDUCERS = new core_1.InjectionToken('Root reducers token', {
        factory: () => ({}),
    });
});
