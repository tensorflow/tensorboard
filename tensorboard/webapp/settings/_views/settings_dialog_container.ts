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

import {State} from '../../app_state';
import {getDarkModeEnabled} from '../../feature_flag/store/feature_flag_selectors';
import {ColorPalette, palettes} from '../../util/colors';
import {
  changePageSize,
  changeReloadPeriod,
  colorPaletteChanged,
  toggleReloadEnabled,
} from '../_redux/settings_actions';
import {
  getColorPalette,
  getPageSize,
  getReloadEnabled,
  getReloadPeriodInMs,
} from '../_redux/settings_selectors';

@Component({
  selector: 'settings-dialog',
  template: `
    <settings-dialog-component
      [reloadEnabled]="reloadEnabled$ | async"
      [reloadPeriodInMs]="reloadPeriodInMs$ | async"
      [pageSize]="pageSize$ | async"
      [knownPalettes]="KnownPalettes"
      [currentPalette]="currentPalette$ | async"
      [useDarkMode]="useDarkMode$ | async"
      (reloadToggled)="onReloadToggled()"
      (reloadPeriodInMsChanged)="onReloadPeriodInMsChanged($event)"
      (pageSizeChanged)="onPageSizeChanged($event)"
      (paletteChanged)="onPaletteChanged($event)"
    ></settings-dialog-component>
  `,
  styles: [
    `
      :host,
      settings-dialog-component {
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class SettingsDialogContainer {
  readonly reloadEnabled$ = this.store.select(getReloadEnabled);
  readonly reloadPeriodInMs$ = this.store.select(getReloadPeriodInMs);
  readonly pageSize$ = this.store.select(getPageSize);
  readonly currentPalette$ = this.store.select(getColorPalette);
  readonly useDarkMode$ = this.store.select(getDarkModeEnabled);

  readonly KnownPalettes: ColorPalette[] = [...palettes.values()];

  constructor(private store: Store<State>) {}

  onReloadToggled(): void {
    this.store.dispatch(toggleReloadEnabled());
  }

  onReloadPeriodInMsChanged(periodInMs: number): void {
    this.store.dispatch(changeReloadPeriod({periodInMs}));
  }

  onPageSizeChanged(size: number): void {
    this.store.dispatch(changePageSize({size}));
  }

  onPaletteChanged(palettId: string): void {
    const palette = palettes.get(palettId);
    if (!palette) return;
    this.store.dispatch(colorPaletteChanged({palette}));
  }
}
