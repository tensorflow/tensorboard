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

import {ColumnHeaderType} from '../../widgets/data_table/types';
import {DomainType} from '../types';
import * as selectors from './hparams_selectors';
import {
  buildHparamSpec,
  buildHparamsState,
  buildStateFromHparamsState,
} from './testing';

describe('hparams/_redux/hparams_selectors_test', () => {
  describe('#getDashboardHparamSpecs', () => {
    it('returns dashboard specs', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          dashboardHparamSpecs: [buildHparamSpec({name: 'foo'})],
        })
      );

      expect(selectors.getDashboardHparamSpecs(state)).toEqual([
        buildHparamSpec({name: 'foo'}),
      ]);
    });
  });

  describe('#getDashboardSessionGroups', () => {
    it('returns dashboard session groups', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          dashboardSessionGroups: [
            {
              name: 'SessionGroup1',
              hparams: {hparam1: 'value1'},
              sessions: [],
            },
          ],
        })
      );
      expect(selectors.getDashboardSessionGroups(state)).toEqual([
        {name: 'SessionGroup1', hparams: {hparam1: 'value1'}, sessions: []},
      ]);
    });
  });

  describe('#getDashboardDefaultHparamFilters', () => {
    it('generates default filters for all hparam specs', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          dashboardHparamSpecs: [
            buildHparamSpec({
              name: 'interval hparam',
              domain: {
                type: DomainType.INTERVAL,
                minValue: 2,
                maxValue: 5,
              },
            }),
            buildHparamSpec({
              name: 'discrete hparam',
              domain: {
                type: DomainType.DISCRETE,
                values: [2, 4, 6, 8],
              },
            }),
          ],
        })
      );
      expect(selectors.getDashboardDefaultHparamFilters(state)).toEqual(
        new Map([
          [
            'interval hparam',
            {
              type: DomainType.INTERVAL,
              includeUndefined: true,
              minValue: 2,
              maxValue: 5,
              filterLowerValue: 2,
              filterUpperValue: 5,
            },
          ],
          [
            'discrete hparam',
            {
              type: DomainType.DISCRETE,
              includeUndefined: true,
              possibleValues: [2, 4, 6, 8],
              filterValues: [2, 4, 6, 8],
            },
          ],
        ])
      );
    });
  });

  describe('#getDashboardDisplayedHparamColumns', () => {
    it('returns no columns if no hparam specs', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          dashboardHparamSpecs: [],
          dashboardDisplayedHparamColumns: [
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
          ],
        })
      );

      expect(selectors.getDashboardDisplayedHparamColumns(state)).toEqual([]);
    });

    it('returns only hparam columns that have specs', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          dashboardHparamSpecs: [buildHparamSpec({name: 'conv_layers'})],
          dashboardDisplayedHparamColumns: [
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
          ],
        })
      );

      expect(selectors.getDashboardDisplayedHparamColumns(state)).toEqual([
        {
          type: ColumnHeaderType.HPARAM,
          name: 'conv_layers',
          displayName: 'Conv Layers',
          enabled: true,
        },
      ]);
    });
  });

  describe('#getNumDashboardHparamsToLoad', () => {
    it('returns dashboard specs', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          numDashboardHparamsToLoad: 5,
        })
      );

      expect(selectors.getNumDashboardHparamsToLoad(state)).toEqual(5);
    });
  });

  describe('#getNumDashboardHparamsToLoad', () => {
    it('returns dashboard specs', () => {
      const state = buildStateFromHparamsState(
        buildHparamsState({
          numDashboardHparamsLoaded: 22,
        })
      );

      expect(selectors.getNumDashboardHparamsLoaded(state)).toEqual(22);
    });
  });
});
