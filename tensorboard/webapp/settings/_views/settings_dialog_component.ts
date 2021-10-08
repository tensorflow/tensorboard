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
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {Subject} from 'rxjs';
import {debounceTime, filter, takeUntil} from 'rxjs/operators';

import {ColorPalette} from '../../util/colors';
import {
  DataSeries,
  DataSeriesMetadata,
  DataSeriesMetadataMap,
  RendererType,
} from '../../widgets/line_chart_v2/types';
import {MIN_RELOAD_PERIOD_IN_MS} from '../_redux/settings_reducers';

export function createIntegerValidator(): ValidatorFn {
  return (control: AbstractControl): {[key: string]: any} | null => {
    const numValue = Number(control.value);
    const valid = Math.round(numValue) === control.value;
    return valid ? null : {integer: {value: control.value}};
  };
}

@Component({
  selector: 'settings-dialog-component',
  templateUrl: 'settings_dialog_component.ng.html',
  styleUrls: ['./settings_dialog_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() reloadEnabled!: boolean;
  @Input() reloadPeriodInMs!: number;
  @Input() pageSize!: number;
  @Input() useDarkMode!: boolean;
  @Input() knownPalettes!: ColorPalette[];
  @Input() currentPalette!: ColorPalette;
  @Output() reloadToggled = new EventEmitter();
  @Output() reloadPeriodInMsChanged = new EventEmitter<number>();
  @Output() pageSizeChanged = new EventEmitter<number>();
  @Output() paletteChanged = new EventEmitter<string>();

  readonly RendererType = RendererType;
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

  private ngUnsubscribe = new Subject<void>();

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

  getLineChartData(): Array<DataSeries & DataSeriesMetadata> {
    return Array.from(new Array(20)).map((_, index) => {
      const colorIndex = index % this.currentPalette.colors.length;
      const color = this.currentPalette.colors[colorIndex];
      return {
        id: String(index),
        points: [
          {x: 0, y: index},
          {x: 1, y: index},
        ],
        displayName: `Preview: ${color.name} (${colorIndex}th color)`,
        visible: true,
        color: this.useDarkMode ? color.darkHex : color.lightHex,
      };
    });
  }

  getLineChartSeriesMap(): DataSeriesMetadataMap {
    return Object.fromEntries(
      this.getLineChartData().map((entry) => [entry.id, entry])
    );
  }
}
