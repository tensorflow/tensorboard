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
import {Store} from '@ngrx/store';
import {map} from 'rxjs/operators';

import {State} from '../../../app_state';
import {getMetricsTagFilter} from '../../store';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'metrics-main-view',
  template: `
    <metrics-main-view-component
      [showFilteredView]="showFilteredView$ | async"
      [isSidepaneOpen]="isSidepaneOpen"
      (onSettingsButtonClicked)="onSettingsButtonClicked()"
      (onCloseSidepaneButtonClicked)="onCloseSidepaneButtonClicked()"
    ></metrics-main-view-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainViewContainer {
  constructor(private readonly store: Store<State>) {}

  isSidepaneOpen = true;

  readonly showFilteredView$ = this.store.select(getMetricsTagFilter).pipe(
    map((filter) => {
      return filter.length > 0;
    })
  );

  onSettingsButtonClicked() {
    this.isSidepaneOpen = !this.isSidepaneOpen;
  }

  onCloseSidepaneButtonClicked() {
    this.isSidepaneOpen = false;
  }
}
