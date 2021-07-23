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

import {getCompareExperimentIdAliasSpec} from './store_only_utils';

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
});
