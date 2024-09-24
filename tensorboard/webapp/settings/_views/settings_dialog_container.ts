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
import {
  changePageSize,
  changeReloadPeriod,
  toggleReloadEnabled,
} from '../_redux/settings_actions';
import {
  getPageSize,
  getReloadEnabled,
  getReloadPeriodInMs,
} from '../_redux/settings_selectors';
import {State} from '../_redux/settings_types';

@Component({
  standalone: false,
  selector: 'settings-dialog',
  template: `
    <settings-dialog-component
      [reloadEnabled]="reloadEnabled$ | async"
      [reloadPeriodInMs]="reloadPeriodInMs$ | async"
      [pageSize]="pageSize$ | async"
      (reloadToggled)="onReloadToggled()"
      (reloadPeriodInMsChanged)="onReloadPeriodInMsChanged($event)"
      (pageSizeChanged)="onPageSizeChanged($event)"
    ></settings-dialog-component>
  `,
})
export class SettingsDialogContainer {
  readonly reloadEnabled$;
  readonly reloadPeriodInMs$;
  readonly pageSize$;

  constructor(private store: Store<State>) {
    this.reloadEnabled$ = this.store.select(getReloadEnabled);
    this.reloadPeriodInMs$ = this.store.select(getReloadPeriodInMs);
    this.pageSize$ = this.store.select(getPageSize);
  }

  onReloadToggled(): void {
    this.store.dispatch(toggleReloadEnabled());
  }

  onReloadPeriodInMsChanged(periodInMs: number): void {
    this.store.dispatch(changeReloadPeriod({periodInMs}));
  }

  onPageSizeChanged(size: number): void {
    this.store.dispatch(changePageSize({size}));
  }
}
