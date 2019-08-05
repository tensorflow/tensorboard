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
        define("org_tensorflow_tensorboard/tensorboard/components/tensor_widget/dtype-utils-test", ["require", "exports", "chai", "org_tensorflow_tensorboard/tensorboard/components/tensor_widget/dtype-utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const chai_1 = require("chai");
    const dtype_utils_1 = require("org_tensorflow_tensorboard/tensorboard/components/tensor_widget/dtype-utils");
    describe('isIntegerDType', () => {
        it('returns true for unsigned ints', () => {
            chai_1.expect(dtype_utils_1.isIntegerDType('uint02')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('uint2')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('uint04')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('uint4')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('uint8')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('uint16')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('uint64')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('uint128')).to.be.true;
        });
        it('returns true for signed ints', () => {
            chai_1.expect(dtype_utils_1.isIntegerDType('int4')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('int8')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('int16')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('int32')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('int64')).to.be.true;
            chai_1.expect(dtype_utils_1.isIntegerDType('int128')).to.be.true;
        });
        it('returns false for negative cases', () => {
            chai_1.expect(dtype_utils_1.isIntegerDType('bool')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('string')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('float32')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('complex64')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('complex128')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('resource')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('interrupt')).to.be.false;
        });
    });
    describe('isFloatDType', () => {
        it('returns true for floats', () => {
            chai_1.expect(dtype_utils_1.isFloatDType('float32')).to.be.true;
            chai_1.expect(dtype_utils_1.isFloatDType('float64')).to.be.true;
        });
        it('returns true for bfloat types', () => {
            chai_1.expect(dtype_utils_1.isFloatDType('bfloat16')).to.be.true;
        });
        it('returns false for negative cases', () => {
            chai_1.expect(dtype_utils_1.isFloatDType('bool')).to.be.false;
            chai_1.expect(dtype_utils_1.isFloatDType('string')).to.be.false;
            chai_1.expect(dtype_utils_1.isFloatDType('int32')).to.be.false;
            chai_1.expect(dtype_utils_1.isFloatDType('uint32')).to.be.false;
            chai_1.expect(dtype_utils_1.isFloatDType('complex64')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('complex128')).to.be.false;
            chai_1.expect(dtype_utils_1.isIntegerDType('resource')).to.be.false;
        });
    });
});
