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

import {Injectable} from '@angular/core';
import {createAction, Action, Store} from '@ngrx/store';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {map, combineLatestWith} from 'rxjs/operators';

import {TBFeatureFlagDataSource} from '../../webapp_data_source/tb_feature_flag_data_source_types';
import {partialFeatureFlagsLoaded} from '../actions/feature_flag_actions';
import {getIsAutoDarkModeAllowed} from '../store/feature_flag_selectors';
import {State} from '../store/feature_flag_types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrx from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';

const effectsInitialized = createAction('[FEATURE FLAG] Effects Init');

@Injectable()
export class FeatureFlagEffects {
  /** @export */
  readonly getFeatureFlags$ = createEffect(() =>
    this.actions$.pipe(
      ofType(effectsInitialized),
      combineLatestWith(this.store.select(getIsAutoDarkModeAllowed)),
      map(([, isDarkModeAllowed]) => {
        const features = this.dataSource.getFeatures(isDarkModeAllowed);
        return partialFeatureFlagsLoaded({features});
      })
    )
  );

  constructor(
    private readonly actions$: Actions,
    private readonly store: Store<State>,
    private readonly dataSource: TBFeatureFlagDataSource
  ) {}

  /** @export */
  ngrxOnInitEffects(): Action {
    return effectsInitialized();
  }
}
