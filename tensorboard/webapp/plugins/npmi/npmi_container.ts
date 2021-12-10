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
import {Component, OnInit} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {State} from '../../app_state';
import {getCurrentRouteRunSelection} from '../../selectors';
import {npmiLoaded} from './actions';
import {getViewActive} from './store/npmi_selectors';

@Component({
  selector: 'npmi',
  template: `
    <npmi-component
      [runs]="runs$ | async"
      [activeView]="activeView$ | async"
    ></npmi-component>
  `,
})
export class NpmiContainer implements OnInit {
  readonly runs$ = this.store.pipe(select(getCurrentRouteRunSelection));
  readonly activeView$ = this.store.pipe(select(getViewActive));

  constructor(private readonly store: Store<State>) {}

  ngOnInit(): void {
    this.store.dispatch(npmiLoaded());
  }
}
