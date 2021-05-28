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

import {Inject, Injectable, Optional} from '@angular/core';
import {createAction, Action} from '@ngrx/store';
import {Actions, ofType, createEffect} from '@ngrx/effects';
import {map} from 'rxjs/operators';

import {
  TbFeatureFlagDataSources,
  TBFeatureFlagDataSource,
} from '../../webapp_data_source/tb_feature_flag_data_source_types';
import {partialFeatureFlagsLoaded} from '../actions/feature_flag_actions';
import {FeatureFlags} from '../types';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';
/** @typehack */ import * as _typeHackNgrx from '@ngrx/store/src/models';
/** @typehack */ import * as _typeHackNgrxEffects from '@ngrx/effects';
/** @typehack */ import * as _typeHackNgrxStore from '@ngrx/store';

const effectsInitialized = createAction('[FEATURE FLAG] Effects Init');

@Injectable()
export class FeatureFlagEffects {
  private readonly dataSources: TBFeatureFlagDataSource[];

  /** @export */
  readonly getFeatureFlags$ = createEffect(() =>
    this.actions$.pipe(
      ofType(effectsInitialized),
      map(() => {
        const features: Partial<FeatureFlags> = {};
        for (const dataSource of this.dataSources) {
          Object.assign(features, dataSource.getFeatures());
        }
        return partialFeatureFlagsLoaded({features});
      })
    )
  );

  constructor(
    private readonly actions$: Actions,
    @Optional()
    dataSource: TBFeatureFlagDataSource,
    @Optional()
    @Inject(TbFeatureFlagDataSources)
    dataSources: TBFeatureFlagDataSource[]
  ) {
    // Remove below when all applications are migrated to
    // TbFeatureFlagDataSources.
    if (dataSources) {
      this.dataSources = dataSources;
    } else if (dataSource) {
      this.dataSources = [dataSource];
    } else {
      throw new RangeError(
        'Requires one of `TBFeatureFlagDataSource` or `TbFeatureFlagDataSources`'
      );
    }
  }

  /** @export */
  ngrxOnInitEffects(): Action {
    return effectsInitialized();
  }
}
