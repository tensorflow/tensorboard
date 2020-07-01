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
  commandText: string = 'tensorboard dev upload --logdir {logdir}';
  readonly environment$ = this.store.pipe(select(getEnvironment));

  private ngUnsubscribe = new Subject();

  constructor(private store: Store<State>) {}

  ngOnInit() {
    this.environment$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((environment) => {
        if (environment && environment.data_location) {
          this.commandText =
            'tensorboard dev upload --logdir ' + environment.data_location;
        }
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
