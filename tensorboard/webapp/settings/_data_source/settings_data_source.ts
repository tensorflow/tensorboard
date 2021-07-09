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
import {Observable, of} from 'rxjs';

import {Settings} from '../_redux/settings_types';

const SETTINGS_RELOAD_ENABLED_KEY = 'reloadEnabled';
const SETTINGS_RELOAD_PERIOD_IN_MS_KEY = 'reloadPeriodInMs';
const SETTINGS_PAGE_SIZE_KEY = 'pageSize';

@Injectable()
export class SettingsDataSource {
  fetchSavedSettings(): Observable<Partial<Settings>> {
    const savedSettings: Partial<Settings> = {};
    const reloadEnabled = window.localStorage.getItem(
      SETTINGS_RELOAD_ENABLED_KEY
    );
    if (reloadEnabled) {
      savedSettings.reloadEnabled = reloadEnabled === 'true';
    }
    const reloadPeriodInMs = window.localStorage.getItem(
      SETTINGS_RELOAD_PERIOD_IN_MS_KEY
    );
    if (reloadPeriodInMs) {
      savedSettings.reloadPeriodInMs = parseInt(reloadPeriodInMs);
    }
    const pageSize = window.localStorage.getItem(SETTINGS_PAGE_SIZE_KEY);
    if (pageSize) {
      savedSettings.pageSize = parseInt(pageSize);
    }

    return of(savedSettings);
  }

  saveReloadEnabled(reloadEnabled: boolean) {
    window.localStorage.setItem(
      SETTINGS_RELOAD_ENABLED_KEY,
      reloadEnabled ? 'true' : 'false'
    );
  }

  saveReloadPeriodInMs(reloadPeriodInMs: number) {
    window.localStorage.setItem(
      SETTINGS_RELOAD_PERIOD_IN_MS_KEY,
      reloadPeriodInMs.toString()
    );
  }

  savePageSize(pageSize: number) {
    window.localStorage.setItem(SETTINGS_PAGE_SIZE_KEY, pageSize.toString());
  }
}
