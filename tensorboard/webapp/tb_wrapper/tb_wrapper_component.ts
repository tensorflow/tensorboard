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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {State} from '../app_state';
import {featureFlagOverrideChanged} from '../feature_flag/actions/feature_flag_actions';
import {
  getFeatureFlags,
  getShowFlagsEnabled,
} from '../feature_flag/store/feature_flag_selectors';
import {FeatureFlagPageContainer} from '../feature_flag/views/feature_flag_page_container';

@Component({
  selector: 'tensorboard-wrapper-component',
  template: `
    <plugins class="plugins"></plugins>
    <reloader></reloader>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .plugins {
        flex: 1 1;
        overflow: auto;
        position: relative;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TensorBoardWrapperComponent {
  readonly showFeatureFlags$ = this.store.select(getShowFlagsEnabled);
  readonly featureFlags$ = this.store.select(getFeatureFlags);
  private featureFlagsDialog?: MatDialogRef<FeatureFlagPageContainer>;

  constructor(private readonly store: Store<State>, private dialog: MatDialog) {
    this.showFeatureFlags$.subscribe((showFeatureFlags: boolean) => {
      if (showFeatureFlags) {
        this.featureFlagsDialog = this.dialog.open(FeatureFlagPageContainer);
        this.featureFlagsDialog.afterClosed().subscribe(() => {
          this.store.dispatch(
            featureFlagOverrideChanged({
              flags: {enableShowFlags: false},
            })
          );
        });
        return;
      }
      if (this.featureFlagsDialog) {
        this.featureFlagsDialog.close();
      }
    });
  }
}
