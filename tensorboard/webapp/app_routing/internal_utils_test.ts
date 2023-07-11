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

import * as utils from './internal_utils';
import {
  buildCompareRoute,
  buildExperimentRouteFromId,
  buildRoute,
} from './testing';
import {DeepLinkGroup, RouteKind} from './types';

function getMockReturnValuesFuntion(testUint8array: Uint8Array) {
  return function <Uint8Array>(arr: Uint8Array): Uint8Array {
    if (arr instanceof Uint8Array) {
      arr.set(testUint8array);
      return arr;
    }
    throw new Error(`'getMockReturnValuesFuntion' input type invalid: ${arr}`);
  };
}

describe('app_routing/utils', () => {
  describe('#parseCompareExperimentStr', () => {
    it('parses the map correctly', () => {
      expect(utils.parseCompareExperimentStr('exp1:123,exp2:999')).toEqual([
        {name: 'exp1', id: '123'},
        {name: 'exp2', id: '999'},
      ]);
    });

    it('handles single name map, too', () => {
      expect(utils.parseCompareExperimentStr('exp1:123')).toEqual([
        {name: 'exp1', id: '123'},
      ]);
    });

    it('permits colons in individual experiment IDs', () => {
      expect(
        utils.parseCompareExperimentStr('exp1:foo:my-universe:123')
      ).toEqual([{name: 'exp1', id: 'foo:my-universe:123'}]);
    });

    it('parses experiments with no name', () => {
      expect(
        utils.parseCompareExperimentStr(
          'exp1:foo,:universe:bar,:baz:my-universe:123'
        )
      ).toEqual([
        {name: 'exp1', id: 'foo'},
        {name: '', id: 'universe:bar'},
        {name: '', id: 'baz:my-universe:123'},
      ]);
    });

    it('throws error when the map is malformed', () => {
      expect(() => utils.parseCompareExperimentStr('exp1')).toThrow();
      expect(() => utils.parseCompareExperimentStr('exp1:')).toThrow();
    });
  });

  describe('#serializeCompareExperimentParams', () => {
    it('serializes to empty string with an empty input', () => {
      expect(utils.serializeCompareExperimentParams([])).toBe('');
    });

    it('serializes alias and displayName', () => {
      const input = [
        {alias: 'foo', id: 'bar'},
        {alias: 'baz', id: 'baz'},
      ];
      expect(utils.serializeCompareExperimentParams(input)).toBe(
        'foo:bar,baz:baz'
      );
    });

    it('does not deduplicate or validate', () => {
      const input = [
        {alias: 'foo', id: 'bar'},
        // does not deduplicate
        {alias: 'tar', id: 'bar'},
        {alias: 'foo', id: 'bang'},
        {alias: '', id: ''},
      ];
      expect(utils.serializeCompareExperimentParams(input)).toBe(
        'foo:bar,tar:bar,foo:bang,:'
      );
    });
  });

  describe('#getExperimentIdsFromRouteParams', () => {
    it('returns ids from compare route', () => {
      const actual = utils.getExperimentIdsFromRouteParams(
        RouteKind.COMPARE_EXPERIMENT,
        {experimentIds: 'e1:1,e2:2'}
      );
      expect(actual).toEqual(['1', '2']);
    });

    it('returns single id from card route', () => {
      const actual = utils.getExperimentIdsFromRouteParams(RouteKind.CARD, {
        experimentIds: '111',
      });
      expect(actual).toEqual(['111']);
    });

    it('returns multiple ids from card route', () => {
      const actual = utils.getExperimentIdsFromRouteParams(RouteKind.CARD, {
        experimentIds: 'e1:111,e2:222',
      });
      expect(actual).toEqual(['111', '222']);
    });

    it('returns id from experiment route', () => {
      const actual = utils.getExperimentIdsFromRouteParams(
        RouteKind.EXPERIMENT,
        {experimentId: '1234'}
      );
      expect(actual).toEqual(['1234']);
    });

    it('returns null for UNKNOWN route', () => {
      const actual = utils.getExperimentIdsFromRouteParams(
        RouteKind.UNKNOWN,
        {}
      );
      expect(actual).toBeNull();
    });

    it('returns null for EXPERIMENTS route', () => {
      const actual = utils.getExperimentIdsFromRouteParams(
        RouteKind.EXPERIMENTS,
        {}
      );
      expect(actual).toBeNull();
    });
  });

  describe('#areSameRouteKindAndExperiments', () => {
    it('returns true when both routes are null', () => {
      expect(utils.areSameRouteKindAndExperiments(null, null)).toBeTrue();
    });

    it('returns false when one route is null', () => {
      expect(
        utils.areSameRouteKindAndExperiments(buildRoute(), null)
      ).toBeFalse();
      expect(
        utils.areSameRouteKindAndExperiments(null, buildRoute())
      ).toBeFalse();
    });

    it('returns false when different kinds', () => {
      expect(
        utils.areSameRouteKindAndExperiments(
          buildCompareRoute(['a:123']),
          buildExperimentRouteFromId('123')
        )
      ).toBeFalse();
      expect(
        utils.areSameRouteKindAndExperiments(
          buildExperimentRouteFromId('123'),
          buildCompareRoute(['a:123'])
        )
      ).toBeFalse();
    });

    it('returns true when both routes have no experiments', () => {
      expect(
        utils.areSameRouteKindAndExperiments(
          buildRoute({routeKind: RouteKind.EXPERIMENTS}),
          buildRoute({routeKind: RouteKind.EXPERIMENTS})
        )
      ).toBeTrue();
    });

    it('returns false when one route has no experiments', () => {
      expect(
        utils.areSameRouteKindAndExperiments(
          buildRoute({routeKind: RouteKind.EXPERIMENTS}),
          buildExperimentRouteFromId('123')
        )
      ).toBeFalse();
      expect(
        utils.areSameRouteKindAndExperiments(
          buildExperimentRouteFromId('123'),
          buildRoute({routeKind: RouteKind.EXPERIMENTS})
        )
      ).toBeFalse();
    });

    it('returns true when same experiment', () => {
      expect(
        utils.areSameRouteKindAndExperiments(
          buildExperimentRouteFromId('111'),
          buildExperimentRouteFromId('111')
        )
      ).toBeTrue();
    });

    it('returns false when different experiments', () => {
      expect(
        utils.areSameRouteKindAndExperiments(
          buildExperimentRouteFromId('111'),
          buildExperimentRouteFromId('222')
        )
      ).toBeFalse();
    });

    it('returns true when same set of experiments', () => {
      // Experiment id is the value after the colon and the values before the
      // colons are ignored aliases.
      expect(
        utils.areSameRouteKindAndExperiments(
          buildCompareRoute(['a:111', 'b:222']),
          buildCompareRoute(['a:111', 'b:222'])
        )
      ).toBeTrue();
      expect(
        utils.areSameRouteKindAndExperiments(
          buildCompareRoute(['a:111', 'b:222']),
          buildCompareRoute(['a:111', 'c:222'])
        )
      ).toBeTrue();
      expect(
        utils.areSameRouteKindAndExperiments(
          buildCompareRoute(['a:111', 'b:222']),
          buildCompareRoute(['b:222', 'a:111'])
        )
      ).toBeTrue();
    });

    it('returns false when different sets of experiments', () => {
      // Experiment id is the value after the colon and the values before the
      // colons are ignored aliases.
      expect(
        utils.areSameRouteKindAndExperiments(
          buildCompareRoute(['111:a', '222:b']),
          buildCompareRoute(['111:c', '222:b'])
        )
      ).toBeFalse();
      expect(
        utils.areSameRouteKindAndExperiments(
          buildCompareRoute(['111:a', '222:b', '333:c']),
          buildCompareRoute(['111:a', '222:b'])
        )
      ).toBeFalse();
      expect(
        utils.areSameRouteKindAndExperiments(
          buildCompareRoute(['111:a', '222:b']),
          buildCompareRoute(['111:a', '222:b', '333:c'])
        )
      ).toBeFalse();
    });
  });

  describe('#createURLSearchParamsFromSerializableQueryParams', () => {
    it('creates URLSearchParams', () => {
      const param = utils.createURLSearchParamsFromSerializableQueryParams([
        {key: 'a', value: '1'},
        {key: 'b', value: '2'},
        {key: 'a', value: '3'},
        {key: 'c', value: ''},
      ]);

      expect(param.getAll('a')).toEqual(['1', '3']);
      expect(param.getAll('b')).toEqual(['2']);
      expect(param.getAll('c')).toEqual(['']);
    });
  });

  describe('#arePathsAndQueryParamsEqual', () => {
    it('returns true if they are equal', () => {
      expect(
        utils.arePathsAndQueryParamsEqual(
          {
            pathname: '/foo',
            queryParams: [],
          },
          {
            pathname: '/foo',
            queryParams: [],
          }
        )
      ).toBe(true);

      expect(
        utils.arePathsAndQueryParamsEqual(
          {
            pathname: '/foo/bar',
            queryParams: [{key: 'a', value: '1'}],
          },
          {
            pathname: '/foo/bar',
            queryParams: [{key: 'a', value: '1'}],
          }
        )
      ).toBe(true);
    });

    it('returns false if paths are different', () => {
      expect(
        utils.arePathsAndQueryParamsEqual(
          {
            pathname: '/foo/bar',
            queryParams: [],
          },
          {
            pathname: '/foo/baz',
            queryParams: [],
          }
        )
      ).toBe(false);
    });

    it('returns false if query params values are different', () => {
      expect(
        utils.arePathsAndQueryParamsEqual(
          {
            pathname: '/foo/bar',
            queryParams: [{key: 'a', value: '1'}],
          },
          {
            pathname: '/foo/bar',
            queryParams: [{key: 'a', value: '2'}],
          }
        )
      ).toBe(false);
    });

    it('returns false if query params has more values', () => {
      expect(
        utils.arePathsAndQueryParamsEqual(
          {
            pathname: '/foo/bar',
            queryParams: [{key: 'a', value: '1'}],
          },
          {
            pathname: '/foo/bar',
            queryParams: [
              {key: 'a', value: '1'},
              {key: 'a', value: '2'},
            ],
          }
        )
      ).toBe(false);
    });

    it('returns false when orders are different', () => {
      expect(
        utils.arePathsAndQueryParamsEqual(
          {
            pathname: '/foo/bar',
            queryParams: [
              {key: 'b', value: '2'},
              {key: 'a', value: '1'},
            ],
          },
          {
            pathname: '/foo/bar',
            queryParams: [
              {key: 'a', value: '1'},
              {key: 'b', value: '2'},
            ],
          }
        )
      ).toBe(false);
    });
  });

  describe('#getDeepLinkGroup', () => {
    it('maps RouteKind to DeepLinkGroup', () => {
      expect(utils.getDeepLinkGroup(RouteKind.EXPERIMENTS)).toEqual(
        DeepLinkGroup.EXPERIMENTS
      );
      expect(utils.getDeepLinkGroup(RouteKind.EXPERIMENT)).toEqual(
        DeepLinkGroup.DASHBOARD
      );
      expect(utils.getDeepLinkGroup(RouteKind.COMPARE_EXPERIMENT)).toEqual(
        DeepLinkGroup.DASHBOARD
      );
      expect(utils.getDeepLinkGroup(RouteKind.UNKNOWN)).toBeNull();
      expect(utils.getDeepLinkGroup(RouteKind.NOT_SET)).toBeNull();
    });
  });

  describe('#canRehydrateDeepLink', () => {
    it('allows rehydration if namespaceId does not match', () => {
      expect(
        utils.canRehydrateDeepLink(RouteKind.EXPERIMENTS, 'namespaceC', [
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceA',
          },
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceB',
          },
        ])
      ).toBeTrue();
    });

    it('allows rehydration if deepLinkGroup does not match', () => {
      expect(
        utils.canRehydrateDeepLink(RouteKind.COMPARE_EXPERIMENT, 'namespaceA', [
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceA',
          },
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceB',
          },
        ])
      ).toBeTrue();
    });

    it('does not allow rehydration if match is found', () => {
      expect(
        utils.canRehydrateDeepLink(RouteKind.EXPERIMENTS, 'namespaceA', [
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceA',
          },
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceB',
          },
        ])
      ).toBeFalse();
    });

    it('does not allow rehydration if route kind has null deep link group', () => {
      expect(
        utils.canRehydrateDeepLink(RouteKind.UNKNOWN, 'namespaceA', [
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceA',
          },
          {
            deepLinkGroup: DeepLinkGroup.EXPERIMENTS,
            namespaceId: 'namespaceB',
          },
        ])
      ).toBeFalse();
    });
  });

  describe('#generateRandomIdForNamespace', () => {
    let cryptoGetRandomValuesSpy: jasmine.Spy;

    it('returns 32-long id', () => {
      const result = utils.generateRandomIdForNamespace();

      expect(result.length).toEqual(32);
    });

    it('returns id width base 16', () => {
      cryptoGetRandomValuesSpy = spyOn(window.crypto, 'getRandomValues');
      cryptoGetRandomValuesSpy.and.callFake(
        getMockReturnValuesFuntion(new Uint8Array([1]))
      );
      let result = utils.generateRandomIdForNamespace();
      expect(result).toEqual('00000000000000000000000000000000');

      cryptoGetRandomValuesSpy.and.callFake(
        getMockReturnValuesFuntion(new Uint8Array([15]))
      );
      result = utils.generateRandomIdForNamespace();
      expect(result).toEqual('00000000000000000000000000000000');

      cryptoGetRandomValuesSpy.and.callFake(
        getMockReturnValuesFuntion(new Uint8Array([17]))
      );
      result = utils.generateRandomIdForNamespace();
      expect(result).toEqual('10000000000000000000000000000000');

      cryptoGetRandomValuesSpy.and.callFake(
        getMockReturnValuesFuntion(new Uint8Array([32]))
      );
      result = utils.generateRandomIdForNamespace();
      expect(result).toEqual('20000000000000000000000000000000');

      cryptoGetRandomValuesSpy.and.callFake(
        getMockReturnValuesFuntion(new Uint8Array([160]))
      );
      result = utils.generateRandomIdForNamespace();
      expect(result).toEqual('a0000000000000000000000000000000');

      cryptoGetRandomValuesSpy.and.callFake(
        getMockReturnValuesFuntion(new Uint8Array([0, 16, 32, 160, 320]))
      );
      result = utils.generateRandomIdForNamespace();
      expect(result).toEqual('012a4000000000000000000000000000');
    });
  });
});
