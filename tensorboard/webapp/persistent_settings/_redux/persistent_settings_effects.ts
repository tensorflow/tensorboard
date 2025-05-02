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
import {Injectable, inject} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {EMPTY, Observable, merge} from 'rxjs';
import {
  buffer,
  debounceTime,
  delay,
  distinctUntilChanged,
  filter,
  mergeMap,
  share,
  skip,
  take,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import * as appRoutingActions from '../../app_routing/actions';
import {PersistentSettingsDataSource} from '../_data_source/persistent_settings_data_source';
import {PersistableSettings} from '../_data_source/types';
import {PersistentSettingsConfigModule} from '../persistent_settings_config_module';
import {persistentSettingsLoaded} from './persistent_settings_actions';
import {getShouldPersistSettings} from './persistent_settings_selectors';

const DEBOUNCE_PERIOD_IN_MS = 500;

/**
 * Persistent settings effect that is responsible for bootstrapping application
 * with the initialization and making request to change settings when selectors
 * emit.
 */
@Injectable()
export class PersistentSettingsEffects {
  private readonly actions$: Actions = inject(Actions);
  private readonly store: Store<{}> = inject(Store);
  private readonly configModule: PersistentSettingsConfigModule<
    {},
    PersistableSettings
  > = inject(PersistentSettingsConfigModule);
  private readonly dataSource: PersistentSettingsDataSource<PersistableSettings> =
    inject(PersistentSettingsDataSource);

  /** @export */
  readonly initializeAndUpdateSettings$: Observable<void> = createEffect(
    () => {
      const selectorsEmit$ = this.actions$.pipe(
        ofType(appRoutingActions.navigating),
        take(1),
        withLatestFrom(this.store.select(getShouldPersistSettings)),
        filter(([, shouldPersistSettings]) => shouldPersistSettings),
        mergeMap(() => this.dataSource.getSettings()),
        tap((partialSettings) => {
          this.store.dispatch(persistentSettingsLoaded({partialSettings}));
        }),
        // Give time for reducers to react to the action in a microtask.
        delay(0),
        mergeMap(() => {
          const stateSelectors$ = this.configModule
            .getGlobalSettingSelectors()
            .map((selector) => {
              return this.store.select(selector).pipe(
                distinctUntilChanged((before, after) => {
                  const beforeValues = Object.values(before);
                  const afterValues = Object.values(after);

                  return (
                    beforeValues.length === afterValues.length &&
                    beforeValues.every(
                      (beforeValue, index) => beforeValue === afterValues[index]
                    )
                  );
                }),
                // Ignore the first value which is store's default value or value
                // populated via query parameter.
                // `distinctUntilChanged` does not check for equality for the first
                // event and we intend to ignore that.
                skip(1)
              );
            });
          return merge(...stateSelectors$);
        }),
        // Do not create a new stream for two `pipe`s below.
        share()
      );

      return selectorsEmit$.pipe(
        // Buffers changes from all selectors and only emit when debounce period
        // is over.
        buffer(selectorsEmit$.pipe(debounceTime(DEBOUNCE_PERIOD_IN_MS))),
        mergeMap((stateSettings) => {
          if (stateSettings.length === 0) {
            return EMPTY;
          }

          const dataSourceSettings: Partial<PersistableSettings> = {};
          // Combine buffered setting changes. Last settings change would
          // overwrite earlier changes.
          for (const setting of stateSettings) {
            Object.assign(dataSourceSettings, setting);
          }
          return this.dataSource.setSettings(dataSourceSettings);
        })
      );
    },
    {dispatch: false}
  );
}

export const TEST_ONLY = {DEBOUNCE_PERIOD_IN_MS};
