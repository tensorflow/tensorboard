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
import {Action, ActionReducer, createReducer, on} from '@ngrx/store';
import {ColumnHeader, Side} from '../../widgets/data_table/types';
import * as actions from './hparams_actions';
import {HparamsState} from './types';

const initialState: HparamsState = {
  dashboardSpecs: {
    hparams: [],
    metrics: [],
  },
  dashboardSessionGroups: [],
  dashboardFilters: {
    hparams: new Map(),
    metrics: new Map(),
  },
  dashboardDisplayedHparamColumns: [],
};

const reducer: ActionReducer<HparamsState, Action> = createReducer(
  initialState,
  on(actions.hparamsFetchSessionGroupsSucceeded, (state, action) => {
    const nextDashboardSpecs = action.hparamsAndMetricsSpecs;
    const nextDashboardSessionGroups = action.sessionGroups;

    return {
      ...state,
      dashboardSpecs: nextDashboardSpecs,
      dashboardSessionGroups: nextDashboardSessionGroups,
    };
  }),
  on(actions.dashboardHparamFilterAdded, (state, action) => {
    const nextHparamFilters = new Map(state.dashboardFilters.hparams);
    nextHparamFilters.set(action.name, action.filter);

    return {
      ...state,
      dashboardFilters: {
        ...state.dashboardFilters,
        hparams: nextHparamFilters,
      },
    };
  }),
  on(actions.dashboardMetricFilterAdded, (state, action) => {
    const nextMetricFilters = new Map(state.dashboardFilters.metrics);
    nextMetricFilters.set(action.name, action.filter);

    return {
      ...state,
      dashboardFilters: {
        ...state.dashboardFilters,
        metrics: nextMetricFilters,
      },
    };
  }),
  on(actions.dashboardHparamFilterRemoved, (state, action) => {
    const nextHparamFilters = new Map(state.dashboardFilters.hparams);
    nextHparamFilters.delete(action.name);

    return {
      ...state,
      dashboardFilters: {
        ...state.dashboardFilters,
        hparams: nextHparamFilters,
      },
    };
  }),
  on(actions.dashboardMetricFilterRemoved, (state, action) => {
    const nextMetricFilters = new Map(state.dashboardFilters.metrics);
    nextMetricFilters.delete(action.name);

    return {
      ...state,
      dashboardFilters: {
        ...state.dashboardFilters,
        metrics: nextMetricFilters,
      },
    };
  }),
  on(actions.dashboardHparamColumnAdded, (state, {column, nextTo, side}) => {
    const {dashboardDisplayedHparamColumns: oldColumns} = state;

    let destinationIndex = oldColumns.length; // Default to append at end.
    if (nextTo !== undefined && side !== undefined) {
      const nextToIndex = oldColumns.findIndex(
        (col) => col.name === nextTo.name
      );
      if (nextToIndex !== -1) {
        destinationIndex = side === Side.RIGHT ? nextToIndex + 1 : nextToIndex;
      }
    }
    let newColumn = {...column, enabled: true};
    let newColumns = [...oldColumns];
    newColumns.splice(destinationIndex, 0, newColumn);

    return {
      ...state,
      dashboardDisplayedHparamColumns: newColumns,
    };
  }),
  on(actions.dashboardHparamColumnRemoved, (state, {column}) => {
    const newColumns = state.dashboardDisplayedHparamColumns.filter(
      ({name}) => name !== column.name
    );

    return {
      ...state,
      dashboardDisplayedHparamColumns: newColumns,
    };
  }),
  on(actions.dashboardHparamColumnToggled, (state, {column: toggledColumn}) => {
    const newColumns = state.dashboardDisplayedHparamColumns.map((column) => {
      if (column.name === toggledColumn.name) {
        return {
          ...column,
          enabled: !toggledColumn.enabled,
        };
      } else {
        return column;
      }
    });

    return {
      ...state,
      dashboardDisplayedHparamColumns: newColumns,
    };
  }),
  on(
    actions.dashboardHparamColumnOrderChanged,
    (state, {source, destination, side}) => {
      const {dashboardDisplayedHparamColumns: columns} = state;
      let sourceIndex = columns.findIndex(
        (column: ColumnHeader) => column.name === source.name
      );
      let destinationIndex = columns.findIndex(
        (column: ColumnHeader) => column.name === destination.name
      );
      if (sourceIndex === -1 || sourceIndex === destinationIndex) {
        return state;
      }
      if (destinationIndex === -1) {
        destinationIndex = side === Side.LEFT ? 0 : columns.length - 1;
      }

      const newColumns = [...columns];
      newColumns.splice(sourceIndex, 1);
      newColumns.splice(destinationIndex, 0, source);

      return {
        ...state,
        dashboardDisplayedHparamColumns: newColumns,
      };
    }
  )
);

export function reducers(state: HparamsState | undefined, action: Action) {
  return reducer(state, action);
}
