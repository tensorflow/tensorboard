/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'runs-group-menu-button-component',
  template: `
    <button
      mat-icon-button
      title="Group runs by..."
      [matMenuTriggerFor]="groupByMenu"
    >
      <mat-icon svgIcon="palette_24px"></mat-icon>
    </button>
    <mat-menu #groupByMenu="matMenu">
      <button mat-menu-item>
        <span>Experiments</span>
      </button>
      <button mat-menu-item>
        <span>Runs</span>
      </button>
      <button mat-menu-item>
        <span>Regex</span>
      </button>
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunsGroupMenuButtonComponent {}
