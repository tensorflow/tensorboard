/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {State as CoreState} from '../core/store/core_types';
import {overrideEnableDarkModeChanged} from '../feature_flag/actions/feature_flag_actions';
import {getEnableDarkModeOverride} from '../feature_flag/store/feature_flag_selectors';
import {State as FeatureFlagState} from '../feature_flag/store/feature_flag_types';
import {DarkModeOverride} from './dark_mode_toggle_component';

@Component({
  standalone: false,
  selector: 'app-header-dark-mode-toggle',
  template: `
    <app-header-dark-mode-toggle-component
      [darkModeOverride]="darkModeOverride$ | async"
      (onOverrideChanged)="changeDarkMode($event)"
    >
    </app-header-dark-mode-toggle-component>
  `,
})
export class DarkModeToggleContainer {
  readonly darkModeOverride$: Observable<DarkModeOverride>;

  constructor(private readonly store: Store<CoreState & FeatureFlagState>) {
    this.darkModeOverride$ = this.store.select(getEnableDarkModeOverride).pipe(
      map((override: boolean | null): DarkModeOverride => {
        if (override === null) return DarkModeOverride.DEFAULT;
        return override
          ? DarkModeOverride.DARK_MODE_ON
          : DarkModeOverride.DARK_MODE_OFF;
      })
    );
  }

  changeDarkMode(newOverride: DarkModeOverride) {
    let enableDarkMode: boolean | null = null;

    switch (newOverride) {
      case DarkModeOverride.DEFAULT:
        enableDarkMode = null;
        break;
      case DarkModeOverride.DARK_MODE_OFF:
        enableDarkMode = false;
        break;
      case DarkModeOverride.DARK_MODE_ON:
        enableDarkMode = true;
        break;
    }

    this.store.dispatch(overrideEnableDarkModeChanged({enableDarkMode}));
  }
}
