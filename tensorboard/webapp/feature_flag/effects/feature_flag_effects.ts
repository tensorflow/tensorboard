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

import {inject, Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Action, createAction, Store} from '@ngrx/store';
import {combineLatestWith, map, tap, withLatestFrom} from 'rxjs/operators';
import '../../tb_polymer_interop_types';
import {TBFeatureFlagDataSource} from '../../webapp_data_source/tb_feature_flag_data_source_types';
import {
  allFeatureFlagOverridesReset,
  featureFlagOverrideChanged,
  featureFlagOverridesReset,
  partialFeatureFlagsLoaded,
} from '../actions/feature_flag_actions';
import {
  getFeatureFlags,
  getFeatureFlagsMetadata,
  getFeatureFlagsToSendToServer,
  getIsAutoDarkModeAllowed,
} from '../store/feature_flag_selectors';
import {State} from '../store/feature_flag_types';

const effectsInitialized = createAction('[FEATURE FLAG] Effects Init');

@Injectable()
export class FeatureFlagEffects {
  private readonly actions$ = inject(Actions);
  private readonly store: Store<State> = inject(Store);
  private readonly dataSource = inject(TBFeatureFlagDataSource);

  // Ngrx assumes all Effect classes have properties that inherit from the base
  // JS Object. `tf_feature_flags` does not, so we wrap it.
  private readonly tfFeatureFlags = {
    ref: document.createElement('tf-feature-flags').tf_feature_flags,
  };

  /** @export */
  readonly getFeatureFlags$ = createEffect(() =>
    this.actions$.pipe(
      ofType(effectsInitialized),
      combineLatestWith(
        this.store.select(getIsAutoDarkModeAllowed),
        this.store.select(getFeatureFlagsMetadata)
      ),
      map(([, isDarkModeAllowed, featureFlagsMetadata]) => {
        const features = this.dataSource.getFeatures(
          isDarkModeAllowed,
          featureFlagsMetadata
        );

        return partialFeatureFlagsLoaded({features});
      })
    )
  );

  /**
   * Pass FeatureFlags to the Polymer portion of the code base immediately after
   * feature flags have been finalized.
   *
   * @export
   */
  readonly updatePolymerFeatureFlags$ = createEffect(
    () =>
      this.actions$.pipe(
        // partialFeatureFlagsLoaded triggers this effect but the actual
        // feature flag values used are from the Store, given that it contains
        // the finalized merged feature flags.
        ofType(partialFeatureFlagsLoaded),
        withLatestFrom(
          this.store.select(getFeatureFlags),
          this.store.select(getFeatureFlagsToSendToServer)
        ),
        tap(([, featureFlags, featureFlagsToSendToServer]) => {
          this.tfFeatureFlags.ref.setFeatureFlags(
            featureFlags,
            featureFlagsToSendToServer
          );
        })
      ),
    {dispatch: false}
  );

  /**
   * When a feature flag is overridden this effect persists that override by
   * putting it in local storage using the dataSource.
   */
  readonly storeFeatureFlag$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(featureFlagOverrideChanged),
        tap(({flags}) => {
          this.dataSource.persistFeatureFlags(flags);
        })
      ),
    {dispatch: false}
  );

  readonly resetFeatureFlagOverrides$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(featureFlagOverridesReset),
        tap(({flags}) => {
          flags.forEach((flag) => {
            this.dataSource.resetPersistedFeatureFlag(flag);
          });
        })
      ),
    {dispatch: false}
  );

  readonly resetAllFeatureFlagOverrides$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(allFeatureFlagOverridesReset),
        tap(() => {
          this.dataSource.resetAllPersistedFeatureFlags();
        })
      ),
    {dispatch: false}
  );

  /** @export */
  ngrxOnInitEffects(): Action {
    return effectsInitialized();
  }
}
