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
  getCompareExperimentIdAliasSpec,
  getExperimentIdsFromNavigation,
  getRouteIdFromNavigation,
} from './store_only_utils';
import {buildRoute} from './testing';
import {RouteKind} from './types';

describe('app_routing store_only_utils test', () => {
  describe('#getCompareExperimentIdAliasSpec', () => {
    it('returns a Map that contains the experimentId to alias from CompareRouteParams', () => {
      const map = getCompareExperimentIdAliasSpec({
        experimentIds: 'a:123,b:345',
      });
      expect(map).toEqual(
        new Map([
          ['123', 'a'],
          ['345', 'b'],
        ])
      );
    });

    it('does not check for collision', () => {
      const map = getCompareExperimentIdAliasSpec({
        experimentIds: 'a:123,b:123',
      });
      expect(map).toEqual(new Map([['123', 'b']]));
    });

    it('throws when it is empty', () => {
      expect(() =>
        getCompareExperimentIdAliasSpec({
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
          pathname: '/compare',
          queryParams: [],
        })
      );
      expect(actual).toEqual(['1', '2']);
    });

    it('returns experiment id from EXPERIMENT route', () => {
      const actual = getExperimentIdsFromNavigation(
        buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: '1234'},
          pathname: '/experiment',
          queryParams: [],
        })
      );
      expect(actual).toEqual(['1234']);
    });

    it('returns null from EXPERIMENTS route', () => {
      const actual = getExperimentIdsFromNavigation(
        buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          params: {},
          pathname: '/experiments',
          queryParams: [],
        })
      );
      expect(actual).toBeNull();
    });
  });

  describe('#getRouteIdFromNavigation', () => {
    it('returns route ids from COMPARE_EXPERIMENT route', () => {
      const actual = getRouteIdFromNavigation(
        buildRoute({
          routeKind: RouteKind.COMPARE_EXPERIMENT,
          params: {experimentIds: 'e1:1,e2:2'},
          pathname: '/compare',
          queryParams: [],
        })
      );
      expect(actual).toEqual(`${RouteKind.COMPARE_EXPERIMENT}/1,2`);
    });

    it('returns route id from EXPERIMENT route', () => {
      const actual = getRouteIdFromNavigation(
        buildRoute({
          routeKind: RouteKind.EXPERIMENT,
          params: {experimentId: '1234'},
          pathname: '/experiment',
          queryParams: [],
        })
      );
      expect(actual).toEqual(`${RouteKind.EXPERIMENT}/1234`);
    });

    it('returns route id from EXPERIMENTS route', () => {
      const actual = getRouteIdFromNavigation(
        buildRoute({
          routeKind: RouteKind.EXPERIMENTS,
          params: {},
          pathname: '/experiments',
          queryParams: [],
        })
      );
      expect(actual).toEqual(`${RouteKind.EXPERIMENTS}`);
    });
  });
});
