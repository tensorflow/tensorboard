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
 * @fileoverview Hparams Ngrx actions.
 */

import {createAction, props} from '@ngrx/store';
import {
  AddColumnEvent,
  ReorderColumnEvent,
} from '../../widgets/data_table/types';
import {HparamSpec, SessionGroup, ColumnHeader} from '../types';
import {HparamFilter, MetricFilter} from './types';

export const hparamsFetchSessionGroupsSucceeded = createAction(
  '[Hparams] Hparams Fetch Session Groups Succeeded',
  props<{
    hparamSpecs: HparamSpec[];
    sessionGroups: SessionGroup[];
  }>()
);

export const dashboardHparamFilterAdded = createAction(
  '[Hparams] Dashboard Hparam Filter Added',
  props<{name: string; filter: HparamFilter}>()
);

export const dashboardMetricFilterAdded = createAction(
  '[Hparams] Dashboard Metric Filter Added',
  props<{name: string; filter: MetricFilter}>()
);

export const dashboardHparamFilterRemoved = createAction(
  '[Hparams] Dashboard Hparam Filter Removed',
  props<{name: string}>()
);

export const dashboardMetricFilterRemoved = createAction(
  '[Hparams] Dashboard Metric Filter Removed',
  props<{name: string}>()
);

export const dashboardHparamColumnAdded = createAction(
  '[Hparams] Dashboard Hparam Column Added',
  props<AddColumnEvent>()
);

export const dashboardHparamColumnRemoved = createAction(
  '[Hparams] Dashboard Hparam Column Removed',
  props<{column: ColumnHeader}>()
);

export const dashboardHparamColumnToggled = createAction(
  '[Hparams] Dashboard Hparam Column Toggled',
  props<{column: ColumnHeader}>()
);

export const dashboardHparamColumnOrderChanged = createAction(
  '[Hparams] Dashboard Hparam Column Order Changed',
  props<ReorderColumnEvent>()
);

export const loadAllDashboardHparams = createAction(
  '[Hparams] Load all Hparams'
);
