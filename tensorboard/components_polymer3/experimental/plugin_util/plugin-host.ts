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
import {PolymerElement, html} from '@polymer/polymer';
import {customElement} from '@polymer/decorators';
import {registerPluginIframe} from './plugin-host-ipc';

// TODO(psybuzz): we should not rely on side-effects to run when importing
// modules.
import './core-host-impl';
import './runs-host-impl';

// HACK: this Polymer component allows the experimental plugin host APIs
// to be accessible across bundle binary.
@customElement('tf-experimental-plugin-host-lib')
class TfExperimentalPluginHostLib extends PolymerElement {
  _template = null;
  registerPluginIframe = registerPluginIframe;
}
