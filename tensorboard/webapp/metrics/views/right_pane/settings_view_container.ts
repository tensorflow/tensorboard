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

import {State} from '../../../app_state';
import {
  metricsChangeHistogramMode,
  metricsChangeImageBrightness,
  metricsChangeImageContrast,
  metricsChangeScalarSmoothing,
  metricsChangeTooltipSort,
  metricsChangeXAxisType,
  metricsResetImageBrightness,
  metricsResetImageContrast,
  metricsToggleIgnoreOutliers,
  metricsToggleImageShowActualSize,
} from '../../actions';
import * as selectors from '../../store/metrics_selectors';
import {HistogramMode, TooltipSort, XAxisType} from '../../types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

@Component({
  selector: 'metrics-dashboard-settings',
  template: `
    <metrics-dashboard-settings-component
      [tooltipSort]="tooltipSort$ | async"
      (tooltipSortChanged)="onTooltipSortChanged($event)"
      [ignoreOutliers]="ignoreOutliers$ | async"
      (ignoreOutliersChanged)="onIgnoreOutliersChanged()"
      [xAxisType]="xAxisType$ | async"
      (xAxisTypeChanged)="onXAxisTypeChanged($event)"
      [histogramMode]="histogramMode$ | async"
      (histogramModeChanged)="onHistogramModeChanged($event)"
      [scalarSmoothing]="scalarSmoothing$ | async"
      (scalarSmoothingChanged)="onScalarSmoothingChanged($event)"
      [imageBrightnessInMilli]="imageBrightnessInMilli$ | async"
      (imageBrightnessInMilliChanged)="onImageBrightnessInMilliChanged($event)"
      (imageBrightnessReset)="onImageBrightnessReset()"
      [imageContrastInMilli]="imageContrastInMilli$ | async"
      (imageContrastInMilliChanged)="onImageContrastInMilliChanged($event)"
      (imageContrastReset)="onImageContrastReset()"
      [imageShowActualSize]="imageShowActualSize$ | async"
      (imageShowActualSizeChanged)="onImageShowActualSizeChanged()"
    >
    </metrics-dashboard-settings-component>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsViewContainer {
  constructor(private readonly store: Store<State>) {}

  readonly tooltipSort$ = this.store.select(selectors.getMetricsTooltipSort);
  readonly ignoreOutliers$ = this.store.select(
    selectors.getMetricsIgnoreOutliers
  );
  readonly xAxisType$ = this.store.select(selectors.getMetricsXAxisType);
  readonly histogramMode$ = this.store.select(
    selectors.getMetricsHistogramMode
  );
  readonly scalarSmoothing$ = this.store.select(
    selectors.getMetricsScalarSmoothing
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

  onHistogramModeChanged(histogramMode: HistogramMode) {
    this.store.dispatch(metricsChangeHistogramMode({histogramMode}));
  }

  onScalarSmoothingChanged(smoothing: number) {
    this.store.dispatch(metricsChangeScalarSmoothing({smoothing}));
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
}
