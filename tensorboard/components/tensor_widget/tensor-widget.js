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
        define("org_tensorflow_tensorboard/tensorboard/components/tensor_widget/tensor-widget", ["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Create an instance of tensor widiget.
     * @param rootElement The element in which the tensor widget will be endered.
     * @param tensor The tensor view of which the content is to be rendered
     *   in the tensor widget.
     * @param options Optional configurations.
     * @returns An instance of a single-tensor tensor widget.
     */
    function tensorWidget(rootElement, tensor, options) {
        throw new Error('tensorWidget() factory method has not been implemented yet.');
    }
    exports.tensorWidget = tensorWidget;
});
