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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
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
  metricsSlideoutMenuToggled,
  metricsToggleIgnoreOutliers,
  metricsToggleImageShowActualSize,
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
      [tooltipSort]="tooltipSort$ | async"
      (tooltipSortChanged)="onTooltipSortChanged($event)"
      [ignoreOutliers]="ignoreOutliers$ | async"
      (ignoreOutliersChanged)="onIgnoreOutliersChanged()"
      [xAxisType]="xAxisType$ | async"
      (xAxisTypeChanged)="onXAxisTypeChanged($event)"
      [cardMinWidth]="cardMinWidth$ | async"
      (cardWidthChanged)="onCardWidthChanged($event)"
      (cardWidthReset)="onCardWidthReset()"
      [histogramMode]="histogramMode$ | async"
      (histogramModeChanged)="onHistogramModeChanged($event)"
      [scalarSmoothing]="scalarSmoothing$ | async"
      (scalarSmoothingChanged)="onScalarSmoothingChanged($event)"
      [scalarPartitionX]="scalarPartitionX$ | async"
      (scalarPartitionXToggled)="onScalarPartitionXToggled()"
      [imageBrightnessInMilli]="imageBrightnessInMilli$ | async"
      (imageBrightnessInMilliChanged)="onImageBrightnessInMilliChanged($event)"
      (imageBrightnessReset)="onImageBrightnessReset()"
      [imageContrastInMilli]="imageContrastInMilli$ | async"
      (imageContrastInMilliChanged)="onImageContrastInMilliChanged($event)"
      (imageContrastReset)="onImageContrastReset()"
      [imageShowActualSize]="imageShowActualSize$ | async"
      (imageShowActualSizeChanged)="onImageShowActualSizeChanged()"
      [isScalarStepSelectorEnabled]="isScalarStepSelectorEnabled$ | async"
      [isScalarStepSelectorRangeEnabled]="
        isScalarStepSelectorRangeEnabled$ | async
      "
      [isLinkedTimeEnabled]="isLinkedTimeEnabled$ | async"
      [isScalarColumnCustomizationEnabled]="
        isScalarColumnCustomizationEnabled$ | async
      "
      [linkedTimeSelection]="linkedTimeSelection$ | async"
      [stepMinMax]="stepMinMax$ | async"
      [isSlideOutMenuOpen]="isSlideOutMenuOpen$ | async"
      (linkedTimeToggled)="onLinkedTimeToggled()"
      (stepSelectorToggled)="onStepSelectorToggled()"
      (rangeSelectionToggled)="onRangeSelectionToggled()"
      (onSlideOutToggled)="onSlideOutToggled()"
      [isSavingPinsEnabled]="isSavingPinsEnabled$ | async"
      (onEnableSavingPinsToggled)="onEnableSavingPinsToggled($event)"
      [globalPinsFeatureEnabled]="globalPinsFeatureEnabled$ | async"
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
    this.isScalarStepSelectorEnabled$ = this.store.select(
      selectors.getMetricsStepSelectorEnabled
    );
    this.isScalarStepSelectorRangeEnabled$ = this.store.select(
      selectors.getMetricsRangeSelectionEnabled
    );
    this.isLinkedTimeEnabled$ = this.store.select(
      selectors.getMetricsLinkedTimeEnabled
    );
    this.isScalarColumnCustomizationEnabled$ = this.store.select(
      selectors.getIsScalarColumnCustomizationEnabled
    );
    this.linkedTimeSelection$ = this.store.select(
      selectors.getMetricsLinkedTimeSelectionSetting
    );
    this.stepMinMax$ = this.store.select(selectors.getMetricsStepMinMax);
    this.isSlideOutMenuOpen$ = this.store.select(
      selectors.isMetricsSlideoutMenuOpen
    );
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
    this.tooltipSort$ = this.store.select(selectors.getMetricsTooltipSort);
    this.ignoreOutliers$ = this.store.select(
      selectors.getMetricsIgnoreOutliers
    );
    this.xAxisType$ = this.store.select(selectors.getMetricsXAxisType);
    this.cardMinWidth$ = this.store.select(selectors.getMetricsCardMinWidth);
    this.histogramMode$ = this.store.select(selectors.getMetricsHistogramMode);
    this.scalarSmoothing$ = this.store.select(
      selectors.getMetricsScalarSmoothing
    );
    this.scalarPartitionX$ = this.store.select(
      selectors.getMetricsScalarPartitionNonMonotonicX
    );
    this.imageBrightnessInMilli$ = this.store.select(
      selectors.getMetricsImageBrightnessInMilli
    );
    this.imageContrastInMilli$ = this.store.select(
      selectors.getMetricsImageContrastInMilli
    );
    this.imageShowActualSize$ = this.store.select(
      selectors.getMetricsImageShowActualSize
    );
    this.isSavingPinsEnabled$ = this.store.select(
      selectors.getMetricsSavingPinsEnabled
    );
    this.globalPinsFeatureEnabled$ = this.store.select(
      selectors.getEnableGlobalPins
    );
  }

  readonly isScalarStepSelectorEnabled$: Observable<boolean>;
  readonly isScalarStepSelectorRangeEnabled$: Observable<boolean>;
  readonly isLinkedTimeEnabled$: Observable<boolean>;
  readonly isScalarColumnCustomizationEnabled$;
  readonly linkedTimeSelection$;
  readonly stepMinMax$;
  readonly isSlideOutMenuOpen$;

  readonly isImageSupportEnabled$;

  readonly tooltipSort$;
  readonly ignoreOutliers$;
  readonly xAxisType$;
  readonly cardMinWidth$;
  readonly histogramMode$;
  readonly scalarSmoothing$;
  readonly scalarPartitionX$;
  readonly imageBrightnessInMilli$;
  readonly imageContrastInMilli$;
  readonly imageShowActualSize$;
  readonly isSavingPinsEnabled$;
  // Feature flag for global pins.
  readonly globalPinsFeatureEnabled$;

  onTooltipSortChanged(sort: TooltipSort) {
    this.store.dispatch(metricsChangeTooltipSort({sort}));
  }

  onIgnoreOutliersChanged() {
    this.store.dispatch(metricsToggleIgnoreOutliers());
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
