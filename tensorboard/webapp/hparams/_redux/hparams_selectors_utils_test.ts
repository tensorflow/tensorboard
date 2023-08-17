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
import {DatasetType, DomainType, HparamsValueType} from '../types';
import {combineHparamAndMetricSpecs} from './hparams_selectors_utils';
import {buildHparamSpec} from './testing';

describe('runs selectors utils test', () => {
  describe('#combineHparamAndMetricSpecs', () => {
    it('combines hparams', () => {
      const specs = [
        {
          hparams: [
            buildHparamSpec({
              displayName: 'Param 1',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
              name: 'param1',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
            buildHparamSpec({
              displayName: 'Param 2',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 100},
              name: 'param2',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
          ],
          metrics: [],
        },
        {
          hparams: [
            buildHparamSpec({
              displayName: 'Param 1',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
              name: 'param1',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
            buildHparamSpec({
              displayName: 'Param 3',
              domain: {type: DomainType.DISCRETE, values: ['A', 'B']},
              name: 'param3',
              type: HparamsValueType.DATA_TYPE_STRING,
            }),
          ],
          metrics: [],
        },
      ];

      expect(combineHparamAndMetricSpecs(...specs)).toEqual({
        hparams: [
          buildHparamSpec({
            displayName: 'Param 1',
            domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
            name: 'param1',
            type: HparamsValueType.DATA_TYPE_FLOAT64,
          }),
          buildHparamSpec({
            displayName: 'Param 2',
            domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 100},
            name: 'param2',
            type: HparamsValueType.DATA_TYPE_FLOAT64,
          }),
          buildHparamSpec({
            description: '',
            displayName: 'Param 3',
            domain: {type: DomainType.DISCRETE, values: ['A', 'B']},
            name: 'param3',
            type: HparamsValueType.DATA_TYPE_STRING,
          }),
        ],
        metrics: [],
      });
    });

    it('combines metrics', () => {
      const specs = [
        {
          hparams: [],
          metrics: [
            {
              name: {
                tag: 'acc',
                group: '',
              },
              tag: 'acc',
              displayName: 'Accuracy',
              description: '',
              datasetType: DatasetType.DATASET_TRAINING,
            },
            {
              name: {
                tag: 'loss',
                group: '',
              },
              tag: 'loss',
              displayName: 'Loss',
              description: '',
              datasetType: DatasetType.DATASET_TRAINING,
            },
          ],
        },
        {
          hparams: [],
          metrics: [
            {
              name: {
                tag: 'acc',
                group: '',
              },
              tag: 'acc',
              displayName: 'Accuracy',
              description: '',
              datasetType: DatasetType.DATASET_TRAINING,
            },
          ],
        },
      ];

      expect(combineHparamAndMetricSpecs(...specs)).toEqual({
        hparams: [],
        metrics: [
          {
            name: {
              tag: 'acc',
              group: '',
            },
            tag: 'acc',
            displayName: 'Accuracy',
            description: '',
            datasetType: DatasetType.DATASET_TRAINING,
          },
          {
            name: {
              tag: 'loss',
              group: '',
            },
            tag: 'loss',
            displayName: 'Loss',
            description: '',
            datasetType: DatasetType.DATASET_TRAINING,
          },
        ],
      });
    });

    it('throws error when hparams with same name mismatch in type', () => {
      const specs = [
        {
          hparams: [
            buildHparamSpec({
              displayName: 'Param 1',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
              name: 'param1',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
            buildHparamSpec({
              displayName: 'Param 1',
              domain: {type: DomainType.DISCRETE, values: ['A']},
              name: 'param1',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
          ],
          metrics: [],
        },
      ];

      expect(() => combineHparamAndMetricSpecs(...specs)).toThrowMatching(
        (thrown) => {
          return thrown.message.includes('param1, domains have to match');
        }
      );
    });

    it(
      'throws error when hparams with same name mismatch in interval ' +
        'bounds',
      () => {
        const specs = [
          {
            hparams: [
              buildHparamSpec({
                displayName: 'Param 1',
                domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
                name: 'param1',
                type: HparamsValueType.DATA_TYPE_FLOAT64,
              }),
              buildHparamSpec({
                displayName: 'Param 1',
                domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 100},
                name: 'param1',
                type: HparamsValueType.DATA_TYPE_FLOAT64,
              }),
            ],
            metrics: [],
          },
        ];

        expect(() => combineHparamAndMetricSpecs(...specs)).toThrowMatching(
          (thrown) => {
            return thrown.message.includes('param1, domains have to match');
          }
        );
      }
    );

    it(
      'throws error when hparams with same name mismatch in discrete' + 'value',
      () => {
        const specs = [
          {
            hparams: [
              buildHparamSpec({
                displayName: 'Param 1',
                domain: {type: DomainType.DISCRETE, values: ['foo', 'bar']},
                name: 'param1',
                type: HparamsValueType.DATA_TYPE_FLOAT64,
              }),
              buildHparamSpec({
                displayName: 'Param 1',
                domain: {
                  type: DomainType.DISCRETE,
                  values: ['foo', 'bar', 'baz'],
                },
                name: 'param1',
                type: HparamsValueType.DATA_TYPE_FLOAT64,
              }),
            ],
            metrics: [],
          },
        ];

        expect(() => combineHparamAndMetricSpecs(...specs)).toThrowMatching(
          (thrown) => {
            return thrown.message.includes('param1, domains have to match');
          }
        );
      }
    );

    it('throws error when metrics with the same tag mismatch', () => {
      const specs = [
        {
          hparams: [],
          metrics: [
            {
              name: {
                tag: 'acc',
                group: '',
              },
              tag: 'acc',
              displayName: 'Accuracy',
              description: '',
              datasetType: DatasetType.DATASET_TRAINING,
            },
            {
              name: {
                tag: 'acc',
                group: '',
              },
              tag: 'acc',
              displayName: 'Accuracy',
              description: '',
              datasetType: DatasetType.DATASET_VALIDATION,
            },
          ],
        },
      ];

      expect(() => combineHparamAndMetricSpecs(...specs)).toThrowMatching(
        (thrown) => {
          return thrown.message.includes('acc, datasetTypes have to match');
        }
      );
    });

    it('combines displayName when they are different', () => {
      const specs = [
        {
          hparams: [
            buildHparamSpec({
              displayName: 'Param 1',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
              name: 'param1',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
            buildHparamSpec({
              displayName: 'Param 2',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 100},
              name: 'param2',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
          ],
          metrics: [
            {
              name: {
                tag: 'acc',
                group: '',
              },
              tag: 'acc',
              displayName: 'Accuracy',
              description: '',
              datasetType: DatasetType.DATASET_TRAINING,
            },
          ],
        },
        {
          hparams: [
            buildHparamSpec({
              displayName: 'Param 1 Modified',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
              name: 'param1',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
            buildHparamSpec({
              displayName: 'Param 2',
              domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 100},
              name: 'param2',
              type: HparamsValueType.DATA_TYPE_FLOAT64,
            }),
          ],
          metrics: [
            {
              name: {
                tag: 'acc',
                group: ',',
              },
              tag: 'acc',
              displayName: 'Acc',
              description: '',
              datasetType: DatasetType.DATASET_TRAINING,
            },
          ],
        },
      ];

      expect(combineHparamAndMetricSpecs(...specs)).toEqual({
        hparams: [
          buildHparamSpec({
            displayName: 'Param 1 or Param 1 Modified',
            domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 1},
            name: 'param1',
            type: HparamsValueType.DATA_TYPE_FLOAT64,
          }),
          buildHparamSpec({
            displayName: 'Param 2',
            domain: {type: DomainType.INTERVAL, minValue: 0, maxValue: 100},
            name: 'param2',
            type: HparamsValueType.DATA_TYPE_FLOAT64,
          }),
        ],
        metrics: [
          {
            name: {
              tag: 'acc',
              group: '',
            },
            tag: 'acc',
            displayName: 'Accuracy or Acc',
            description: '',
            datasetType: DatasetType.DATASET_TRAINING,
          },
        ],
      });
    });
  });
});
