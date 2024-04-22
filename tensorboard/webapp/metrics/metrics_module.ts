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
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {EffectsModule} from '@ngrx/effects';
import {Action, createSelector, StoreModule} from '@ngrx/store';
import {AlertActionModule} from '../alert/alert_action_module';
import {AppRoutingModule} from '../app_routing/app_routing_module';
import {CoreModule} from '../core/core_module';
import {PluginRegistryModule} from '../plugins/plugin_registry_module';
import * as actions from './actions';
import {
  MetricsDataSourceModule,
  METRICS_PLUGIN_ID,
  SavedPinsDataSourceModule,
} from './data_source';
import {MetricsEffects} from './effects';
import {
  getMetricsCardMinWidth,
  getMetricsIgnoreOutliers,
  getMetricsLinkedTimeEnabled,
  getMetricsRangeSelectionEnabled,
  getMetricsScalarSmoothing,
  getMetricsStepSelectorEnabled,
  getMetricsTooltipSort,
  getMetricsSavingPinsEnabled,
  getRangeSelectionHeaders,
  getSingleSelectionHeaders,
  isMetricsSettingsPaneOpen,
  METRICS_FEATURE_KEY,
  METRICS_SETTINGS_DEFAULT,
  reducers,
} from './store';
import {
  getConfig,
  METRICS_INITIAL_SETTINGS,
  METRICS_STORE_CONFIG_TOKEN,
} from './store/metrics_initial_state_provider';
import {MetricsDashboardContainer} from './views/metrics_container';
import {MetricsViewsModule} from './views/metrics_views_module';
import {FeatureFlagModule} from '../feature_flag/feature_flag_module';
import {
  PersistentSettingsConfigModule,
  PersistentSettingsModule,
} from '../persistent_settings';

const CREATE_PIN_MAX_EXCEEDED_TEXT =
  `Max pin limit exceeded. Remove existing` +
  ` pins before adding more. See ` +
  `https://github.com/tensorflow/tensorboard/issues/4242`;

// Note: Angular can only reference symbols from the @NgModule if they are
// exported.
export function alertActionProvider() {
  return [
    {
      actionCreator: actions.cardPinStateToggled,
      alertFromAction: (action: Action) => {
        const {wasPinned, canCreateNewPins} = action as ReturnType<
          typeof actions.cardPinStateToggled
        >;
        if (!wasPinned && !canCreateNewPins) {
          return {localizedMessage: CREATE_PIN_MAX_EXCEEDED_TEXT};
        }
        return null;
      },
    },
  ];
}

export function getSmoothingSettingFactory() {
  return createSelector(getMetricsScalarSmoothing, (smoothing) => {
    return {scalarSmoothing: smoothing};
  });
}

export function getMetricsIgnoreOutliersSettingFactory() {
  return createSelector(getMetricsIgnoreOutliers, (ignoreOutliers) => {
    return {ignoreOutliers};
  });
}

export function getMetricsTooltipSortSettingFactory() {
  return createSelector(getMetricsTooltipSort, (tooltipSort) => {
    return {tooltipSort: String(tooltipSort)};
  });
}

export function getMetricsTimeSeriesSettingsPaneOpen() {
  return createSelector(isMetricsSettingsPaneOpen, (isOpened) => {
    return {timeSeriesSettingsPaneOpened: isOpened};
  });
}

export function getMetricsTimeSeriesCardMinWidth() {
  return createSelector(getMetricsCardMinWidth, (cardMinWidth) => {
    return {timeSeriesCardMinWidth: cardMinWidth};
  });
}
export function getMetricsTimeSeriesStepSelectorEnabled() {
  return createSelector(getMetricsStepSelectorEnabled, (isEnabled) => {
    return {stepSelectorEnabled: isEnabled};
  });
}

export function getMetricsTimeSeriesRangeSelectionEnabled() {
  return createSelector(getMetricsRangeSelectionEnabled, (isEnabled) => {
    return {rangeSelectionEnabled: isEnabled};
  });
}
export function getMetricsTimeSeriesLinkedTimeEnabled() {
  return createSelector(getMetricsLinkedTimeEnabled, (isEnabled) => {
    return {linkedTimeEnabled: isEnabled};
  });
}

export function getMetricsTimeSeriesSavingPinsEnabled() {
  return createSelector(getMetricsSavingPinsEnabled, (isEnabled) => {
    return {savingPinsEnabled: isEnabled};
  });
}

export function getSingleSelectionHeadersFactory() {
  return createSelector(getSingleSelectionHeaders, (singleSelectionHeaders) => {
    return {singleSelectionHeaders};
  });
}

export function getRangeSelectionHeadersFactory() {
  return createSelector(getRangeSelectionHeaders, (rangeSelectionHeaders) => {
    return {rangeSelectionHeaders};
  });
}

@NgModule({
  imports: [
    CommonModule,
    AppRoutingModule,
    CoreModule,
    PluginRegistryModule.forPlugin(
      METRICS_PLUGIN_ID,
      MetricsDashboardContainer
    ),
    MetricsDataSourceModule,
    MetricsViewsModule,
    StoreModule.forFeature(
      METRICS_FEATURE_KEY,
      reducers,
      METRICS_STORE_CONFIG_TOKEN
    ),
    SavedPinsDataSourceModule,
    FeatureFlagModule,
    PersistentSettingsModule,
    EffectsModule.forFeature([MetricsEffects]),
    AlertActionModule.registerAlertActions(alertActionProvider),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getSmoothingSettingFactory
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsIgnoreOutliersSettingFactory
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsTooltipSortSettingFactory
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsTimeSeriesSettingsPaneOpen
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsTimeSeriesCardMinWidth
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsTimeSeriesStepSelectorEnabled
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsTimeSeriesRangeSelectionEnabled
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsTimeSeriesLinkedTimeEnabled
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getSingleSelectionHeadersFactory
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getRangeSelectionHeadersFactory
    ),
    PersistentSettingsConfigModule.defineGlobalSetting(
      getMetricsTimeSeriesSavingPinsEnabled
    ),
  ],
  providers: [
    {
      provide: METRICS_STORE_CONFIG_TOKEN,
      useFactory: getConfig,
      deps: [METRICS_INITIAL_SETTINGS],
    },
    {
      provide: METRICS_INITIAL_SETTINGS,
      useValue: METRICS_SETTINGS_DEFAULT,
    },
  ],
})
export class MetricsModule {}
