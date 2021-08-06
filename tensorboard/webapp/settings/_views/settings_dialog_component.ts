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
import {
  Component,
  OnInit,
  OnDestroy,
  SimpleChanges,
  OnChanges,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  FormControl,
  Validators,
  AbstractControl,
  ValidatorFn,
} from '@angular/forms';
import {Subject} from 'rxjs';
import {takeUntil, debounceTime, filter} from 'rxjs/operators';

import {MIN_RELOAD_PERIOD_IN_MS} from '../_redux/settings_reducers';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

export function createIntegerValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    const numValue = Number(control.value);
    const valid = Math.round(numValue) === control.value;
    return valid ? null : {integer: {value: control.value}};
  };
}

@Component({
  selector: 'settings-dialog-component',
  template: `
    <h3>Settings</h3>
    <div>
      <div class="reload-toggle">
        <mat-checkbox [checked]="reloadEnabled" (change)="onReloadToggle()"
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
          Reload period has to be minimum of
          {{ MIN_RELOAD_PERIOD_IN_S }} seconds.
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
  styleUrls: ['./settings_dialog_component.css'],
})
export class SettingsDialogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() reloadEnabled!: boolean;
  @Input() reloadPeriodInMs!: number;
  @Input() pageSize!: number;
  @Output() reloadToggled = new EventEmitter();
  @Output() reloadPeriodInMsChanged = new EventEmitter<number>();
  @Output() pageSizeChanged = new EventEmitter<number>();

  readonly MIN_RELOAD_PERIOD_IN_S = MIN_RELOAD_PERIOD_IN_MS / 1000;
  readonly reloadPeriodControl = new FormControl(this.MIN_RELOAD_PERIOD_IN_S, [
    Validators.required,
    Validators.min(this.MIN_RELOAD_PERIOD_IN_S),
  ]);
  readonly paginationControl = new FormControl(1, [
    Validators.required,
    Validators.min(1),
    createIntegerValidator(),
  ]);

  private ngUnsubscribe = new Subject();

  ngOnInit() {
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
        this.reloadPeriodInMsChanged.emit(periodInMs);
      });

    this.paginationControl.valueChanges
      .pipe(
        takeUntil(this.ngUnsubscribe),
        debounceTime(500),
        filter(() => this.paginationControl.valid)
      )
      .subscribe(() => {
        this.pageSizeChanged.emit(this.paginationControl.value);
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['reloadPeriodInMs']) {
      const change = changes['reloadPeriodInMs'];
      if (change.previousValue !== change.currentValue) {
        this.reloadPeriodControl.setValue(change.currentValue / 1000);
      }
    }

    if (changes['reloadEnabled']) {
      const change = changes['reloadEnabled'];
      if (change.currentValue) this.reloadPeriodControl.enable();
      else this.reloadPeriodControl.disable();
    }

    if (changes['pageSize']) {
      const change = changes['pageSize'];
      if (change.previousValue !== change.currentValue) {
        this.paginationControl.setValue(change.currentValue);
      }
    }
  }

  onReloadToggle(): void {
    this.reloadToggled.emit();
  }
}
