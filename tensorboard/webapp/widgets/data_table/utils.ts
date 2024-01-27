/* Copyright 2024 The TensorFlow Authors. All Rights Reserved.
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

import {ColumnHeader, ColumnGroup} from './types';

function columnToGroup(column: ColumnHeader): ColumnGroup {
  if (column.type === 'RUN') {
    return ColumnGroup.RUN;
  } else if (column.type === 'CUSTOM' && column.name === 'experimentAlias') {
    return ColumnGroup.EXPERIMENT_ALIAS;
  } else if (column.type === 'HPARAM') {
    return ColumnGroup.HPARAM;
  } else {
    return ColumnGroup.OTHER;
  }
}

/**
 * Sorts columns into predefined groups.
 *
 * Preserves relative column order within groups.
 */
function groupColumns(columns: ColumnHeader[]): ColumnHeader[] {
  // Using Map ensures that keys preserve order.
  const headerGroups = new Map<ColumnGroup, ColumnHeader[]>([
    [ColumnGroup.RUN, []],
    [ColumnGroup.EXPERIMENT_ALIAS, []],
    [ColumnGroup.HPARAM, []],
    [ColumnGroup.OTHER, []],
  ]);
  columns.forEach((column) => {
    headerGroups.get(columnToGroup(column))?.push(column);
  });
  return Array.from(headerGroups.values()).flat();
}

export const DataTableUtils = {
  groupColumns,
};
