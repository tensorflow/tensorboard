/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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

import { PolymerElement, html } from "@polymer/polymer";
import { customElement, property } from "@polymer/decorators";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-main/tf-hparams-main.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-backend/tf-hparams-backend.html";
import { DO_NOT_SUBMIT } from "../tf-tensorboard/plugin-dialog.html";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-main/tf-hparams-main.html";
import { DO_NOT_SUBMIT } from "../tf-hparams-backend/tf-hparams-backend.html";
import { DO_NOT_SUBMIT } from "../tf-tensorboard/plugin-dialog.html";
/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
"use strict";
const PLUGIN_NAME = "hparams";
@customElement("tf-hparams-dashboard")
class TfHparamsDashboard extends PolymerElement {
    static readonly template = html `<!-- Tensorboard does not specify an experimentName. Currently it only
         supports one experiment per invocation. -->
    <tf-hparams-main id="hparams-main" backend="[[_backend]]" experiment-name="">
    </tf-hparams-main>`;
    @property({
        type: Object
    })
    _backend: object = () => {
        return new tf.hparams.Backend(
        /* apiUrl= */ tf_backend
            .getRouter()
            .pluginRoute(/* pluginName= */ PLUGIN_NAME, /* route= */ ""), new tf_backend.RequestManager(), 
        /* Use GETs if we're running in colab (due to b/126387106).
           Otherwise use POSTs. */
        /* useHttpGet= */ !!(window.TENSORBOARD_ENV || {}).IN_COLAB);
    };
    // This is called by the tensorboard web framework to refresh the plugin.
    reload() {
        this.$["hparams-main"].reload();
    }
}
