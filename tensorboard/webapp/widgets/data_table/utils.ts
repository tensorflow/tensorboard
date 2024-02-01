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

import {ColumnHeader, Side, ColumnGroup} from './types';

/**
 * Returns a new copy of the column headers with source moved to the index of destination.
 * Returns the original headers if the move is invalid.
 */
function moveColumn(
  columns: ColumnHeader[],
  source: ColumnHeader,
  destination: ColumnHeader,
  side?: Side
): ColumnHeader[] {
  const sourceIndex = columns.findIndex(
    (column: ColumnHeader) => column.name === source.name
  );
  let destinationIndex = columns.findIndex(
    (column: ColumnHeader) => column.name === destination.name
  );
  if (sourceIndex === -1 || sourceIndex === destinationIndex) {
    return columns;
  }
  if (destinationIndex === -1) {
    // Use side as a backup to determine source position if destination isn't found.
    if (side !== undefined) {
      destinationIndex = side === Side.LEFT ? 0 : columns.length - 1;
    } else {
      return columns;
    }
  }

  const newColumns = [...columns];
  newColumns.splice(sourceIndex, 1);
  newColumns.splice(destinationIndex, 0, source);
  return newColumns;
}

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

export const dataTableUtils = {
  moveColumn,
  groupColumns,
  columnToGroup,
};
