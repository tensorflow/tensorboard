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
import {Component, OnInit, OnDestroy} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {Store, select} from '@ngrx/store';
import {State, getEnvironment} from '../core/store';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'tbdev-upload-dialog',
  templateUrl: './tbdev_upload_dialog_component.ng.html',
  styleUrls: ['./tbdev_upload_dialog_component.css'],
})
export class TbdevUploadDialogComponent implements OnInit, OnDestroy {
  commandText: string = this.getCommandText('');
  readonly environment$ = this.store.pipe(select(getEnvironment));

  private ngUnsubscribe = new Subject();

  constructor(
    private dialogRef: MatDialogRef<TbdevUploadDialogComponent>,
    private store: Store<State>
  ) {}

  ngOnInit() {
    this.environment$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((environment) => {
        if (environment && environment.data_location) {
          this.commandText = this.getCommandText(environment.data_location);
        }
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private getCommandText(logdir?: string) {
    if (!logdir) {
      // Without logdir we print a literal '{logdir}' string that user will
      // have to manually substitute.
      return 'tensorboard dev upload --logdir {logdir}';
    } else {
      // With logdir we substitute the value into the command for the user.
      // We assume that logdir is sufficiently long that we want to print it on
      // the next line. If the logdir value is still too long then the CSS will
      // render a scrollbar underneath.
      const escapedLogdir = logdir.replace(/'/g, "'\\''");
      return "tensorboard dev upload --logdir \\\n    '" + escapedLogdir + "'";
    }
  }
}
