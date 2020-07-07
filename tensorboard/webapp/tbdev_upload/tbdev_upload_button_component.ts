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
import {Component, HostBinding, Inject} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {TbdevUploadDialogContainer} from './tbdev_upload_dialog_container';

// A list of hostname values that will trigger the tbdev-upload-button button to
// appear.
const LOCAL_HOSTNAMES: string[] = ['localhost', '127.0.0.1'];

@Component({
  selector: 'tbdev-upload-button',
  template: `
    <button mat-stroked-button *ngIf="shown" (click)="openDialog()">
      <span class="button-contents">
        <mat-icon svgIcon="info_outline_24px"></mat-icon>
        Upload
      </span>
    </button>
  `,
  styles: [
    `
      /* More precise selector than angular material selectors to override
         styling. */
      button.mat-stroked-button {
        background-color: rgba(198, 202, 209, 0.2);
        border: 1px solid #e9e9e9;
      }
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
  @HostBinding('class.shown') shown: boolean;

  constructor(
    @Inject('window') readonly window: Window,
    private readonly dialog: MatDialog
  ) {
    this.shown = LOCAL_HOSTNAMES.includes(window.location.hostname);
  }

  openDialog(): void {
    this.dialog.open(TbdevUploadDialogContainer, {
      width: '560px',
    });
  }
}
