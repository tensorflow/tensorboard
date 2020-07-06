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
import {Component} from '@angular/core';

@Component({
  selector: 'app-header',
  template: `
    <mat-toolbar color="primary">
      <span class="brand">TensorBoard</span>
      <plugin-selector class="plugins"></plugin-selector>
      <app-header-reload></app-header-reload>
      <settings-button></settings-button>
      <a
        class="readme"
        mat-icon-button
        href="https://github.com/tensorflow/tensorboard/blob/master/README.md"
        rel="noopener noreferrer"
        target="_blank"
        aria-label="Help"
      >
        <mat-icon svgIcon="help_outline_24px"></mat-icon>
      </a>
    </mat-toolbar>
  `,
  styles: [
    `
      mat-toolbar {
        align-items: center;
        display: flex;
        height: 64px;
        overflow: hidden;
        width: 100%;
      }

      .brand,
      .readme,
      app-header-reload,
      settings-button {
        flex: 0 0 auto;
      }

      .plugins {
        align-items: center;
        display: flex;
        flex: 1 1 auto;
        font-size: 14px;
        height: 100%;
        overflow: hidden;
      }
    `,
  ],
})
export class HeaderComponent {}
