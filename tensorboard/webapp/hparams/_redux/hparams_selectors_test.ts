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

import * as selectors from './hparams_selectors';
import {
  buildIntervalFilter,
  buildHparam,
  buildHparamSpec,
  buildHparamsState,
  buildMetric,
  buildMetricSpec,
  buildStateFromHparamsState,
  buildDiscreteFilter,
} from './testing';

describe('hparams/_redux/hparams_selectors_test', () => {
  describe('#getHparamFilterMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getHparamFilterMap.release();
    });

    it('returns default hparam filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          foo: {
            hparam: buildHparam({
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                [
                  'optimizer',
                  buildDiscreteFilter({
                    filterValues: ['a', 'b', 'c'],
                  }),
                ],
              ]),
            }),
            metric: buildMetric(),
          },
        })
      );

      expect(selectors.getHparamFilterMap(state, 'foo')).toEqual(
        new Map([
          ['optimizer', buildDiscreteFilter({filterValues: ['a', 'b', 'c']})],
        ])
      );
    });

    it('returns custom hparam filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          foo: {
            hparam: buildHparam({
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                [
                  'optimizer',
                  buildDiscreteFilter({
                    filterValues: ['a', 'b', 'c'],
                  }),
                ],
              ]),
              filters: new Map([
                [
                  'optimizer',
                  buildDiscreteFilter({
                    filterValues: ['d', 'e', 'f'],
                  }),
                ],
              ]),
            }),
            metric: buildMetric(),
          },
        })
      );

      expect(selectors.getHparamFilterMap(state, 'foo')).toEqual(
        new Map([
          [
            'optimizer',
            buildDiscreteFilter({
              filterValues: ['d', 'e', 'f'],
            }),
          ],
        ])
      );
    });

    it('returns empty map for an unknown exp', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          foo: {
            hparam: buildHparam({
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                ['optimizer', buildDiscreteFilter({filterValues: ['a']})],
              ]),
            }),
            metric: buildMetric(),
          },
        })
      );

      expect(selectors.getHparamFilterMap(state, 'bar')).toEqual(new Map());
    });
  });

  describe('#getMetricFilterMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getMetricFilterMap.release();
    });

    it('returns default metric filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          foo: {
            hparam: buildHparam(),
            metric: buildMetric({
              specs: [buildMetricSpec({tag: 'acc'})],
              defaultFilters: new Map([
                [
                  'acc',
                  buildIntervalFilter({
                    filterLowerValue: 0,
                    filterUpperValue: 1,
                  }),
                ],
              ]),
            }),
          },
        })
      );

      expect(selectors.getMetricFilterMap(state, 'foo')).toEqual(
        new Map([
          [
            'acc',
            buildIntervalFilter({
              filterLowerValue: 0,
              filterUpperValue: 1,
            }),
          ],
        ])
      );
    });

    it('returns custom metric filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          foo: {
            hparam: buildHparam(),
            metric: buildMetric({
              specs: [buildMetricSpec({tag: 'acc'})],
              defaultFilters: new Map([
                [
                  'acc',
                  buildIntervalFilter({
                    filterLowerValue: 0,
                    filterUpperValue: 1,
                  }),
                ],
              ]),
              filters: new Map([
                [
                  'acc',
                  buildIntervalFilter({
                    filterLowerValue: 0,
                    filterUpperValue: 0.1,
                  }),
                ],
              ]),
            }),
          },
        })
      );
      expect(selectors.getMetricFilterMap(state, 'foo')).toEqual(
        new Map([
          [
            'acc',
            buildIntervalFilter({
              filterLowerValue: 0,
              filterUpperValue: 0.1,
            }),
          ],
        ])
      );
    });

    it('returns empty map for an unknown exp', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          foo: {
            hparam: buildHparam(),
            metric: buildMetric({
              specs: [buildMetricSpec({tag: 'acc'})],
              defaultFilters: new Map([
                [
                  'acc',
                  buildIntervalFilter({
                    filterLowerValue: 0,
                    filterUpperValue: 1,
                  }),
                ],
              ]),
              filters: new Map([
                [
                  'acc',
                  buildIntervalFilter({
                    filterLowerValue: 0,
                    filterUpperValue: 0.1,
                  }),
                ],
              ]),
            }),
          },
        })
      );
      expect(selectors.getMetricFilterMap(state, 'bar')).toEqual(new Map());
    });
  });
});
