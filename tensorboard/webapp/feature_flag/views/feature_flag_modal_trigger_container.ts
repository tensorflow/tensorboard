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
import {ComponentType} from '@angular/cdk/overlay';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {State} from '../../app_state';
import {featureFlagOverridesReset} from '../actions/feature_flag_actions';
import {getShowFlagsEnabled} from '../store/feature_flag_selectors';
import {FeatureFlagDialogContainer} from './feature_flag_dialog_container';

const util = {
  reloadWindow: () => {
    window.location.reload();
  },
};

@Component({
  standalone: false,
  selector: 'feature-flag-modal-trigger',
  template: ``,
  styles: [],
})
export class FeatureFlagModalTriggerContainer implements OnInit, OnDestroy {
  // Allow the dialog component type to be overridden for testing purposes.
  featureFlagDialogType: ComponentType<any> = FeatureFlagDialogContainer;

  readonly showFeatureFlags$;
  private featureFlagsDialog?: MatDialogRef<FeatureFlagDialogContainer>;
  private ngUnsubscribe = new Subject<void>();

  constructor(private readonly store: Store<State>, private dialog: MatDialog) {
    this.showFeatureFlags$ = this.store.select(getShowFlagsEnabled);
  }

  ngOnInit() {
    this.showFeatureFlags$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((showFeatureFlags: boolean) => {
        if (showFeatureFlags) {
          this.featureFlagsDialog = this.dialog.open(
            this.featureFlagDialogType
          );
          this.featureFlagsDialog
            .afterClosed()
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => {
              // Reset the 'showFlags' flag when the dialog is closed to prevent the
              // dialog from appearing again after the page is refreshed.
              this.store.dispatch(
                featureFlagOverridesReset({
                  flags: ['showFlags'],
                })
              );
              // Reload the page so that the application restarts with stable
              // feature flag values.
              // Wait one tick before reloading the page so the 'showFlags'
              // reset has a chance to be reflected in the URL before page reload.
              setTimeout(() => {
                util.reloadWindow();
              }, 1);
            });
          return;
        }
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}

export const TEST_ONLY = {
  util,
};
