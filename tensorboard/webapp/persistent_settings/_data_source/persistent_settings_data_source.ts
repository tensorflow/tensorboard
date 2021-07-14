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
import {LocalStorage} from '../../util/local_storage';
import {BackendSettings, PersistableSettings} from './types';

const LEGACY_METRICS_LOCAL_STORAGE_KEY = '_tb_global_settings.timeseries';
const GLOBAL_LOCAL_STORAGE_KEY = '_tb_global_settings';

@Injectable()
export abstract class PersistentSettingsDataSource {
  abstract setSettings(
    partialSetting: Partial<PersistableSettings>
  ): Observable<void>;
  abstract getSettings(): Observable<Partial<PersistableSettings>>;
}

/**
 * An implementation of PersistentSettingsDataSource that stores global settings
 * in browser local storage.
 */
@Injectable()
export class PersistentSettingsDataSourceImpl
  implements PersistentSettingsDataSource {
  constructor(private readonly localStorage: LocalStorage) {}

  private serializeSettings(settings: Partial<PersistableSettings>): string {
    const serializableSettings: BackendSettings = {
      ignoreOutliers: settings.ignoreOutliers,
      scalarSmoothing: settings.scalarSmoothing,
      // TooltipSort is a string enum and has string values; no need to
      // serialize it differently to account for their unintended changes.
      tooltipSort: settings.tooltipSortString,
    };
    return JSON.stringify(serializableSettings);
  }

  private deserializeSettings(
    serialized: string
  ): Partial<PersistableSettings> {
    const settings: Partial<PersistableSettings> = {};
    let unsanitizedObject: Partial<BackendSettings>;
    try {
      unsanitizedObject = JSON.parse(serialized) as Partial<BackendSettings>;
    } catch (e) {
      return settings;
    }

    if (
      unsanitizedObject.hasOwnProperty('scalarSmoothing') &&
      typeof unsanitizedObject.scalarSmoothing === 'number'
    ) {
      settings.scalarSmoothing = unsanitizedObject.scalarSmoothing;
    }

    if (
      unsanitizedObject.hasOwnProperty('ignoreOutliers') &&
      typeof unsanitizedObject.ignoreOutliers === 'boolean'
    ) {
      settings.ignoreOutliers = unsanitizedObject.ignoreOutliers;
    }

    if (
      unsanitizedObject.hasOwnProperty('tooltipSort') &&
      typeof unsanitizedObject.tooltipSort === 'string'
    ) {
      settings.tooltipSortString = unsanitizedObject.tooltipSort;
    }

    return settings;
  }

  setSettings(partialSetting: Partial<PersistableSettings>): Observable<void> {
    if (!Object.keys(partialSetting)) {
      return EMPTY;
    }

    return this.getSettings().pipe(
      tap((currentPartialSettings) => {
        this.localStorage.setItem(
          GLOBAL_LOCAL_STORAGE_KEY,
          this.serializeSettings({...currentPartialSettings, ...partialSetting})
        );
        this.localStorage.removeItem(LEGACY_METRICS_LOCAL_STORAGE_KEY);
      }),
      map(() => void null)
    );
  }

  getSettings(): Observable<Partial<PersistableSettings>> {
    const legacySettings = this.deserializeSettings(
      this.localStorage.getItem(LEGACY_METRICS_LOCAL_STORAGE_KEY) ?? '{}'
    );
    const settings = this.deserializeSettings(
      this.localStorage.getItem(GLOBAL_LOCAL_STORAGE_KEY) ?? '{}'
    );
    return of({
      ...legacySettings,
      ...settings,
    });
  }
}

export const TEST_ONLY = {
  LEGACY_METRICS_LOCAL_STORAGE_KEY,
  GLOBAL_LOCAL_STORAGE_KEY,
};
