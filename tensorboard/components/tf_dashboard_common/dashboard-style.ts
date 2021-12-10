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

import '../polymer/irons_and_papers';
import {registerStyleDomModule} from '../polymer/register_style_dom_module';

registerStyleDomModule({
  moduleName: 'dashboard-style',
  styleDependencies: ['iron-flex'],
  styleContent: `
      :host {
        --sidebar-vertical-padding: 15px;
        --sidebar-left-padding: 30px;
      }

      [slot='sidebar'] {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        height: 100%;
        margin-right: 10px;
        overflow-x: hidden;
        padding: 5px 0;
        text-overflow: ellipsis;
      }

      .settings {
        min-height: 50px;
        overflow-x: hidden;
        overflow-y: auto;
        will-change: transform;
      }

      .runs-selector {
        display: flex;
        flex-grow: 1;
        min-height: 200px;
      }

      tf-runs-selector {
        flex-grow: 1;
        flex-shrink: 1;
        left: var(--sidebar-left-padding);
        max-height: calc(100% - var(--sidebar-vertical-padding) * 2);
        overflow: hidden;
        position: absolute;
        right: 0;
      }

      .search-input {
        margin: 10px 5px 0 10px;
      }

      .sidebar-section {
        border-top: solid 1px var(--tb-ui-border);
        margin-right: 10px;
        padding: var(--sidebar-vertical-padding) 0
          var(--sidebar-vertical-padding) var(--sidebar-left-padding);
        position: relative;
        overflow: hidden;
      }

      .sidebar-section:first-of-type {
        border: none;
      }

      .sidebar-section paper-button {
        margin: 5px;
      }

      .sidebar-section paper-button:first-of-type {
        margin-left: 0 !important;
      }

      .sidebar-section paper-button:last-of-type {
        margin-right: 0 !important;
      }

      .sidebar-section > :first-child {
        margin-top: 0;
        padding-top: 0;
      }

      .sidebar-section > :last-child {
        margin-bottom: 0;
        padding-bottom: 0;
      }

      .sidebar-section h3 {
        color: var(--tb-secondary-text-color);
        display: block;
        font-size: 14px;
        font-weight: normal;
        margin: 10px 0 5px;
        pointer-events: none;
      }

      paper-checkbox {
        --paper-checkbox-checked-color: var(--tb-ui-dark-accent);
        --paper-checkbox-unchecked-color: var(--tb-ui-dark-accent);
        font-size: 15px;
        margin-top: 5px;
      }

      a {
        color: var(--tb-link);
      }

      a:visited {
        color: var(--tb-link-visited);
      }
  `,
});
