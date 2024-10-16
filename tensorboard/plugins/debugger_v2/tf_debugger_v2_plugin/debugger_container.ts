/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {Component, OnDestroy, OnInit} from '@angular/core';
import {createSelector, select, Store} from '@ngrx/store';
import {debuggerLoaded, debuggerUnloaded} from './actions';
import {getActiveRunId, getDebuggerRunListing} from './store';
import {State} from './store/debugger_types';

@Component({
  standalone: false,
  selector: 'tf-debugger-v2',
  template: `
    <debugger-component
      [runs]="runs$ | async"
      [runIds]="runsIds$ | async"
      [activeRunId]="activeRunId$ | async"
    ></debugger-component>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class DebuggerContainer implements OnInit, OnDestroy {
  readonly runs$;

  readonly runsIds$;

  readonly activeRunId$;

  constructor(private readonly store: Store<State>) {
    this.runs$ = this.store.pipe(select(getDebuggerRunListing));
    this.runsIds$ = this.store.pipe(
      select(
        createSelector(getDebuggerRunListing, (runs): string[] =>
          Object.keys(runs)
        )
      )
    );
    this.activeRunId$ = this.store.pipe(select(getActiveRunId));
  }

  ngOnInit(): void {
    this.store.dispatch(debuggerLoaded());
  }

  ngOnDestroy(): void {
    this.store.dispatch(debuggerUnloaded());
  }
}
