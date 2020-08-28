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
import {
  FormControl,
  Validators,
  AbstractControl,
  ValidatorFn,
} from '@angular/forms';
import {Store, select, createSelector} from '@ngrx/store';

import {Subject} from 'rxjs';
import {takeUntil, debounceTime, filter} from 'rxjs/operators';

import {
  getReloadEnabled,
  getReloadPeriodInMs,
  State,
  getPageSize,
} from '../core/store';
import {
  toggleReloadEnabled,
  changeReloadPeriod,
  changePageSize,
} from '../core/actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

const getReloadPeriodInSec = createSelector(
  getReloadPeriodInMs,
  (periodInMs) => Math.round(periodInMs / 1000)
);

export function createIntegerValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    const numValue = Number(control.value);
    const valid = Math.round(numValue) === control.value;
    return valid ? null : {integer: {value: control.value}};
  };
}

@Component({
  selector: 'settings-dialog',
  template: `
    <h3>Settings</h3>
    <div>
      <div class="reload-toggle">
        <mat-checkbox
          [checked]="reloadEnabled$ | async"
          (change)="onReloadToggle()"
          >Reload data</mat-checkbox
        >
      </div>
      <div>
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
    </div>
    <div>
      <mat-form-field>
        <input
          class="page-size"
          matInput
          type="number"
          placeholder="Pagination Limit"
          [formControl]="paginationControl"
        />
      </mat-form-field>
      <mat-error *ngIf="paginationControl.invalid">
        Page size has to be a positive integer.
      </mat-error>
    </div>
  `,
  styleUrls: ['./dialog_component.css'],
})
export class SettingsDialogComponent implements OnInit, OnDestroy {
  readonly reloadEnabled$ = this.store.pipe(select(getReloadEnabled));
  readonly pageSize$ = this.store.pipe(select(getPageSize));
  private readonly reloadPeriodInSec$ = this.store.pipe(
    select(getReloadPeriodInSec)
  );
  readonly reloadPeriodControl = new FormControl(15, [
    Validators.required,
    Validators.min(15),
  ]);
  readonly paginationControl = new FormControl(1, [
    Validators.required,
    Validators.min(1),
    createIntegerValidator(),
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
        debounceTime(500),
        filter(() => this.reloadPeriodControl.valid)
      )
      .subscribe(() => {
        if (!this.reloadPeriodControl.valid) {
          return;
        }
        const periodInMs = this.reloadPeriodControl.value * 1000;
        this.store.dispatch(changeReloadPeriod({periodInMs}));
      });

    this.pageSize$
      .pipe(
        takeUntil(this.ngUnsubscribe),
        filter((value) => value !== this.paginationControl.value)
      )
      .subscribe((value) => {
        this.paginationControl.setValue(value);
      });

    this.paginationControl.valueChanges
      .pipe(
        takeUntil(this.ngUnsubscribe),
        debounceTime(500),
        filter(() => this.paginationControl.valid)
      )
      .subscribe(() => {
        this.store.dispatch(
          changePageSize({size: this.paginationControl.value})
        );
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
