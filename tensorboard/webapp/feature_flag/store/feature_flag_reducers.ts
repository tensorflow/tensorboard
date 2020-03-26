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
import {Action, createReducer, on} from '@ngrx/store';
import * as actions from '../actions/feature_flag_actions';
import {FeatureFlagState} from './feature_flag_types';

/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const initialState: FeatureFlagState = {
  enabledExperimentalPlugins: [],
};

const reducer = createReducer<FeatureFlagState>(
  initialState,
  on(actions.featuresLoaded, (state, {features}) => {
    return {...state, ...features};
  })
);

export function reducers(state: FeatureFlagState, action: Action) {
  return reducer(state, action);
}
