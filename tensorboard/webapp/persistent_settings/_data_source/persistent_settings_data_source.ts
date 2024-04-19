/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {Injectable} from '@angular/core';
import {EMPTY, Observable, of} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {ColumnHeader} from '../../widgets/data_table/types';
import {BackendSettings, PersistableSettings, ThemeValue} from './types';

const LEGACY_METRICS_LOCAL_STORAGE_KEY = '_tb_global_settings.timeseries';
const GLOBAL_LOCAL_STORAGE_KEY = '_tb_global_settings';
const NOTIFICATION_LAST_READ_TIME_KEY = 'notificationLastReadTimestamp';

/** Updates context menu related properties for given headers.
 *
 * Useful for correcting properties that were saved to backend in a possibly inconsistent state.
 */
function updateScalarContextMenuOptions(headers: ColumnHeader[]) {
  headers.forEach((header) => {
    header.sortable = true;

    if (header.type === 'RUN') {
      header.movable = false;
      header.removable = false;
    } else {
      header.movable = true;
      header.removable = true;
    }
  });
}

@Injectable()
export abstract class PersistentSettingsDataSource<UiSettings> {
  abstract setSettings(partialSetting: Partial<UiSettings>): Observable<void>;
  abstract getSettings(): Observable<Partial<UiSettings>>;
}

@Injectable()
export abstract class SettingsConverter<UiSettings, StorageSettings> {
  abstract uiToBackend(
    uiSettings: Partial<UiSettings>
  ): Partial<StorageSettings>;
  abstract backendToUi(
    backendSettings: Partial<StorageSettings>
  ): Partial<UiSettings>;
}

@Injectable()
export class OSSSettingsConverter extends SettingsConverter<
  PersistableSettings,
  BackendSettings
> {
  uiToBackend(settings: PersistableSettings): BackendSettings {
    const serializableSettings: BackendSettings = {};

    if (settings.ignoreOutliers !== undefined) {
      serializableSettings.ignoreOutliers = settings.ignoreOutliers;
    }
    if (settings.scalarSmoothing !== undefined) {
      serializableSettings.scalarSmoothing = settings.scalarSmoothing;
    }
    if (settings.tooltipSort !== undefined) {
      // TooltipSort is a string enum and has string values; no need to
      // serialize it differently to account for their unintended changes.
      serializableSettings.tooltipSort = settings.tooltipSort;
    }
    if (settings.autoReload !== undefined) {
      serializableSettings.autoReload = settings.autoReload;
    }
    if (settings.autoReloadPeriodInMs !== undefined) {
      serializableSettings.autoReloadPeriodInMs = settings.autoReloadPeriodInMs;
    }
    if (settings.pageSize !== undefined) {
      serializableSettings.paginationSize = settings.pageSize;
    }
    if (settings.themeOverride !== undefined) {
      serializableSettings.theme = settings.themeOverride;
    }
    if (settings.notificationLastReadTimeInMs !== undefined) {
      serializableSettings.notificationLastReadTimeInMs =
        settings.notificationLastReadTimeInMs;
    }
    if (settings.sideBarWidthInPercent !== undefined) {
      serializableSettings.sideBarWidthInPercent =
        settings.sideBarWidthInPercent;
    }
    if (settings.timeSeriesSettingsPaneOpened !== undefined) {
      serializableSettings.timeSeriesSettingsPaneOpened =
        settings.timeSeriesSettingsPaneOpened;
    }
    if (settings.timeSeriesCardMinWidth !== undefined) {
      serializableSettings.timeSeriesCardMinWidth =
        settings.timeSeriesCardMinWidth;
    }
    if (settings.stepSelectorEnabled !== undefined) {
      serializableSettings.stepSelectorEnabled = settings.stepSelectorEnabled;
    }
    if (settings.rangeSelectionEnabled !== undefined) {
      serializableSettings.rangeSelectionEnabled =
        settings.rangeSelectionEnabled;
    }
    if (settings.linkedTimeEnabled !== undefined) {
      serializableSettings.linkedTimeEnabled = settings.linkedTimeEnabled;
    }
    if (settings.singleSelectionHeaders !== undefined) {
      serializableSettings.singleSelectionHeaders =
        settings.singleSelectionHeaders;
    }
    if (settings.rangeSelectionHeaders !== undefined) {
      serializableSettings.rangeSelectionHeaders =
        settings.rangeSelectionHeaders;
    }
    if (settings.dashboardDisplayedHparamColumns !== undefined) {
      serializableSettings.dashboardDisplayedHparamColumns =
        settings.dashboardDisplayedHparamColumns;
    }
    if (settings.savingPinsEnabled !== undefined) {
      serializableSettings.savingPinsEnabled = settings.savingPinsEnabled;
    }
    return serializableSettings;
  }

  backendToUi(backendSettings: Partial<BackendSettings>): PersistableSettings {
    const settings: Partial<PersistableSettings> = {};
    if (
      backendSettings.hasOwnProperty('scalarSmoothing') &&
      typeof backendSettings.scalarSmoothing === 'number'
    ) {
      settings.scalarSmoothing = backendSettings.scalarSmoothing;
    }

    if (
      backendSettings.hasOwnProperty('ignoreOutliers') &&
      typeof backendSettings.ignoreOutliers === 'boolean'
    ) {
      settings.ignoreOutliers = backendSettings.ignoreOutliers;
    }

    if (
      backendSettings.hasOwnProperty('tooltipSort') &&
      typeof backendSettings.tooltipSort === 'string'
    ) {
      settings.tooltipSort = backendSettings.tooltipSort;
    }

    if (
      backendSettings.hasOwnProperty('autoReload') &&
      typeof backendSettings.autoReload === 'boolean'
    ) {
      settings.autoReload = backendSettings.autoReload;
    }

    if (
      backendSettings.hasOwnProperty('autoReloadPeriodInMs') &&
      typeof backendSettings.autoReloadPeriodInMs === 'number'
    ) {
      settings.autoReloadPeriodInMs = backendSettings.autoReloadPeriodInMs;
    }

    if (
      backendSettings.hasOwnProperty('paginationSize') &&
      typeof backendSettings.paginationSize === 'number'
    ) {
      settings.pageSize = backendSettings.paginationSize;
    }

    if (
      backendSettings.hasOwnProperty('theme') &&
      typeof backendSettings.theme === 'string' &&
      new Set(Object.values(ThemeValue)).has(backendSettings.theme)
    ) {
      settings.themeOverride = backendSettings.theme;
    }

    if (
      backendSettings.hasOwnProperty('notificationLastReadTimeInMs') &&
      typeof backendSettings.notificationLastReadTimeInMs === 'number'
    ) {
      settings.notificationLastReadTimeInMs =
        backendSettings.notificationLastReadTimeInMs;
    }

    if (
      backendSettings.hasOwnProperty('sideBarWidthInPercent') &&
      typeof backendSettings.sideBarWidthInPercent === 'number'
    ) {
      settings.sideBarWidthInPercent = backendSettings.sideBarWidthInPercent;
    }

    if (
      backendSettings.hasOwnProperty('timeSeriesSettingsPaneOpened') &&
      typeof backendSettings.timeSeriesSettingsPaneOpened === 'boolean'
    ) {
      settings.timeSeriesSettingsPaneOpened =
        backendSettings.timeSeriesSettingsPaneOpened;
    }

    if (
      backendSettings.hasOwnProperty('timeSeriesCardMinWidth') &&
      typeof backendSettings.timeSeriesCardMinWidth === 'number'
    ) {
      settings.timeSeriesCardMinWidth = backendSettings.timeSeriesCardMinWidth;
    }

    if (
      backendSettings.hasOwnProperty('stepSelectorEnabled') &&
      typeof backendSettings.stepSelectorEnabled === 'boolean'
    ) {
      settings.stepSelectorEnabled = backendSettings.stepSelectorEnabled;
    }

    if (
      backendSettings.hasOwnProperty('rangeSelectionEnabled') &&
      typeof backendSettings.rangeSelectionEnabled === 'boolean'
    ) {
      settings.rangeSelectionEnabled = backendSettings.rangeSelectionEnabled;
    }

    if (
      backendSettings.hasOwnProperty('linkedTimeEnabled') &&
      typeof backendSettings.linkedTimeEnabled === 'boolean'
    ) {
      settings.linkedTimeEnabled = backendSettings.linkedTimeEnabled;
    }

    if (
      Array.isArray(backendSettings.singleSelectionHeaders) &&
      // If the settings stored in the backend are invalid, reset back to default.
      backendSettings.singleSelectionHeaders[0].name !== undefined &&
      backendSettings.singleSelectionHeaders[0].type === 'RUN'
    ) {
      updateScalarContextMenuOptions(backendSettings.singleSelectionHeaders);
      settings.singleSelectionHeaders = backendSettings.singleSelectionHeaders;
    }

    if (
      Array.isArray(backendSettings.rangeSelectionHeaders) &&
      // If the settings stored in the backend are invalid, reset back to default.
      backendSettings.rangeSelectionHeaders[0].name !== undefined &&
      backendSettings.rangeSelectionHeaders[0].type === 'RUN'
    ) {
      updateScalarContextMenuOptions(backendSettings.rangeSelectionHeaders);
      settings.rangeSelectionHeaders = backendSettings.rangeSelectionHeaders;
    }

    if (Array.isArray(backendSettings.dashboardDisplayedHparamColumns)) {
      settings.dashboardDisplayedHparamColumns =
        backendSettings.dashboardDisplayedHparamColumns;
    }

    if (
      backendSettings.hasOwnProperty('savingPinsEnabled') &&
      typeof backendSettings.savingPinsEnabled === 'boolean'
    ) {
      settings.savingPinsEnabled = backendSettings.savingPinsEnabled;
    }

    return settings;
  }
}

/**
 * An implementation of PersistentSettingsDataSource that stores global settings
 * in browser local storage.
 */
@Injectable()
export class PersistentSettingsDataSourceImpl<UiSettings, StorageSettings>
  implements PersistentSettingsDataSource<UiSettings>
{
  constructor(
    private readonly converter: SettingsConverter<UiSettings, StorageSettings>
  ) {}

  setSettings(partialSetting: Partial<UiSettings>): Observable<void> {
    if (!Object.keys(partialSetting)) {
      return EMPTY;
    }

    return this.getSettings().pipe(
      tap((currentPartialSettings) => {
        window.localStorage.setItem(
          GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify(
            this.converter.uiToBackend({
              ...currentPartialSettings,
              ...partialSetting,
            })
          )
        );
        window.localStorage.removeItem(LEGACY_METRICS_LOCAL_STORAGE_KEY);
        window.localStorage.removeItem(NOTIFICATION_LAST_READ_TIME_KEY);
      }),
      map(() => void null)
    );
  }

  private deserialize(serialized: string): Partial<StorageSettings> {
    try {
      return JSON.parse(serialized) as StorageSettings;
    } catch {
      return {};
    }
  }

  getSettings(): Observable<Partial<UiSettings>> {
    const lastReadTime = window.localStorage.getItem(
      NOTIFICATION_LAST_READ_TIME_KEY
    );
    const notificationSettings = this.converter.backendToUi(
      this.deserialize(
        lastReadTime
          ? JSON.stringify({
              notificationLastReadTimeInMs: Number(lastReadTime),
            })
          : '{}'
      )
    );
    const legacySettings = this.converter.backendToUi(
      this.deserialize(
        window.localStorage.getItem(LEGACY_METRICS_LOCAL_STORAGE_KEY) ?? '{}'
      )
    );

    const settings = this.converter.backendToUi(
      this.deserialize(
        window.localStorage.getItem(GLOBAL_LOCAL_STORAGE_KEY) ?? '{}'
      )
    );
    return of({
      ...notificationSettings,
      ...legacySettings,
      ...settings,
    });
  }
}

export const TEST_ONLY = {
  LEGACY_METRICS_LOCAL_STORAGE_KEY,
  GLOBAL_LOCAL_STORAGE_KEY,
  NOTIFICATION_LAST_READ_TIME_KEY,
};
