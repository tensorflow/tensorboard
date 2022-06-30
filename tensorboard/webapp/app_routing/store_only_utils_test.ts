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

import {
  getCompareExperimentIdAliasWithNumberSpec,
  getExperimentIdsFromNavigation,
} from './store_only_utils';
import {buildRoute} from './testing';
import {RouteKind} from './types';

describe('app_routing store_only_utils test', () => {
  describe('#getCompareExperimentIdAliasWithNumberSpec', () => {
    it('returns a Map that contains the experimentId to alias from CompareRouteParams', () => {
      const map = getCompareExperimentIdAliasWithNumberSpec({
        experimentIds: 'a:123,b:345',
      });
      expect(map).toEqual(
        new Map([
          ['123', {aliasText: 'a', aliasNumber: 1}],
          ['345', {aliasText: 'b', aliasNumber: 2}],
        ])
      );
    });

    it('does not check for collision', () => {
      const map = getCompareExperimentIdAliasWithNumberSpec({
        experimentIds: 'a:123,b:123',
      });
      expect(map).toEqual(new Map([['123', {aliasText: 'a', aliasNumber: 1}]]));
    });

    it('ensure duplicates increase alias number', () => {
      const map = getCompareExperimentIdAliasWithNumberSpec({
        experimentIds: 'a:123,b:123,c:345',
      });
      expect(map).toEqual(
        new Map([
          ['123', {aliasText: 'a', aliasNumber: 1}],
          ['345', {aliasText: 'c', aliasNumber: 3}],
        ])
      );
    });

    it('includes empty aliases', () => {
      let map = getCompareExperimentIdAliasWithNumberSpec({
        experimentIds: 'a:123,:345',
      });
      expect(map).toEqual(
        new Map([
          ['123', {aliasText: 'a', aliasNumber: 1}],
          ['345', {aliasText: '', aliasNumber: 2}],
        ])
      );
      map = getCompareExperimentIdAliasWithNumberSpec({
        experimentIds: 'a:123,:345,c:567',
      });
      expect(map).toEqual(
        new Map([
          ['123', {aliasText: 'a', aliasNumber: 1}],
          ['345', {aliasText: '', aliasNumber: 2}],
          ['567', {aliasText: 'c', aliasNumber: 3}],
        ])
      );
    });

    it('throws when it is empty', () => {
      expect(() =>
        getCompareExperimentIdAliasWithNumberSpec({
          experimentIds: '',
        })
      ).toThrow();
    });
  });

  describe('#getExperimentIdsFromNavigation', () => {
    it('returns experiment ids from COMPARE_EXPERIMENT route', () => {
      const actual = getExperimentIdsFromNavigation(
        buildRoute({
          routeKind: RouteKind.COMPARE_EXPERIMENT,
          params: {experimentIds: 'e1:1,e2:2'},
        })
      );
      expect(actual).toEqual(['1', '2']);
    });

    it('returns experiment id from EXPERIMENT route', () => {
      const actual = getExperimentIdsFromNavigation(
        buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: '1234'},
        })
      );
      expect(actual).toEqual(['1234']);
    });

    it('returns null from EXPERIMENTS route', () => {
      const actual = getExperimentIdsFromNavigation(
        buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          params: {},
        })
      );
      expect(actual).toBeNull();
    });
  });
});
