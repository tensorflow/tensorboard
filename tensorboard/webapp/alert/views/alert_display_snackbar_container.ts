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
import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MatSnackBarRef, MAT_SNACK_BAR_DATA} from '@angular/material/snack-bar';
import {Store} from '@ngrx/store';
import {State} from '../../app_state';
import {splitByURL} from '../../util/string';
import {AlertInfo} from '../types';

@Component({
  standalone: false,
  selector: 'alert-display-snackbar',
  templateUrl: './alert_display_snackbar_container.ng.html',
  styleUrls: ['./alert_display_snackbar_container.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDisplaySnackbarContainer {
  readonly alert: AlertInfo;
  readonly splitByURL = splitByURL;

  constructor(
    private readonly snackBarRef: MatSnackBarRef<AlertDisplaySnackbarContainer>,
    @Inject(MAT_SNACK_BAR_DATA) readonly unknownData: unknown,
    private readonly store: Store<State>
  ) {
    this.alert = unknownData as AlertInfo;
  }

  async onActionButtonClicked() {
    this.snackBarRef.dismiss();

    const followupAction = await this.alert.followupAction!.getFollowupAction();
    this.store.dispatch(followupAction);
  }

  onCloseButtonClicked() {
    this.snackBarRef.dismiss();
  }
}
