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
import {SortingOrder} from '../../../widgets/data_table/types';
import {parseNumericPrefix, sortTableDataItems} from './sorting_utils';

describe('sorting utils', () => {
  describe('parseNumericPrefix', () => {
    it('returns undefined when a non numeric value is provided', () => {
      expect(parseNumericPrefix('')).toBeUndefined();
      expect(parseNumericPrefix('foo')).toBeUndefined();
      expect(parseNumericPrefix('foo123')).toBeUndefined();
      expect(parseNumericPrefix(NaN)).toBeUndefined();
    });

    it('returns all leading numbers from a string', () => {
      expect(parseNumericPrefix('0')).toEqual(0);
      expect(parseNumericPrefix('123')).toEqual(123);
      expect(parseNumericPrefix('123train')).toEqual(123);
      expect(parseNumericPrefix('123/')).toEqual(123);
      expect(parseNumericPrefix('123/foo')).toEqual(123);
      expect(parseNumericPrefix('123/foo/456')).toEqual(123);
    });

    it('returns numbers when provided', () => {
      expect(parseNumericPrefix(123)).toEqual(123);
    });
  });

  describe('sortTableDataItems', () => {
    it('sorts experimentAlias by alias number', () => {
      expect(
        sortTableDataItems(
          [
            {
              id: 'row 1 id',
              experimentAlias: {
                aliasNumber: 5,
              },
            },
            {
              id: 'row 2 id',
              experimentAlias: {
                aliasNumber: 3,
              },
            },
          ],
          {
            order: SortingOrder.ASCENDING,
            name: 'experimentAlias',
          }
        )
      ).toEqual([
        {
          id: 'row 2 id',
          experimentAlias: {
            aliasNumber: 3,
          },
        },
        {
          id: 'row 1 id',
          experimentAlias: {
            aliasNumber: 5,
          },
        },
      ]);
    });

    it('sorts runs by their leading numbers', () => {
      expect(
        sortTableDataItems(
          [
            {
              id: 'row 1 id',
              name: '1/myrun',
            },
            {
              id: 'row 2 id',
              name: '2/myrun',
            },
            {
              id: 'row 3 id',
              name: '10/myrun',
            },
          ],
          {
            order: SortingOrder.ASCENDING,
            name: 'name',
          }
        )
      ).toEqual([
        {
          id: 'row 1 id',
          name: '1/myrun',
        },
        {
          id: 'row 2 id',
          name: '2/myrun',
        },
        {
          id: 'row 3 id',
          name: '10/myrun',
        },
      ]);
    });

    it('sorts runs with purely numeric run names before runs with leading numbers', () => {
      expect(
        sortTableDataItems(
          [
            {
              id: 'row 1 id',
              name: '0',
            },
            {
              id: 'row 2 id',
              name: '0/myrun2',
            },
            {
              id: 'row 3 id',
              name: '0/myrun1',
            },
          ],
          {
            order: SortingOrder.ASCENDING,
            name: 'name',
          }
        )
      ).toEqual([
        {
          id: 'row 1 id',
          name: '0',
        },
        {
          id: 'row 3 id',
          name: '0/myrun1',
        },
        {
          id: 'row 2 id',
          name: '0/myrun2',
        },
      ]);
    });

    it('sorts runs with string names', () => {
      expect(
        sortTableDataItems(
          [
            {
              id: 'row 1 id',
              name: 'aaa',
            },
            {
              id: 'row 2 id',
              name: 'bbb',
            },
            {
              id: 'row 3 id',
              name: 'ccc',
            },
          ],
          {
            order: SortingOrder.ASCENDING,
            name: 'name',
          }
        )
      ).toEqual([
        {
          id: 'row 1 id',
          name: 'aaa',
        },
        {
          id: 'row 2 id',
          name: 'bbb',
        },
        {
          id: 'row 3 id',
          name: 'ccc',
        },
      ]);
    });

    it('shows runs without numbers before runs with numbers', () => {
      expect(
        sortTableDataItems(
          [
            {
              id: 'row 1 id',
              name: 'aaa',
            },
            {
              id: 'row 2 id',
              name: '1aaa',
            },
            {
              id: 'row 3 id',
              name: '2bbb',
            },
          ],
          {
            order: SortingOrder.ASCENDING,
            name: 'name',
          }
        )
      ).toEqual([
        {
          id: 'row 1 id',
          name: 'aaa',
        },
        {
          id: 'row 2 id',
          name: '1aaa',
        },
        {
          id: 'row 3 id',
          name: '2bbb',
        },
      ]);
    });

    it('places undefined values at the end', () => {
      const input: any = [
        {
          id: 'row 1 id',
          foo: '1/myrun',
        },
        {
          id: 'row 2 id',
        },
        {
          id: 'row 3 id',
          foo: '10/myrun',
        },
      ];

      expect(
        sortTableDataItems(input, {
          order: SortingOrder.ASCENDING,
          name: 'foo',
        })
      ).toEqual([
        {
          id: 'row 1 id',
          foo: '1/myrun',
        },
        {
          id: 'row 3 id',
          foo: '10/myrun',
        },
        {
          id: 'row 2 id',
        },
      ]);

      expect(
        sortTableDataItems(input, {
          order: SortingOrder.DESCENDING,
          name: 'foo',
        })
      ).toEqual([
        {
          id: 'row 3 id',
          foo: '10/myrun',
        },
        {
          id: 'row 1 id',
          foo: '1/myrun',
        },
        {
          id: 'row 2 id',
        },
      ]);
    });
  });
});
