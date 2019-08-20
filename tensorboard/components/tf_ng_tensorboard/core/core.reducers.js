(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.reducers", ["require", "exports", "@ngrx/store", "org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.actions"], factory);
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
    const store_1 = require("@ngrx/store");
    const actions = require("org_tensorflow_tensorboard/tensorboard/components/tf_ng_tensorboard/core/core.actions");
    exports.CORE_FEATURE_KEY = 'core';
    const initialState = {};
    const ɵ0 = (state, { plugin }) => {
        return {
            activePlugin: plugin,
        };
    };
    exports.ɵ0 = ɵ0;
    const reducer = store_1.createReducer(initialState, store_1.on(actions.changePlugin, ɵ0));
    function reducers(state, action) {
        return reducer(state, action);
    }
    exports.reducers = reducers;
    const selectCoreState = store_1.createFeatureSelector(exports.CORE_FEATURE_KEY);
    const ɵ1 = (state) => {
        return state.activePlugin;
    };
    exports.ɵ1 = ɵ1;
    exports.getActivePlugin = store_1.createSelector(selectCoreState, ɵ1);
});
