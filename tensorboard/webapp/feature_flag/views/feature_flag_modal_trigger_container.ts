/* Copyright 2022 The TensorFlow Authors. All Rights Reserved.

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
import {Component, OnInit} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {State} from '../../app_state';
import {featureFlagOverrideChanged} from '../actions/feature_flag_actions';
import {getShowFlagsEnabled} from '../store/feature_flag_selectors';
import {FeatureFlagPageContainer} from './feature_flag_page_container';

@Component({
  selector: 'feature-flag-modal-trigger',
  template: ``,
  styles: [],
})
export class FeatureFlagModalTriggerContainer implements OnInit {
  readonly showFeatureFlags$ = this.store.select(getShowFlagsEnabled);
  private featureFlagsDialog?: MatDialogRef<FeatureFlagPageContainer>;

  constructor(
    private readonly store: Store<State>,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.showFeatureFlags$.subscribe((showFeatureFlags: boolean) => {
      if (showFeatureFlags) {
        this.featureFlagsDialog = this.dialog.open(FeatureFlagPageContainer);
        this.featureFlagsDialog.afterClosed().subscribe(() => {
          // Disable the flag when the dialog is closed to prevent it from
          // appearing again after the page is refreshed.
          this.store.dispatch(
            featureFlagOverrideChanged({
              flags: {enableShowFlags: false},
            })
          );
        });
        return;
      }
    });
  }
}
