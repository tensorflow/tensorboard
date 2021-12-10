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
/**
 * @fileoverview Module for runs.
 */

import {NgModule} from '@angular/core';
import {EffectsModule} from '@ngrx/effects';
import {StoreModule} from '@ngrx/store';
import {AlertActionModule} from '../alert/alert_action_module';
import {HparamsModule} from '../hparams/hparams_module';
import * as actions from './actions';
import {RunsDataSourceModule} from './data_source/runs_data_source_module';
import {RunsEffects} from './effects';
import {reducers} from './store';
import {RUNS_FEATURE_KEY} from './store/runs_types';

export function alertActionProvider() {
  return [
    {
      actionCreator: actions.fetchRunsFailed,
      alertFromAction: () => {
        return {localizedMessage: 'Failed to fetch runs'};
      },
    },
  ];
}

@NgModule({
  imports: [
    StoreModule.forFeature(RUNS_FEATURE_KEY, reducers),
    EffectsModule.forFeature([RunsEffects]),
    RunsDataSourceModule,
    AlertActionModule.registerAlertActions(alertActionProvider),
    // Used for reading the hparams state in the runs-table component.
    HparamsModule,
  ],
})
export class RunsModule {}
