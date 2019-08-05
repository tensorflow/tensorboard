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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("org_tensorflow_tensorboard/tensorboard/components/tensor_widget/dtype-utils", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Determine if a data type is an integer type.
     * @param dtype
     * @return Whether the dtype is an integer type.
     */
    function isIntegerDType(dtype) {
        return (dtype.match(/^int[0-9]+$/) !== null || dtype.match(/^uint[0-9]+$/) !== null);
    }
    exports.isIntegerDType = isIntegerDType;
    /**
     * Determine if a data type is a float type.
     * @param dtype
     * @return Whether the dtype is a float type.
     */
    function isFloatDType(dtype) {
        return (dtype.match(/^float[0-9]+$/) !== null ||
            dtype.match(/^bfloat[0-9]+$/) !== null);
    }
    exports.isFloatDType = isFloatDType;
});
