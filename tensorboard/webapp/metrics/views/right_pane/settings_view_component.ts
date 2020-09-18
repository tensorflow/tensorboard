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
import {formatNumber} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  LOCALE_ID,
  Output,
} from '@angular/core';
import {auditTime} from 'rxjs/operators';

import {DropdownOption} from '../../../widgets/dropdown/dropdown_component';
import {HistogramMode, TooltipSort, XAxisType} from '../../types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

const SLIDER_AUDIT_TIME_MS = 250;

@Component({
  selector: 'metrics-dashboard-settings-component',
  templateUrl: 'settings_view_component.ng.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [`settings_view_component.css`],
})
export class SettingsViewComponent {
  constructor(@Inject(LOCALE_ID) private readonly locale: string) {}

  readonly TooltipSortDropdownOptions: DropdownOption[] = [
    {value: TooltipSort.DEFAULT, displayText: 'Default'},
    {value: TooltipSort.ASCENDING, displayText: 'Ascending'},
    {value: TooltipSort.DESCENDING, displayText: 'Descending'},
    {value: TooltipSort.NEAREST, displayText: 'Nearest'},
  ];
  @Input() tooltipSort!: TooltipSort;
  @Output() tooltipSortChanged = new EventEmitter<TooltipSort>();

  @Input() ignoreOutliers!: boolean;
  @Output() ignoreOutliersChanged = new EventEmitter<void>();

  readonly XAxisTypeDropdownOptions: DropdownOption[] = [
    {value: XAxisType.STEP, displayText: 'Step'},
    {value: XAxisType.RELATIVE, displayText: 'Relative'},
    {value: XAxisType.WALL_TIME, displayText: 'Wall'},
  ];
  @Input() xAxisType!: XAxisType;
  @Output() xAxisTypeChanged = new EventEmitter<XAxisType>();

  readonly HistogramModeDropdownOptions: DropdownOption[] = [
    {value: HistogramMode.OFFSET, displayText: 'Offset'},
    {value: HistogramMode.OVERLAY, displayText: 'Overlay'},
  ];
  @Input() histogramMode!: HistogramMode;
  @Output() histogramModeChanged = new EventEmitter<HistogramMode>();

  readonly scalarSmoothingControlChanged$ = new EventEmitter<number>();
  @Input() scalarSmoothing!: number;
  @Output()
  scalarSmoothingChanged = this.scalarSmoothingControlChanged$.pipe(
    auditTime(SLIDER_AUDIT_TIME_MS)
  );

  onScalarSmoothingInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.value) {
      return;
    }
    const nextValue = Math.min(Math.max(0, parseFloat(input.value)), 1);

    // Rectify here in case Angular does not trigger ngOnChanges when expected.
    if (nextValue !== parseFloat(input.value)) {
      input.value = String(nextValue);
    }
    this.scalarSmoothingControlChanged$.emit(nextValue);
  }

  readonly imageBrightnessSliderChanged$ = new EventEmitter<number>();
  @Input() imageBrightnessInMilli!: number;
  @Output()
  imageBrightnessInMilliChanged = this.imageBrightnessSliderChanged$.pipe(
    auditTime(SLIDER_AUDIT_TIME_MS)
  );
  @Output() imageBrightnessReset = new EventEmitter<void>();

  readonly imageContrastSliderChanged$ = new EventEmitter<number>();
  @Input() imageContrastInMilli!: number;
  @Output()
  imageContrastInMilliChanged = this.imageContrastSliderChanged$.pipe(
    auditTime(SLIDER_AUDIT_TIME_MS)
  );
  @Output() imageContrastReset = new EventEmitter<void>();

  @Input() imageShowActualSize!: boolean;
  @Output() imageShowActualSizeChanged = new EventEmitter<void>();

  formatMilliToZeroth(num: number): string {
    return formatNumber(
      num / 1000,
      // Our app does not, yet, specify LOCALE_ID. Default to en-US.
      this.locale || 'en-US',
      // The slider cannot fit 3 decimals.
      '1.0-2'
    );
  }
}

export const TEST_ONLY = {
  SLIDER_AUDIT_TIME_MS,
};
