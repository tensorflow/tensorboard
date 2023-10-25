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
import {
  SortingInfo,
  SortingOrder,
  TableData,
} from '../../../widgets/data_table/types';
import {ExperimentAlias} from '../../../experiments/types';

enum UndefinedStrategy {
  BEFORE,
  AFTER,
}

interface SortOptions {
  insertUndefined: UndefinedStrategy;
}

const POTENTIALLY_NUMERIC_TYPES = new Set(['string', 'number']);

const DEFAULT_SORT_OPTIONS: SortOptions = {
  insertUndefined: UndefinedStrategy.AFTER,
};

export function parseNumericPrefix(value: string | number) {
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : value;
  }

  if (!isNaN(parseInt(value))) {
    return parseInt(value);
  }

  for (let i = 0; i < value.length; i++) {
    if (isNaN(parseInt(value[i]))) {
      if (i === 0) return;
      return parseInt(value.slice(0, i));
    }
  }

  return;
}

export function sortTableDataItems(
  items: TableData[],
  sort: SortingInfo
): TableData[] {
  const sortedItems = [...items];

  sortedItems.sort((a, b) => {
    let aValue = a[sort.name];
    let bValue = b[sort.name];

    if (sort.name === 'experimentAlias') {
      aValue = (aValue as ExperimentAlias).aliasNumber;
      bValue = (bValue as ExperimentAlias).aliasNumber;
    }

    if (aValue === bValue) {
      return 0;
    }

    if (aValue === undefined || bValue === undefined) {
      return compareValues(aValue, bValue);
    }

    if (
      POTENTIALLY_NUMERIC_TYPES.has(typeof aValue) &&
      POTENTIALLY_NUMERIC_TYPES.has(typeof bValue)
    ) {
      const aPrefix = parseNumericPrefix(aValue as string | number);
      const bPrefix = parseNumericPrefix(bValue as string | number);
      // Show runs with numbers before to runs without numbers
      if (
        (aPrefix === undefined || bPrefix === undefined) &&
        aPrefix !== bPrefix
      ) {
        return compareValues(aPrefix, bPrefix, {
          insertUndefined: UndefinedStrategy.BEFORE,
        });
      }
      if (aPrefix !== undefined && bPrefix !== undefined) {
        if (aPrefix === bPrefix) {
          const aPostfix =
            aValue.toString().slice(aPrefix.toString().length) || undefined;
          const bPostfix =
            bValue.toString().slice(bPrefix.toString().length) || undefined;
          return compareValues(aPostfix, bPostfix, {
            insertUndefined: UndefinedStrategy.BEFORE,
          });
        }

        return compareValues(aPrefix, bPrefix);
      }
    }

    return compareValues(aValue, bValue);
  });
  return sortedItems;

  function compareValues(
    a: TableData[string] | undefined,
    b: TableData[string] | undefined,
    {insertUndefined}: SortOptions = DEFAULT_SORT_OPTIONS
  ) {
    if (a === b) {
      return 0;
    }

    if (a === undefined) {
      return insertUndefined === UndefinedStrategy.AFTER ? 1 : -1;
    }
    if (b === undefined) {
      return insertUndefined === UndefinedStrategy.AFTER ? -1 : 1;
    }

    return a < b === (sort.order === SortingOrder.ASCENDING) ? -1 : 1;
  }
}
