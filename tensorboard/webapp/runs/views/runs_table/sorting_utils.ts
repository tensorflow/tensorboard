import {
  SortingInfo,
  SortingOrder,
  TableData,
} from '../../../widgets/data_table/types';
import {ExperimentAlias} from '../../../experiments/types';

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

const POTENTIALLY_NUMERIC = new Set(['string', 'number']);

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
      return orderFromLocalComparison(aValue, bValue);
    }

    if (
      POTENTIALLY_NUMERIC.has(typeof aValue) &&
      POTENTIALLY_NUMERIC.has(typeof bValue)
    ) {
      const aPrefix = parseNumericPrefix(aValue as string | number);
      const bPrefix = parseNumericPrefix(bValue as string | number);
      // Show runs with numbers prior to runs without numbers
      if (
        (aPrefix === undefined || bPrefix === undefined) &&
        aPrefix !== bPrefix
      ) {
        return orderFromLocalComparison(aPrefix, bPrefix);
      }
      if (aPrefix !== undefined && bPrefix !== undefined) {
        if (aPrefix === bPrefix) {
          const aPostfix =
            aValue.toString().slice(aPrefix.toString().length) || undefined;
          const bPostfix =
            bValue.toString().slice(bPrefix.toString().length) || undefined;
          return orderFromLocalComparison(aPostfix, bPostfix);
        }

        return orderFromLocalComparison(aPrefix, bPrefix);
      }
    }

    return orderFromLocalComparison(aValue, bValue);
  });
  return sortedItems;

  function orderFromLocalComparison(
    a: TableData[string] | undefined,
    b: TableData[string] | undefined
  ) {
    if (a === b) {
      return 0;
    }

    if (a === undefined) {
      return 1;
    }
    if (b === undefined) {
      return -1;
    }

    return a < b === (sort.order === SortingOrder.ASCENDING) ? -1 : 1;
  }
}
