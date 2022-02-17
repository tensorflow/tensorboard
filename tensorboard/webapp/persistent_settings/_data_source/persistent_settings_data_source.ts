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
import {BackendSettings, PersistableSettings, ThemeValue} from './types';

const LEGACY_METRICS_LOCAL_STORAGE_KEY = '_tb_global_settings.timeseries';
const GLOBAL_LOCAL_STORAGE_KEY = '_tb_global_settings';
const NOTIFICATION_LAST_READ_TIME_KEY = 'notificationLastReadTimestamp';

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
    if (settings.tooltipSortString !== undefined) {
      // TooltipSort is a string enum and has string values; no need to
      // serialize it differently to account for their unintended changes.
      serializableSettings.tooltipSort = settings.tooltipSortString;
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
    if (settings.timeSeriesPromotionDismissed !== undefined) {
      serializableSettings.timeSeriesPromotionDismissed =
        settings.timeSeriesPromotionDismissed;
    }
    if (settings.timeSeriesSettingsPaneOpened !== undefined) {
      serializableSettings.timeSeriesSettingsPaneOpened =
        settings.timeSeriesSettingsPaneOpened;
    }
    if (settings.timeSeriesCardMinWidth !== undefined) {
      serializableSettings.timeSeriesCardMinWidth =
        settings.timeSeriesCardMinWidth;
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
      settings.tooltipSortString = backendSettings.tooltipSort;
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
      backendSettings.hasOwnProperty('timeSeriesPromotionDismissed') &&
      typeof backendSettings.timeSeriesPromotionDismissed === 'boolean'
    ) {
      settings.timeSeriesPromotionDismissed =
        backendSettings.timeSeriesPromotionDismissed;
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
        localStorage.setItem(
          GLOBAL_LOCAL_STORAGE_KEY,
          JSON.stringify(
            this.converter.uiToBackend({
              ...currentPartialSettings,
              ...partialSetting,
            })
          )
        );
        localStorage.removeItem(LEGACY_METRICS_LOCAL_STORAGE_KEY);
        localStorage.removeItem(NOTIFICATION_LAST_READ_TIME_KEY);
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
    const lastReadTime = localStorage.getItem(NOTIFICATION_LAST_READ_TIME_KEY);
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
        localStorage.getItem(LEGACY_METRICS_LOCAL_STORAGE_KEY) ?? '{}'
      )
    );
    const settings = this.converter.backendToUi(
      this.deserialize(localStorage.getItem(GLOBAL_LOCAL_STORAGE_KEY) ?? '{}')
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
