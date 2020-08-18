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

import * as actions from '../actions';
import {NpmiState, DataLoadState, MetricListing} from './npmi_types';
import * as metricType from '../util/metric_type';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const initialState: NpmiState = {
  pluginDataLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  annotationData: {},
  runToMetrics: {},
};

const reducer = createReducer(
  initialState,
  on(
    actions.npmiPluginDataRequested,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        pluginDataLoaded: {
          ...state.pluginDataLoaded,
          state: DataLoadState.LOADING,
        },
      };
    }
  ),
  on(
    actions.npmiPluginDataRequestFailed,
    (state: NpmiState): NpmiState => {
      return {
        ...state,
        pluginDataLoaded: {
          ...state.pluginDataLoaded,
          state: DataLoadState.FAILED,
        },
      };
    }
  ),
  on(
    actions.npmiPluginDataLoaded,
    (state: NpmiState, {annotationData, metrics}): NpmiState => {
      const runToMetrics: MetricListing = {};
      for (let key in metrics) {
        // Init Metrics Data
        runToMetrics[key] = [];
        for (let value of metrics[key]) {
          if (metricType.metricIsNpmi(value)) {
            runToMetrics[key].push(value);
          }
        }
      }
      return {
        ...state,
        runToMetrics: runToMetrics,
        annotationData: annotationData,
        pluginDataLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
      };
    }
  )
);

export function reducers(state: NpmiState, action: Action) {
  return reducer(state, action);
}
