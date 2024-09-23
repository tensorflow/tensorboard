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
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Store} from '@ngrx/store';
import {Subject} from 'rxjs';
import {filter, takeUntil} from 'rxjs/operators';
import {getLatestAlert} from '../../selectors';
import {State} from '../store/alert_types';
import {AlertInfo} from '../types';
import {AlertDisplaySnackbarContainer} from './alert_display_snackbar_container';

/**
 * Renders alerts in a 'snackbar' to indicate them to the user.
 */
@Component({
  standalone: false,
  selector: 'alert-snackbar',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertSnackbarContainer implements OnInit, OnDestroy {
  private readonly ngUnsubscribe = new Subject<void>();

  constructor(
    private readonly store: Store<State>,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.store
      .select(getLatestAlert)
      .pipe(
        takeUntil(this.ngUnsubscribe),
        filter((alert) => Boolean(alert))
      )
      .subscribe((alert) => {
        this.showAlert(alert!);
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private showAlert(alertInfo: AlertInfo) {
    this.snackBar.openFromComponent(AlertDisplaySnackbarContainer, {
      duration: 5000,
      horizontalPosition: 'start',
      verticalPosition: 'bottom',
      data: alertInfo,
    });
  }
}
