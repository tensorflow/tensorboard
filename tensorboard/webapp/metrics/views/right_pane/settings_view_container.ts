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
import {ChangeDetectionStrategy, Component, Signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {filter, map, take, withLatestFrom} from 'rxjs/operators';
import {State} from '../../../app_state';
import * as selectors from '../../../selectors';
import {TimeSelectionToggleAffordance} from '../../../widgets/card_fob/card_fob_types';
import {
  linkedTimeToggled,
  metricsChangeCardWidth,
  metricsChangeHistogramMode,
  metricsChangeImageBrightness,
  metricsChangeImageContrast,
  metricsChangeScalarSmoothing,
  metricsChangeTooltipSort,
  metricsChangeXAxisType,
  metricsEnableSavingPinsToggled,
  metricsResetCardWidth,
  metricsResetImageBrightness,
  metricsResetImageContrast,
  metricsScalarPartitionNonMonotonicXToggled,
  metricsChangeTooltipRowsLimit,
  metricsSlideoutMenuToggled,
  metricsToggleIgnoreOutliers,
  metricsToggleImageShowActualSize,
  metricsToggleLimitTooltipRows,
  rangeSelectionToggled,
  stepSelectorToggled,
} from '../../actions';
import {HistogramMode, TooltipSort, XAxisType} from '../../types';
import {
  SavingPinsDialogComponent,
  SavingPinsDialogResult,
} from './saving_pins_dialog/saving_pins_dialog_component';

@Component({
  standalone: false,
  selector: 'metrics-dashboard-settings',
  template: `
    <metrics-dashboard-settings-component
      [isImageSupportEnabled]="isImageSupportEnabled$ | async"
      [tooltipSort]="tooltipSort()"
      (tooltipSortChanged)="onTooltipSortChanged($event)"
      [ignoreOutliers]="ignoreOutliers()"
      (ignoreOutliersChanged)="onIgnoreOutliersChanged()"
      [isTooltipRowsLimitEnabled]="isTooltipRowsLimitEnabled()"
      (isTooltipRowsLimitEnabledChanged)="onIsTooltipRowsLimitEnabledChanged()"
      [tooltipRowsLimit]="tooltipRowsLimit()"
      (tooltipRowsLimitChanged)="onTooltipRowsLimitChanged($event)"
      [xAxisType]="xAxisType()"
      (xAxisTypeChanged)="onXAxisTypeChanged($event)"
      [cardMinWidth]="cardMinWidth()"
      (cardWidthChanged)="onCardWidthChanged($event)"
      (cardWidthReset)="onCardWidthReset()"
      [histogramMode]="histogramMode()"
      (histogramModeChanged)="onHistogramModeChanged($event)"
      [scalarSmoothing]="scalarSmoothing()"
      (scalarSmoothingChanged)="onScalarSmoothingChanged($event)"
      [scalarPartitionX]="scalarPartitionX()"
      (scalarPartitionXToggled)="onScalarPartitionXToggled()"
      [imageBrightnessInMilli]="imageBrightnessInMilli()"
      (imageBrightnessInMilliChanged)="onImageBrightnessInMilliChanged($event)"
      (imageBrightnessReset)="onImageBrightnessReset()"
      [imageContrastInMilli]="imageContrastInMilli()"
      (imageContrastInMilliChanged)="onImageContrastInMilliChanged($event)"
      (imageContrastReset)="onImageContrastReset()"
      [imageShowActualSize]="imageShowActualSize()"
      (imageShowActualSizeChanged)="onImageShowActualSizeChanged()"
      [isScalarStepSelectorEnabled]="isScalarStepSelectorEnabled()"
      [isScalarStepSelectorRangeEnabled]="isScalarStepSelectorRangeEnabled()"
      [isLinkedTimeEnabled]="isLinkedTimeEnabled()"
      [isScalarColumnCustomizationEnabled]="
        isScalarColumnCustomizationEnabled()
      "
      [linkedTimeSelection]="linkedTimeSelection()"
      [stepMinMax]="stepMinMax()"
      [isSlideOutMenuOpen]="isSlideOutMenuOpen()"
      (linkedTimeToggled)="onLinkedTimeToggled()"
      (stepSelectorToggled)="onStepSelectorToggled()"
      (rangeSelectionToggled)="onRangeSelectionToggled()"
      (onSlideOutToggled)="onSlideOutToggled()"
      [isSavingPinsEnabled]="isSavingPinsEnabled()"
      (onEnableSavingPinsToggled)="onEnableSavingPinsToggled($event)"
      [globalPinsFeatureEnabled]="globalPinsFeatureEnabled()"
    >
    </metrics-dashboard-settings-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsViewContainer {
  constructor(
    private readonly store: Store<State>,
    private readonly dialog: MatDialog
  ) {
    this.isScalarStepSelectorEnabled = this.store.selectSignal(
      selectors.getMetricsStepSelectorEnabled
    );
    this.isScalarStepSelectorRangeEnabled = this.store.selectSignal(
      selectors.getMetricsRangeSelectionEnabled
    );
    this.isLinkedTimeEnabled = this.store.selectSignal(
      selectors.getMetricsLinkedTimeEnabled
    );
    this.isScalarColumnCustomizationEnabled = this.store.selectSignal(
      selectors.getIsScalarColumnCustomizationEnabled
    );
    this.linkedTimeSelection = this.store.selectSignal(
      selectors.getMetricsLinkedTimeSelectionSetting
    );
    this.stepMinMax = this.store.selectSignal(selectors.getMetricsStepMinMax);
    this.isSlideOutMenuOpen = this.store.selectSignal(
      selectors.isMetricsSlideoutMenuOpen
    );
    // Genuinely async: filter(Boolean) + take(1) waits for feature flags to
    // load, so there is no synchronous value on subscribe. Stays on
    // AsyncPipe; see isImageSupportEnabled's nullable widening in
    // settings_view_component.ts.
    this.isImageSupportEnabled$ = this.store
      .select(selectors.getIsFeatureFlagsLoaded)
      .pipe(
        filter(Boolean),
        take(1),
        withLatestFrom(
          this.store.select(selectors.getIsMetricsImageSupportEnabled)
        ),
        map(([, isImagesSupported]) => {
          return isImagesSupported;
        })
      );
    this.tooltipSort = this.store.selectSignal(selectors.getMetricsTooltipSort);
    this.ignoreOutliers = this.store.selectSignal(
      selectors.getMetricsIgnoreOutliers
    );
    this.isTooltipRowsLimitEnabled = this.store.selectSignal(
      selectors.getMetricsIsTooltipRowsLimitEnabled
    );
    this.tooltipRowsLimit = this.store.selectSignal(
      selectors.getMetricsTooltipRowsLimit
    );
    this.xAxisType = this.store.selectSignal(selectors.getMetricsXAxisType);
    this.cardMinWidth = this.store.selectSignal(
      selectors.getMetricsCardMinWidth
    );
    this.histogramMode = this.store.selectSignal(
      selectors.getMetricsHistogramMode
    );
    this.scalarSmoothing = this.store.selectSignal(
      selectors.getMetricsScalarSmoothing
    );
    this.scalarPartitionX = this.store.selectSignal(
      selectors.getMetricsScalarPartitionNonMonotonicX
    );
    this.imageBrightnessInMilli = this.store.selectSignal(
      selectors.getMetricsImageBrightnessInMilli
    );
    this.imageContrastInMilli = this.store.selectSignal(
      selectors.getMetricsImageContrastInMilli
    );
    this.imageShowActualSize = this.store.selectSignal(
      selectors.getMetricsImageShowActualSize
    );
    this.isSavingPinsEnabled = this.store.selectSignal(
      selectors.getMetricsSavingPinsEnabled
    );
    this.globalPinsFeatureEnabled = this.store.selectSignal(
      selectors.getEnableGlobalPins
    );
  }

  readonly isScalarStepSelectorEnabled: Signal<boolean>;
  readonly isScalarStepSelectorRangeEnabled: Signal<boolean>;
  readonly isLinkedTimeEnabled: Signal<boolean>;
  readonly isScalarColumnCustomizationEnabled;
  readonly linkedTimeSelection;
  readonly stepMinMax;
  readonly isSlideOutMenuOpen;

  readonly isImageSupportEnabled$;

  readonly tooltipSort;
  readonly ignoreOutliers;
  readonly isTooltipRowsLimitEnabled;
  readonly tooltipRowsLimit;
  readonly xAxisType;
  readonly cardMinWidth;
  readonly histogramMode;
  readonly scalarSmoothing;
  readonly scalarPartitionX;
  readonly imageBrightnessInMilli;
  readonly imageContrastInMilli;
  readonly imageShowActualSize;
  readonly isSavingPinsEnabled;
  // Feature flag for global pins.
  readonly globalPinsFeatureEnabled;

  onTooltipSortChanged(sort: TooltipSort) {
    this.store.dispatch(metricsChangeTooltipSort({sort}));
  }

  onIgnoreOutliersChanged() {
    this.store.dispatch(metricsToggleIgnoreOutliers());
  }

  onIsTooltipRowsLimitEnabledChanged() {
    this.store.dispatch(metricsToggleLimitTooltipRows());
  }

  onTooltipRowsLimitChanged(tooltipRowsLimit: number) {
    this.store.dispatch(metricsChangeTooltipRowsLimit({tooltipRowsLimit}));
  }

  onXAxisTypeChanged(xAxisType: XAxisType) {
    this.store.dispatch(metricsChangeXAxisType({xAxisType}));
  }

  onCardWidthChanged(cardMinWidth: number) {
    this.store.dispatch(metricsChangeCardWidth({cardMinWidth}));
  }

  onCardWidthReset() {
    this.store.dispatch(metricsResetCardWidth());
  }

  onHistogramModeChanged(histogramMode: HistogramMode) {
    this.store.dispatch(metricsChangeHistogramMode({histogramMode}));
  }

  onScalarSmoothingChanged(smoothing: number) {
    this.store.dispatch(metricsChangeScalarSmoothing({smoothing}));
  }

  onScalarPartitionXToggled() {
    this.store.dispatch(metricsScalarPartitionNonMonotonicXToggled());
  }

  onImageBrightnessInMilliChanged(brightnessInMilli: number) {
    this.store.dispatch(metricsChangeImageBrightness({brightnessInMilli}));
  }

  onImageBrightnessReset() {
    this.store.dispatch(metricsResetImageBrightness());
  }

  onImageContrastReset() {
    this.store.dispatch(metricsResetImageContrast());
  }

  onImageContrastInMilliChanged(contrastInMilli: number) {
    this.store.dispatch(metricsChangeImageContrast({contrastInMilli}));
  }

  onImageShowActualSizeChanged() {
    this.store.dispatch(metricsToggleImageShowActualSize());
  }

  onLinkedTimeToggled() {
    this.store.dispatch(
      linkedTimeToggled({affordance: TimeSelectionToggleAffordance.CHECK_BOX})
    );
  }

  onStepSelectorToggled() {
    this.store.dispatch(
      stepSelectorToggled({
        affordance: TimeSelectionToggleAffordance.CHECK_BOX,
      })
    );
  }

  onRangeSelectionToggled() {
    this.store.dispatch(
      rangeSelectionToggled({
        affordance: TimeSelectionToggleAffordance.CHECK_BOX,
      })
    );
  }

  onSlideOutToggled() {
    this.store.dispatch(metricsSlideoutMenuToggled());
  }

  onEnableSavingPinsToggled(isChecked: boolean) {
    if (isChecked) {
      // Show a dialog when user disables the saving pins feature.
      const dialogRef = this.dialog.open(SavingPinsDialogComponent);
      dialogRef.afterClosed().subscribe((result?: SavingPinsDialogResult) => {
        if (result?.shouldDisable) {
          this.store.dispatch(metricsEnableSavingPinsToggled());
        }
      });
    } else {
      this.store.dispatch(metricsEnableSavingPinsToggled());
    }
  }
}
