/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
import {registerStyleDomModule} from '../polymer/register_style_dom_module';

registerStyleDomModule({
  moduleName: 'vz-pan-zoom-style',
  styleContent: `
    .help {
      align-items: center;
      animation-delay: 1s;
      animation-duration: 1s;
      animation-name: fade-out;
      background: rgba(30, 30, 30, 0.6);
      bottom: 0;
      color: #fff;
      display: flex;
      justify-content: center;
      left: 0;
      opacity: 1;
      padding: 20px;
      pointer-events: none;
      position: absolute;
      right: 0;
      top: 0;
    }

    .help > span {
      white-space: normal;
    }

    @keyframes fade-out {
      0% {
        opacity: 1;
      }

      100% {
        opacity: 0;
      }
    }
  `,
});
