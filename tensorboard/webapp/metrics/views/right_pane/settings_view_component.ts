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
import {
  HistogramMode,
  SCALARS_SMOOTHING_MAX,
  TimeSelection,
  TooltipSort,
  XAxisType,
} from '../../types';
import {LinkedTimeSelectionChanged} from './types';

const SLIDER_AUDIT_TIME_MS = 250;

/**
 * Minimum card width ranges from 335 to 735 px.
 */
const MAX_CARD_WIDTH_SLIDER_VALUE = 735;
const MIN_CARD_WIDTH_SLIDER_VALUE = 335;

/**
 * When smoothing === 1, all lines become flat on the x-axis, which is not
 * useful at all. Use a maximum smoothing value < 1.
 */
const MAX_SMOOTHING_VALUE = SCALARS_SMOOTHING_MAX;

/**
 * The smoothing slider has a step size of 0.01. Angular's rounding logic makes
 * the effective maximum value 1, even when the 'max' attribute is set to 0.999.
 * Set this value to the nearest value less than MAX_SMOOTHING_VALUE that is
 * representable as 'min' + k * 'step'.
 */
const MAX_SMOOTHING_SLIDER_VALUE = 0.99;

@Component({
  selector: 'metrics-dashboard-settings-component',
  templateUrl: 'settings_view_component.ng.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: [`settings_view_component.css`],
})
export class SettingsViewComponent {
  constructor(@Inject(LOCALE_ID) private readonly locale: string) {}

  @Input() isLinkedTimeFeatureEnabled!: boolean;
  @Input() isRangeSelectionAllowed!: boolean;
  @Input() isLinkedTimeEnabled!: boolean;
  @Input() isScalarStepSelectorFeatureEnabled!: boolean;
  @Input() isScalarStepSelectorEnabled!: boolean;
  @Input() isScalarStepSelectorRangeEnabled!: boolean;
  @Input() isScalarColumnCustomizationEnabled!: boolean;
  @Input() linkedTimeSelection!: TimeSelection | null;
  @Input() stepMinMax!: {min: number; max: number};
  @Input() isSlideOutMenuOpen!: boolean;

  @Input() numEmptyCards!: number;
  @Input() hideEmptyCards!: boolean;

  @Output() hideEmptyCardsToggled = new EventEmitter<boolean>();

  @Output() linkedTimeToggled = new EventEmitter<void>();
  @Output()
  linkedTimeSelectionChanged = new EventEmitter<LinkedTimeSelectionChanged>();

  @Output() stepSelectorToggled = new EventEmitter<void>();
  @Output() rangeSelectionToggled = new EventEmitter<void>();
  @Output() onSlideOutToggled = new EventEmitter<void>();

  @Input() isImageSupportEnabled!: boolean;

  readonly TooltipSortDropdownOptions: DropdownOption[] = [
    {value: TooltipSort.ALPHABETICAL, displayText: 'Alphabetical'},
    {value: TooltipSort.ASCENDING, displayText: 'Ascending'},
    {value: TooltipSort.DESCENDING, displayText: 'Descending'},
    {value: TooltipSort.NEAREST, displayText: 'Nearest Pixel'},
    {value: TooltipSort.NEAREST_Y, displayText: 'Nearest Y'},
  ];
  @Input() tooltipSort!: TooltipSort;
  @Output() tooltipSortChanged = new EventEmitter<TooltipSort>();

  @Input() ignoreOutliers!: boolean;
  @Output() ignoreOutliersChanged = new EventEmitter<void>();

  readonly XAxisType = XAxisType;
  readonly XAxisTypeDropdownOptions: DropdownOption[] = [
    {value: XAxisType.STEP, displayText: 'Step'},
    {value: XAxisType.RELATIVE, displayText: 'Relative'},
    {value: XAxisType.WALL_TIME, displayText: 'Wall'},
  ];
  @Input() xAxisType!: XAxisType;
  @Output() xAxisTypeChanged = new EventEmitter<XAxisType>();

  readonly MAX_CARD_WIDTH_SLIDER_VALUE = MAX_CARD_WIDTH_SLIDER_VALUE;
  readonly MIN_CARD_WIDTH_SLIDER_VALUE = MIN_CARD_WIDTH_SLIDER_VALUE;
  readonly cardWidthSliderChanged$ = new EventEmitter<number>();
  @Input() cardMinWidth!: number;
  @Output()
  cardWidthChanged = this.cardWidthSliderChanged$.pipe(
    auditTime(SLIDER_AUDIT_TIME_MS)
  );
  @Output() cardWidthReset = new EventEmitter<void>();

  readonly HistogramModeDropdownOptions: DropdownOption[] = [
    {value: HistogramMode.OFFSET, displayText: 'Offset'},
    {value: HistogramMode.OVERLAY, displayText: 'Overlay'},
  ];
  @Input() histogramMode!: HistogramMode;
  @Output() histogramModeChanged = new EventEmitter<HistogramMode>();

  readonly MAX_SMOOTHING_VALUE = MAX_SMOOTHING_VALUE;
  readonly MAX_SMOOTHING_SLIDER_VALUE = MAX_SMOOTHING_SLIDER_VALUE;

  readonly scalarSmoothingControlChanged$ = new EventEmitter<number>();
  @Input() scalarSmoothing!: number;
  @Output()
  scalarSmoothingChanged = this.scalarSmoothingControlChanged$.pipe(
    auditTime(SLIDER_AUDIT_TIME_MS)
  );

  @Input() scalarPartitionX!: boolean;
  @Output() scalarPartitionXToggled = new EventEmitter();

  onScalarSmoothingInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.value) {
      return;
    }
    const nextValue = Math.min(
      Math.max(0, parseFloat(input.value)),
      MAX_SMOOTHING_VALUE
    );

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

  getLinkedTimeSelectionStartStep() {
    if (
      !this.isLinkedTimeEnabled &&
      this.linkedTimeSelection !== null &&
      this.linkedTimeSelection.end === null
    ) {
      return this.linkedTimeSelection.start.step;
    }
    return '';
  }

  isAxisTypeStep(): boolean {
    return this.xAxisType === XAxisType.STEP;
  }
}

export const TEST_ONLY = {
  SLIDER_AUDIT_TIME_MS,
  MIN_CARD_WIDTH_SLIDER_VALUE,
  MAX_SMOOTHING_VALUE,
};
