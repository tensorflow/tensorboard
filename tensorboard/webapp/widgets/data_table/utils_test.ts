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

import {ColumnGroup, ColumnHeaderType, Side} from './types';
import {dataTableUtils} from './utils';

describe('data table utils', () => {
  describe('columnToGroup', () => {
    [
      {
        testDesc: 'run column',
        column: {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        expectedGroup: ColumnGroup.RUN,
      },
      {
        testDesc: 'experiment alias column',
        column: {
          type: ColumnHeaderType.CUSTOM,
          name: 'experimentAlias',
          displayName: 'Experiment Alias',
          enabled: true,
        },
        expectedGroup: ColumnGroup.EXPERIMENT_ALIAS,
      },
      {
        testDesc: 'hparam column',
        column: {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        },
        expectedGroup: ColumnGroup.HPARAM,
      },
      {
        testDesc: 'standard column',
        column: {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        expectedGroup: ColumnGroup.OTHER,
      },
      {
        testDesc: 'custom column not named experiment alias',
        column: {
          type: ColumnHeaderType.CUSTOM,
          name: 'notExperimentAlias',
          displayName: 'Not Experiment Alias',
          enabled: true,
        },
        expectedGroup: ColumnGroup.OTHER,
      },
    ].forEach(({testDesc, column, expectedGroup}) => {
      it(`returns the group for ${testDesc}`, () => {
        expect(dataTableUtils.columnToGroup(column)).toEqual(expectedGroup);
      });
    });
  });

  describe('groupColumns', () => {
    it('groups columns according to a predefined order', () => {
      const inputColumns = [
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        },
        {
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
        },
        {
          type: ColumnHeaderType.CUSTOM,
          name: 'experimentAlias',
          displayName: 'Experiment Alias',
          enabled: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        },
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
      ];

      expect(dataTableUtils.groupColumns(inputColumns)).toEqual([
        {
          type: ColumnHeaderType.RUN,
          name: 'run',
          displayName: 'Run',
          enabled: true,
        },
        {
          type: ColumnHeaderType.CUSTOM,
          name: 'experimentAlias',
          displayName: 'Experiment Alias',
          enabled: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        },
        {
          type: ColumnHeaderType.VALUE,
          name: 'value',
          displayName: 'Value',
          enabled: true,
        },
        {
          type: ColumnHeaderType.SMOOTHED,
          name: 'smoothed',
          displayName: 'Smoothed',
          enabled: true,
        },
      ]);
    });
  });

  describe('moveColumn', () => {
    const fakeColumns = [
      {
        type: ColumnHeaderType.HPARAM,
        name: 'conv_layers',
        displayName: 'Conv Layers',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'conv_kernel_size',
        displayName: 'Conv Kernel Size',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'dense_layers',
        displayName: 'Dense Layers',
        enabled: true,
      },
      {
        type: ColumnHeaderType.HPARAM,
        name: 'dropout',
        displayName: 'Dropout',
        enabled: true,
      },
    ];

    it('returns original headers if source is not found', () => {
      const moveResult = dataTableUtils.moveColumn(
        fakeColumns,
        {
          type: ColumnHeaderType.HPARAM,
          name: 'nonexistent_param',
          displayName: 'Nonexistent param',
          enabled: false,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        },
        Side.LEFT
      );

      expect(moveResult).toEqual(fakeColumns);
    });

    it('returns original headers if source equals dest', () => {
      const moveResult = dataTableUtils.moveColumn(
        fakeColumns,
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        },
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_kernel_size',
          displayName: 'Conv Kernel Size',
          enabled: true,
        },
        Side.LEFT
      );

      expect(moveResult).toEqual(fakeColumns);
    });

    [
      {
        testDesc: 'to front if side is left',
        side: Side.LEFT,
        expectedResult: [
          fakeColumns[1],
          fakeColumns[0],
          ...fakeColumns.slice(2),
        ],
      },
      {
        testDesc: 'to back if side is right',
        side: Side.RIGHT,
        expectedResult: [
          fakeColumns[0],
          ...fakeColumns.slice(2),
          fakeColumns[1],
        ],
      },
    ].forEach(({testDesc, side, expectedResult}) => {
      it(`if destination not found, moves source ${testDesc}`, () => {
        const moveResult = dataTableUtils.moveColumn(
          fakeColumns,
          fakeColumns[1],
          {
            type: ColumnHeaderType.HPARAM,
            name: 'nonexistent param',
            displayName: 'Nonexistent param',
            enabled: true,
          },
          side
        );

        expect(moveResult).toEqual(expectedResult);
      });
    });

    it('swaps source and destination positions if destination is found', () => {
      const moveResult = dataTableUtils.moveColumn(
        fakeColumns,
        fakeColumns[1],
        fakeColumns[0],
        Side.LEFT
      );

      expect(moveResult).toEqual([
        fakeColumns[1],
        fakeColumns[0],
        ...fakeColumns.slice(2),
      ]);
    });
  });
});
