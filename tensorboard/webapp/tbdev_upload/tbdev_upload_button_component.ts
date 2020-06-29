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
import {Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {TbdevUploadDialogComponent} from './tbdev_upload_dialog_component';

@Component({
  selector: 'tbdev-upload-button',
  template: `
    <button mat-stroked-button (click)="openDialog()">
      <span class="button-contents">
        <mat-icon svgIcon="info_outline_24px"></mat-icon>
        Upload
      </span>
    </button>
  `,
  styles: [
    `
      .button-contents {
        align-items: center;
        display: flex;
        text-transform: uppercase;
      }
      mat-icon {
        margin-right: 6px;
      }
    `,
  ],
})
export class TbdevUploadButtonComponent {
  constructor(private dialog: MatDialog) {}

  openDialog(): void {
    this.dialog.open(TbdevUploadDialogComponent, {
      width: '560px',
    });
  }
}
