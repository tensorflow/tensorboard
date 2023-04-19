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
  buildDiscreteFilter,
  buildFilterState,
  buildHparamSpec,
  buildHparamsState,
  buildIntervalFilter,
  buildMetricSpec,
  buildSpecs,
  buildStateFromHparamsState,
} from './testing';

describe('hparams/_redux/hparams_selectors_test', () => {
  describe('#getHparamFilterMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getHparamFilterMap.release();
    });

    it('returns default hparam filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState(
          buildSpecs('foo', {
            hparam: {
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                [
                  'optimizer',
                  buildDiscreteFilter({
                    filterValues: ['a', 'b', 'c'],
                  }),
                ],
              ]),
            },
          })
        )
      );

      expect(selectors.getHparamFilterMap(state, ['foo'])).toEqual(
        new Map([
          ['optimizer', buildDiscreteFilter({filterValues: ['a', 'b', 'c']})],
        ])
      );
    });

    it('returns custom hparam filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState(
          buildSpecs('foo', {
            hparam: {
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                [
                  'optimizer',
                  buildDiscreteFilter({
                    filterValues: ['a', 'b', 'c'],
                  }),
                ],
              ]),
            },
          }),
          buildFilterState(['foo'], {
            hparams: new Map([
              [
                'optimizer',
                buildDiscreteFilter({
                  filterValues: ['d', 'e', 'f'],
                }),
              ],
            ]),
          })
        )
      );

      expect(selectors.getHparamFilterMap(state, ['foo'])).toEqual(
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
        buildHparamsState(
          buildSpecs('foo', {
            hparam: {
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                ['optimizer', buildDiscreteFilter({filterValues: ['a']})],
              ]),
            },
          })
        )
      );

      expect(selectors.getHparamFilterMap(state, ['bar'])).toEqual(new Map());
    });
  });

  describe('#getHparamFilterMapFromExperimentIds()', () => {
    it('returns default hparam filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState(
          buildSpecs('foo', {
            hparam: {
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                [
                  'optimizer',
                  buildDiscreteFilter({
                    filterValues: ['a', 'b', 'c'],
                  }),
                ],
              ]),
            },
          })
        )
      );

      expect(
        selectors.getHparamFilterMapFromExperimentIds(['foo'])(state)
      ).toEqual(
        new Map([
          ['optimizer', buildDiscreteFilter({filterValues: ['a', 'b', 'c']})],
        ])
      );
    });

    it('returns custom hparam filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState(
          buildSpecs('foo', {
            hparam: {
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                [
                  'optimizer',
                  buildDiscreteFilter({
                    filterValues: ['a', 'b', 'c'],
                  }),
                ],
              ]),
            },
          }),
          buildFilterState(['foo'], {
            hparams: new Map([
              [
                'optimizer',
                buildDiscreteFilter({
                  filterValues: ['d', 'e', 'f'],
                }),
              ],
            ]),
          })
        )
      );

      expect(
        selectors.getHparamFilterMapFromExperimentIds(['foo'])(state)
      ).toEqual(
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
        buildHparamsState(
          buildSpecs('foo', {
            hparam: {
              specs: [buildHparamSpec({name: 'optimizer'})],
              defaultFilters: new Map([
                ['optimizer', buildDiscreteFilter({filterValues: ['a']})],
              ]),
            },
          })
        )
      );

      expect(
        selectors.getHparamFilterMapFromExperimentIds(['bar'])(state)
      ).toEqual(new Map());
    });
  });

  describe('#getMetricFilterMap', () => {
    beforeEach(() => {
      // Clear the memoization.
      selectors.getMetricFilterMap.release();
    });

    it('returns default metric filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState(
          buildSpecs('foo', {
            metric: {
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
            },
          })
        )
      );

      expect(selectors.getMetricFilterMap(state, ['foo'])).toEqual(
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
        buildHparamsState(
          buildSpecs('foo', {
            metric: {
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
            },
          }),
          buildFilterState(['foo'], {
            metrics: new Map([
              [
                'acc',
                buildIntervalFilter({
                  filterLowerValue: 0,
                  filterUpperValue: 0.1,
                }),
              ],
            ]),
          })
        )
      );
      expect(selectors.getMetricFilterMap(state, ['foo'])).toEqual(
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
        buildHparamsState(
          buildSpecs('foo', {
            metric: {
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
            },
          }),
          buildFilterState(['foo'], {
            metrics: new Map([
              [
                'acc',
                buildIntervalFilter({
                  filterLowerValue: 0,
                  filterUpperValue: 0.1,
                }),
              ],
            ]),
          })
        )
      );
      expect(selectors.getMetricFilterMap(state, ['bar'])).toEqual(new Map());
    });
  });

  describe('#getMetricFilterMapFromExperimentIds', () => {
    it('returns default metric filter map', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState(
          buildSpecs('foo', {
            metric: {
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
            },
          })
        )
      );

      expect(
        selectors.getMetricFilterMapFromExperimentIds(['foo'])(state)
      ).toEqual(
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
        buildHparamsState(
          buildSpecs('foo', {
            metric: {
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
            },
          }),
          buildFilterState(['foo'], {
            metrics: new Map([
              [
                'acc',
                buildIntervalFilter({
                  filterLowerValue: 0,
                  filterUpperValue: 0.1,
                }),
              ],
            ]),
          })
        )
      );
      expect(
        selectors.getMetricFilterMapFromExperimentIds(['foo'])(state)
      ).toEqual(
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
        buildHparamsState(
          buildSpecs('foo', {
            metric: {
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
            },
          }),
          buildFilterState(['foo'], {
            metrics: new Map([
              [
                'acc',
                buildIntervalFilter({
                  filterLowerValue: 0,
                  filterUpperValue: 0.1,
                }),
              ],
            ]),
          })
        )
      );
      expect(
        selectors.getMetricFilterMapFromExperimentIds(['bar'])(state)
      ).toEqual(new Map());
    });
  });
});
