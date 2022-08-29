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
  metricsResetCardWidth,
  metricsResetImageBrightness,
  metricsResetImageContrast,
  metricsScalarPartitionNonMonotonicXToggled,
  metricsToggleIgnoreOutliers,
  metricsToggleImageShowActualSize,
  stepSelectorToggled,
  timeSelectionChanged,
} from '../../actions';
import {
  HistogramMode,
  TimeSelection,
  TooltipSort,
  XAxisType,
} from '../../types';

@Component({
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
      [isLinkedTimeFeatureEnabled]="isLinkedTimeFeatureEnabled$ | async"
      [isScalarStepSelectorFeatureEnabled]="
        isScalarStepSelectorFeatureEnabled$ | async
      "
      [isScalarStepSelectorEnabled]="isScalarStepSelectorEnabled$ | async"
      [isLinkedTimeEnabled]="isLinkedTimeEnabled$ | async"
      [linkedTimeSelection]="linkedTimeSelection$ | async"
      [stepMinMax]="stepMinMax$ | async"
      (linkedTimeToggled)="onLinkedTimeToggled()"
      (linkedTimeSelectionChanged)="onLinkedTimeSelectionChanged($event)"
      (stepSelectorToggled)="onStepSelectorToggled()"
    >
    </metrics-dashboard-settings-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsViewContainer {
  constructor(private readonly store: Store<State>) {}

  readonly isLinkedTimeFeatureEnabled$: Observable<boolean> = this.store.select(
    selectors.getIsLinkedTimeEnabled
  );
  readonly isScalarStepSelectorFeatureEnabled$: Observable<boolean> =
    this.store.select(selectors.getIsDataTableEnabled);
  readonly isScalarStepSelectorEnabled$: Observable<boolean> =
    this.store.select(selectors.getMetricsStepSelectorEnabled);
  readonly isLinkedTimeEnabled$: Observable<boolean> = this.store.select(
    selectors.getMetricsLinkedTimeEnabled
  );
  readonly linkedTimeSelection$ = this.store.select(
    selectors.getMetricsLinkedTimeSelectionSetting
  );
  readonly stepMinMax$ = this.store.select(selectors.getMetricsStepMinMax);

  readonly isImageSupportEnabled$ = this.store
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

  readonly tooltipSort$ = this.store.select(selectors.getMetricsTooltipSort);
  readonly ignoreOutliers$ = this.store.select(
    selectors.getMetricsIgnoreOutliers
  );
  readonly xAxisType$ = this.store.select(selectors.getMetricsXAxisType);
  readonly cardMinWidth$ = this.store.select(selectors.getMetricsCardMinWidth);
  readonly histogramMode$ = this.store.select(
    selectors.getMetricsHistogramMode
  );
  readonly scalarSmoothing$ = this.store.select(
    selectors.getMetricsScalarSmoothing
  );
  readonly scalarPartitionX$ = this.store.select(
    selectors.getMetricsScalarPartitionNonMonotonicX
  );
  readonly imageBrightnessInMilli$ = this.store.select(
    selectors.getMetricsImageBrightnessInMilli
  );
  readonly imageContrastInMilli$ = this.store.select(
    selectors.getMetricsImageContrastInMilli
  );
  readonly imageShowActualSize$ = this.store.select(
    selectors.getMetricsImageShowActualSize
  );

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
      stepSelectorToggled({affordance: TimeSelectionToggleAffordance.CHECK_BOX})
    );
  }

  onLinkedTimeSelectionChanged(timeSelection: TimeSelection) {
    this.store.dispatch(timeSelectionChanged({timeSelection}));
  }
}
