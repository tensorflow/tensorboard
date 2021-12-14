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
import {
  Action,
  ActionReducer,
  combineReducers,
  createReducer,
} from '@ngrx/store';
import {DEFAULT_EXPERIMENT_ID} from '../../app_routing/types';
import {Experiment} from '../types';
import {ExperimentsDataState, ExperimentsState} from './experiments_types';

const defaultExperiment: Experiment = {
  id: DEFAULT_EXPERIMENT_ID,
  name: '',
  start_time: 0,
};

const initialDataState: ExperimentsDataState = {
  experimentMap: {[defaultExperiment.id]: defaultExperiment},
};

const dataReducer: ActionReducer<ExperimentsDataState, Action> =
  createReducer(initialDataState);

export function reducers(state: ExperimentsState, action: Action) {
  return combineReducers({data: dataReducer})(state, action);
}
