var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var tb_plugin;
(function (tb_plugin) {
    var lib;
    (function (lib) {
        var runs;
        (function (runs_1) {
            function getRuns() {
                return __awaiter(this, void 0, void 0, function* () {
                    return tb_plugin.lib.DO_NOT_USE_INTERNAL.sendMessage('experimental.GetRuns');
                });
            }
            runs_1.getRuns = getRuns;
            function setOnRunsChanged(callback) {
                return tb_plugin.lib.DO_NOT_USE_INTERNAL.listen('experimental.RunsChanged', callback);
            }
            runs_1.setOnRunsChanged = setOnRunsChanged;
        })(runs = lib.runs || (lib.runs = {}));
    })(lib = tb_plugin.lib || (tb_plugin.lib = {}));
})(tb_plugin || (tb_plugin = {}));
