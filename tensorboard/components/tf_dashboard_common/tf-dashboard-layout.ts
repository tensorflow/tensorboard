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

import {customElement} from '@polymer/decorators';
import {html, PolymerElement} from '@polymer/polymer';
import {DarkModeMixin} from '../polymer/dark_mode_mixin';
import './scrollbar-style';
import './tensorboard-color';

@customElement('tf-dashboard-layout')
class TfDashboardLayout extends DarkModeMixin(PolymerElement) {
  static readonly template = html`
    <div id="sidebar">
      <slot name="sidebar"></slot>
    </div>

    <div id="center">
      <slot name="center" class="scollbar"></slot>
    </div>
    <style include="scrollbar-style"></style>
    <style>
      :host {
        background-color: #f5f5f5;
        display: flex;
        flex-direction: row;
        height: 100%;
      }

      :host(.dark-mode) {
        background-color: var(--secondary-background-color);
      }

      #sidebar {
        flex: 0 0 var(--tf-dashboard-layout-sidebar-basis, 25%);
        height: 100%;
        max-width: var(--tf-dashboard-layout-sidebar-max-width, 350px);
        min-width: var(--tf-dashboard-layout-sidebar-min-width, 270px);
        overflow-y: auto;
        text-overflow: ellipsis;
      }

      #center {
        flex-grow: 1;
        flex-shrink: 1;
        height: 100%;
        overflow: hidden;
      }

      ::slotted([slot='center']) {
        contain: strict;
        height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
        width: 100%;
        will-change: transform;
      }

      .tf-graph-dashboard #center {
        background: #fff;
      }
    </style>
  `;
}
