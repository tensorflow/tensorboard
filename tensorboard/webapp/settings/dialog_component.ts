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
import {Component, OnInit, OnDestroy} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';
import {Store, select, createSelector} from '@ngrx/store';

import {Subject} from 'rxjs';
import {takeUntil, debounceTime, filter} from 'rxjs/operators';

import {getReloadEnabled, getReloadPeriodInMs, State} from '../core/store';
import {toggleReloadEnabled, changeReloadPeriod} from '../core/actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

const getReloadPeriodInSec = createSelector(
  getReloadPeriodInMs,
  (periodInMs) => Math.round(periodInMs / 1000)
);

@Component({
  selector: 'settings-dialog',
  template: `
    <h3>Settings</h3>
    <div class="item">
      <mat-checkbox
        [checked]="reloadEnabled$ | async"
        (change)="onReloadToggle()"
        >Reload data</mat-checkbox
      >
    </div>
    <div class="item">
      <mat-form-field>
        <input
          class="reload-period"
          matInput
          type="number"
          placeholder="Reload Period"
          [formControl]="reloadPeriodControl"
        />
      </mat-form-field>
      <mat-error
        *ngIf="
          reloadPeriodControl.hasError('min') ||
          reloadPeriodControl.hasError('required')
        "
      >
        Reload period has to be minimum of 15 seconds.
      </mat-error>
    </div>
  `,
  styleUrls: ['./dialog_component.css'],
})
export class SettingsDialogComponent implements OnInit, OnDestroy {
  readonly reloadEnabled$ = this.store.pipe(select(getReloadEnabled));
  private readonly reloadPeriodInSec$ = this.store.pipe(
    select(getReloadPeriodInSec)
  );
  readonly reloadPeriodControl = new FormControl(15, [
    Validators.required,
    Validators.min(15),
  ]);
  private ngUnsubscribe = new Subject();

  constructor(private store: Store<State>) {}

  ngOnInit() {
    this.reloadPeriodInSec$
      .pipe(
        takeUntil(this.ngUnsubscribe),
        filter((value) => value !== this.reloadPeriodControl.value)
      )
      .subscribe((value) => {
        this.reloadPeriodControl.setValue(value);
      });

    this.reloadEnabled$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((value) => {
        if (value) this.reloadPeriodControl.enable();
        else this.reloadPeriodControl.disable();
      });

    this.reloadPeriodControl.valueChanges
      .pipe(
        takeUntil(this.ngUnsubscribe),
        debounceTime(500)
      )
      .subscribe(() => {
        if (!this.reloadPeriodControl.valid) {
          return;
        }
        const periodInMs = this.reloadPeriodControl.value * 1000;
        this.store.dispatch(changeReloadPeriod({periodInMs}));
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onReloadToggle(): void {
    this.store.dispatch(toggleReloadEnabled());
  }
}
