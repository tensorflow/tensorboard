/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {DiscreteFilter, DomainType, IntervalFilter} from '../types';
import {
  buildDiscreteFilter,
  buildHparamSpec,
  buildIntervalFilter,
} from './testing';
import {
  combineDefaultHparamFilters,
  combineDefaultMetricFilters,
  getIdFromExperimentIds,
  hparamSpecToDefaultFilter,
} from './utils';

describe('hparams/_redux/utils test', () => {
  describe('#getIdFromExperimentIds', () => {
    it('forms a unique id from experiment ids', () => {
      expect(getIdFromExperimentIds(['foo', 'bar'])).toBe('["bar","foo"]');
    });

    it('sorts experiment ids for consistent id', () => {
      expect(getIdFromExperimentIds(['foo', '1', 'bar'])).toBe(
        '["1","bar","foo"]'
      );
    });

    it('does not mutate the original experimentIds', () => {
      const experimentIds = ['b', 'a'];
      getIdFromExperimentIds(experimentIds);
      expect(experimentIds).toEqual(['b', 'a']);
    });
  });

  describe('#combineDefaultHparamFilters', () => {
    it('combines filters with the same name', () => {
      const result = combineDefaultHparamFilters([
        new Map([
          [
            'foo',
            buildDiscreteFilter({
              possibleValues: ['foo', 'bar'],
              filterValues: ['foo', 'bar'],
            }),
          ],
        ]),
        new Map<string, DiscreteFilter | IntervalFilter>([
          ['a', buildDiscreteFilter({filterValues: ['qaz']})],
          [
            'yo',
            buildIntervalFilter({
              minValue: -1000,
              maxValue: 1000,
              filterLowerValue: -100,
              filterUpperValue: 100,
            }),
          ],
        ]),
      ]);

      expect(result).toEqual(
        new Map<string, DiscreteFilter | IntervalFilter>([
          [
            'foo',
            buildDiscreteFilter({
              possibleValues: ['foo', 'bar'],
              filterValues: ['foo', 'bar'],
            }),
          ],
          ['a', buildDiscreteFilter({filterValues: ['qaz']})],
          [
            'yo',
            buildIntervalFilter({
              minValue: -1000,
              maxValue: 1000,
              filterLowerValue: -100,
              filterUpperValue: 100,
            }),
          ],
        ])
      );
    });

    it('takes union for discrete filters', () => {
      const result = combineDefaultHparamFilters([
        new Map([
          [
            'foo',
            buildDiscreteFilter({
              possibleValues: ['foo', 'bar'],
              filterValues: ['foo', 'bar'],
            }),
          ],
        ]),
        new Map([
          [
            'foo',
            buildDiscreteFilter({
              possibleValues: ['foo', 'qaz', '1', '2'],
              filterValues: ['foo', 'qaz', '1'],
            }),
          ],
        ]),
        new Map([
          [
            'foo',
            buildDiscreteFilter({
              possibleValues: [],
              filterValues: [],
            }),
          ],
        ]),
      ]);

      expect(result).toEqual(
        new Map<string, DiscreteFilter | IntervalFilter>([
          [
            'foo',
            buildDiscreteFilter({
              possibleValues: ['foo', 'bar', 'qaz', '1', '2'],
              filterValues: ['foo', 'bar', 'qaz', '1'],
            }),
          ],
        ])
      );
    });

    it('takes min for min and max for max for interval filters', () => {
      const result = combineDefaultHparamFilters([
        new Map([
          [
            'foo',
            buildIntervalFilter({
              minValue: 0,
              maxValue: 100,
              filterLowerValue: 0,
              filterUpperValue: 100,
            }),
          ],
        ]),
        new Map([
          [
            'foo',
            buildIntervalFilter({
              minValue: -10000,
              maxValue: 1000,
              filterLowerValue: -10000,
              filterUpperValue: 0,
            }),
          ],
        ]),
      ]);

      expect(result).toEqual(
        new Map([
          [
            'foo',
            buildIntervalFilter({
              minValue: -10000,
              maxValue: 1000,
              filterLowerValue: -10000,
              filterUpperValue: 100,
            }),
          ],
        ])
      );
    });

    it('sets min or max to NaN with NaNs', () => {
      const result = combineDefaultHparamFilters([
        new Map([
          [
            'foo',
            buildIntervalFilter({
              filterLowerValue: -100,
              filterUpperValue: NaN,
            }),
          ],
        ]),
        new Map([
          [
            'foo',
            buildIntervalFilter({
              filterLowerValue: NaN,
              filterUpperValue: 0,
            }),
          ],
        ]),
      ]);

      expect(result).toEqual(
        new Map([
          [
            'foo',
            buildIntervalFilter({
              filterLowerValue: NaN,
              filterUpperValue: NaN,
            }),
          ],
        ])
      );
    });

    it('throws when filters with the same name are different types', () => {
      expect(() =>
        combineDefaultHparamFilters([
          new Map([
            [
              'foo',
              buildDiscreteFilter({
                filterValues: ['foo', 'bar'],
              }),
            ],
          ]),
          new Map([
            [
              'foo',
              buildIntervalFilter({
                filterLowerValue: -100,
                filterUpperValue: 100,
              }),
            ],
          ]),
        ])
      ).toThrow();
    });

    it('does not throw if there exists a conflicting hparam that only has empty values', () => {
      expect(() =>
        combineDefaultHparamFilters([
          new Map([
            ['foo', buildDiscreteFilter({possibleValues: ['', 'bar']})],
          ]),
          new Map([
            [
              'foo',
              buildIntervalFilter({
                filterLowerValue: -100,
                filterUpperValue: 100,
              }),
            ],
          ]),
        ])
      ).toThrow();

      expect(() =>
        combineDefaultHparamFilters([
          new Map([['foo', buildDiscreteFilter({possibleValues: ['']})]]),
          new Map([
            [
              'foo',
              buildIntervalFilter({
                filterLowerValue: -100,
                filterUpperValue: 100,
              }),
            ],
          ]),
        ])
      ).not.toThrow();

      expect(() =>
        combineDefaultHparamFilters([
          new Map([['foo', buildDiscreteFilter({possibleValues: []})]]),
          new Map([
            [
              'foo',
              buildIntervalFilter({
                filterLowerValue: -100,
                filterUpperValue: 100,
              }),
            ],
          ]),
        ])
      ).not.toThrow();
    });
  });

  describe('combineDefaultMetricFilters', () => {
    it('takes min for min and max for max for interval filters', () => {
      const result = combineDefaultMetricFilters([
        new Map([
          [
            'foo',
            buildIntervalFilter({
              minValue: -100,
              maxValue: 100,
              filterLowerValue: -100,
              filterUpperValue: 100,
            }),
          ],
        ]),
        new Map([
          [
            'foo',
            buildIntervalFilter({
              minValue: -10000,
              maxValue: 0,
              filterLowerValue: -10000,
              filterUpperValue: 0,
            }),
          ],
        ]),
      ]);

      expect(result).toEqual(
        new Map([
          [
            'foo',
            buildIntervalFilter({
              minValue: -10000,
              maxValue: 100,
              filterLowerValue: -10000,
              filterUpperValue: 100,
            }),
          ],
        ])
      );
    });

    it('sets min or max to NaN with NaNs', () => {
      const result = combineDefaultMetricFilters([
        new Map([
          [
            'foo',
            buildIntervalFilter({
              filterLowerValue: -100,
              filterUpperValue: NaN,
            }),
          ],
        ]),
        new Map([
          [
            'foo',
            buildIntervalFilter({
              filterLowerValue: NaN,
              filterUpperValue: 0,
            }),
          ],
        ]),
      ]);

      expect(result).toEqual(
        new Map([
          [
            'foo',
            buildIntervalFilter({
              filterLowerValue: NaN,
              filterUpperValue: NaN,
            }),
          ],
        ])
      );
    });
  });

  describe('hparamSpecToDefaultFilter', () => {
    it('creates discrete filter when domain type is discrete', () => {
      expect(
        hparamSpecToDefaultFilter(
          buildHparamSpec({
            domain: {
              type: DomainType.DISCRETE,
              values: [2, 4, 6],
            },
          })
        )
      ).toEqual({
        type: DomainType.DISCRETE,
        includeUndefined: true,
        possibleValues: [2, 4, 6],
        filterValues: [2, 4, 6],
      });
    });

    it('creates interval filter when domain type is interval', () => {
      expect(
        hparamSpecToDefaultFilter(
          buildHparamSpec({
            domain: {
              type: DomainType.INTERVAL,
              minValue: 2,
              maxValue: 4,
            },
          })
        )
      ).toEqual({
        type: DomainType.INTERVAL,
        includeUndefined: true,
        minValue: 2,
        maxValue: 4,
        filterLowerValue: 2,
        filterUpperValue: 4,
      });
    });
  });
});
