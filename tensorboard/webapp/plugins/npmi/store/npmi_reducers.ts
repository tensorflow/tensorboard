import {MetricListing, ValueListing, SummaryListing} from './npmi_types';
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
import {NpmiState, DataLoadState} from './npmi_types';
import * as metricType from '../util/metric_type';

// HACK: These imports are for type inference.
// https://github.com/bazelbuild/rules_nodejs/issues/1013
/** @typehack */ import * as _typeHackStore from '@ngrx/store/store';

const initialState: NpmiState = {
  annotationsData: {},
  pluginDataLoaded: {
    state: DataLoadState.NOT_LOADED,
    lastLoadedTimeInMs: null,
  },
  countMetricsData: {},
  npmiMetricsData: {},
  countValuesData: {},
  npmiValuesData: {},
  countData: {},
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
    (state: NpmiState, {annotations, metrics, values}): NpmiState => {
      const countMetricsData: MetricListing = {};
      const npmiMetricsData: MetricListing = {};
      const countValuesData: ValueListing = {};
      const npmiValuesData: ValueListing = {};
      const countData: SummaryListing = {};
      for (let key in metrics) {
        // Init Metrics Data
        countMetricsData[key] = [];
        npmiMetricsData[key] = [];
        for (let value of metrics[key]) {
          if (metricType.metricIsMetricCount(value)) {
            countMetricsData[key].push(value);
          } else if (metricType.metricIsNpmi(value)) {
            npmiMetricsData[key].push(value);
          }
        }
        // Init Values Data
        countValuesData[key] = [];
        npmiValuesData[key] = [];
        countData[key] = [];
        for (let row of values[key]) {
          let countRow = [];
          let npmiRow = [];
          for (let index in metrics[key]) {
            if (metricType.metricIsMetricCount(metrics[key][index])) {
              countRow.push(row[index]);
            } else if (metricType.metricIsCount(metrics[key][index])) {
              countData[key].push(row[index]);
            } else if (metricType.metricIsNpmi(metrics[key][index])) {
              npmiRow.push(row[index]);
            }
          }
          countValuesData[key].push(countRow);
          npmiValuesData[key].push(npmiRow);
        }
      }
      return {
        ...state,
        countMetricsData: countMetricsData,
        npmiMetricsData: npmiMetricsData,
        countValuesData: countValuesData,
        npmiValuesData: npmiValuesData,
        annotationsData: annotations,
        pluginDataLoaded: {
          state: DataLoadState.LOADED,
          lastLoadedTimeInMs: Date.now(),
        },
        countData: countData,
      };
    }
  )
);

export function reducers(state: NpmiState, action: Action) {
  return reducer(state, action);
}
