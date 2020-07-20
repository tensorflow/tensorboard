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
import {Component, Input} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'tbdev-upload-dialog-component',
  templateUrl: './tbdev_upload_dialog_component.ng.html',
  styleUrls: ['./tbdev_upload_dialog_component.css'],
})
export class TbdevUploadDialogComponent {
  readonly tensorboardDotDevUrl: string =
    'https://tensorboard.dev/?utm_source=tensorboard';

  constructor(
    private readonly dialogRef: MatDialogRef<TbdevUploadDialogComponent>
  ) {}

  @Input()
  logdir!: string;

  onClose(): void {
    this.dialogRef.close();
  }

  getCommandText(): string {
    if (!this.logdir) {
      // Without logdir we print a literal '{logdir}' string that user will
      // have to manually substitute.
      return 'tensorboard dev upload --logdir {logdir}';
    } else {
      // With logdir we substitute the value into the command for the user.
      // We assume that logdir is sufficiently long that we want to print it on
      // the next line. If the logdir value is still too long then the CSS will
      // render a scrollbar underneath.
      const escapedLogdir = this.logdir.replace(/'/g, "'\\''");
      return "tensorboard dev upload --logdir \\\n    '" + escapedLogdir + "'";
    }
  }
}
