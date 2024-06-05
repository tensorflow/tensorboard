/* Copyright 2023 The TensorFlow Authors. All Rights Reserved.

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
 * This enum defines the columns available in the data table. The
 * ScalarCardComponent must know which piece of data is associated with each
 * value and the DataTable widget must know how to display each value.
 */
export enum ColumnHeaderType {
  COLOR = 'COLOR',
  RELATIVE_TIME = 'RELATIVE_TIME',
  RUN = 'RUN',
  STEP = 'STEP',
  EXPERIMENT = 'EXPERIMENT',
  TIME = 'TIME',
  VALUE = 'VALUE',
  SMOOTHED = 'SMOOTHED',
  VALUE_CHANGE = 'VALUE_CHANGE',
  START_STEP = 'START_STEP',
  END_STEP = 'END_STEP',
  START_VALUE = 'START_VALUE',
  END_VALUE = 'END_VALUE',
  MIN_VALUE = 'MIN_VALUE',
  MAX_VALUE = 'MAX_VALUE',
  PERCENTAGE_CHANGE = 'PERCENTAGE_CHANGE',
  STEP_AT_MAX = 'STEP_AT_MAX',
  STEP_AT_MIN = 'STEP_AT_MIN',
  MEAN = 'MEAN',
  RAW_CHANGE = 'RAW_CHANGE',
  HPARAM = 'HPARAM',
  METRIC = 'METRIC',
  CUSTOM = 'CUSTOM',
}

export enum DomainType {
  DISCRETE,
  INTERVAL,
}

export type DiscreteFilterValues = string[] | number[] | boolean[];

export type DiscreteFilterValue = DiscreteFilterValues[number];

export interface DiscreteFilter {
  type: DomainType.DISCRETE;
  includeUndefined: boolean;
  possibleValues: DiscreteFilterValues;
  // Subset of `possibleValues`
  filterValues: DiscreteFilterValues;
}

export interface IntervalFilter {
  type: DomainType.INTERVAL;
  includeUndefined: boolean;
  minValue: number;
  maxValue: number;
  // Filter values have to be in between min and max values (inclusive).
  filterLowerValue: number;
  filterUpperValue: number;
}

export interface FilterAddedEvent {
  name: string;
  value: IntervalFilter | DiscreteFilter;
}

export declare interface ColumnHeader {
  type: ColumnHeaderType;
  name: string;
  displayName: string;
  enabled: boolean;
  tags?: string[];

  // Default to false when not specified.
  removable?: boolean;
  sortable?: boolean;
  movable?: boolean;
  filterable?: boolean;
}

export enum SortingOrder {
  ASCENDING,
  DESCENDING,
}

export interface SortingInfo {
  name: string;
  order: SortingOrder;
}

/**
 * An object which essentially contains the data for an entire row in the
 * DataTable. It will have a value for each required ColumnHeader for a given
 * run.
 */
export type TableData = Record<string, string | number | boolean | object> & {
  id: string;
};

export enum DataTableMode {
  SINGLE,
  RANGE,
}

export enum Side {
  RIGHT,
  LEFT,
}

export interface ReorderColumnEvent {
  source: ColumnHeader;
  destination: ColumnHeader;
  side?: Side | undefined; // Only used when destination is not found.
}

export interface AddColumnEvent {
  column: ColumnHeader;
  nextTo?: ColumnHeader | undefined;
  side?: Side | undefined;
}

export enum ColumnGroup {
  RUN = 'RUN',
  EXPERIMENT_ALIAS = 'EXPERIMENT_ALIAS',
  HPARAM = 'HPARAM',
  OTHER = 'OTHER',
}

export enum AddColumnSize {
  DEFAULT = 'DEFAULT',
  SMALL = 'SMALL',
}
