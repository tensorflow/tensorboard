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
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {Store, select} from '@ngrx/store';
import {combineLatest} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

import {getReloadEnabled, getReloadPeriodInMs, State} from '../core/store';
import {reload} from '../core/actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

const documentUtil = {
  /**
   * Wraps Page Visibility API call to determine if document is visible.
   * Can be overriden for testing purposes.
   */
  getVisibilityState(): string {
    return document.visibilityState;
  },
};

@Component({
  selector: 'reloader',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReloaderComponent {
  private readonly onVisibilityChange = this.onVisibilityChangeImpl.bind(this);
  private readonly reloadEnabled$ = this.store.pipe(select(getReloadEnabled));
  private readonly reloadPeriodInMs$ = this.store.pipe(
    select(getReloadPeriodInMs)
  );
  private reloadTimerId: ReturnType<typeof setTimeout> | null = null;
  private missedAutoReload: boolean = false;

  constructor(private store: Store<State>) {}

  ngOnInit() {
    window.addEventListener('visibilitychange', this.onVisibilityChange);
    combineLatest(
      this.reloadEnabled$.pipe(distinctUntilChanged()),
      this.reloadPeriodInMs$.pipe(distinctUntilChanged())
    ).subscribe(([enabled, reloadPeriodInMs]) => {
      this.cancelLoad();
      if (enabled) {
        this.load(reloadPeriodInMs as number);
      }
    });
  }

  private onVisibilityChangeImpl() {
    if (
      documentUtil.getVisibilityState() === 'visible' &&
      this.missedAutoReload
    ) {
      this.missedAutoReload = false;
      this.store.dispatch(reload());
    }
  }

  private load(reloadPeriodInMs: number) {
    this.reloadTimerId = setTimeout(() => {
      if (documentUtil.getVisibilityState() === 'visible') {
        this.store.dispatch(reload());
      } else {
        this.missedAutoReload = true;
      }
      this.load(reloadPeriodInMs);
    }, reloadPeriodInMs);
  }

  private cancelLoad() {
    if (this.reloadTimerId !== null) {
      clearTimeout(this.reloadTimerId);
    }
    this.reloadTimerId = null;
  }

  ngOnDestroy() {
    this.cancelLoad();
    window.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}

export const TEST_ONLY = {documentUtil};
