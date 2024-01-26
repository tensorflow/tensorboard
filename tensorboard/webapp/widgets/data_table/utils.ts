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
    return 'RUN';
  } else if (column.type === 'CUSTOM' && column.name === 'experimentAlias') {
    return 'EXPERIMENT_ALIAS';
  } else if (column.type === 'HPARAM') {
    return 'HPARAM';
  } else {
    return 'OTHER';
  }
}

/** Sorts columns into predefined groups.
 *
 * Preserves relative order within groups.
 */
function groupColumns(columns: ColumnHeader[]): ColumnHeader[] {
  const headerGroups = new Map<ColumnGroup, ColumnHeader[]>([
    ['RUN', []],
    ['EXPERIMENT_ALIAS', []],
    ['HPARAM', []],
    ['OTHER', []],
  ]);
  columns.forEach((column) => {
    headerGroups.get(columnToGroup(column))?.push(column);
  });
  return Array.from(headerGroups.values()).flat();
}

export const DataTableUtils = {
  groupColumns,
};
