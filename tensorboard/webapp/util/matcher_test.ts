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

import {matchRunToRegex, RunMatchable} from './matcher';

function buildRunWithName(override: Partial<RunMatchable> = {}): RunMatchable {
  return {
    runName: 'run name',
    experimentAlias: {aliasText: 'alias', aliasNumber: 1},
    ...override,
  };
}

describe('matcher test', () => {
  describe('#matchRunToRegex', () => {
    it('matches against name of a run against regex', () => {
      const actual = matchRunToRegex(
        buildRunWithName({runName: 'faaaaro'}),
        '^f[a]+r',
        false
      );
      expect(actual).toBe(true);
    });

    it('matches name with any casing', () => {
      const actual = matchRunToRegex(
        buildRunWithName({runName: 'faaaar'}),
        'faAA+r',
        false
      );
      expect(actual).toBe(true);
    });

    describe('shouldMatchExperiment flag', () => {
      it('matches against experimentAlias when flag is on', () => {
        expect(
          matchRunToRegex(
            buildRunWithName({
              runName: 'faaaaro',
              experimentAlias: {aliasText: 'aliasName', aliasNumber: 1},
            }),
            '^aliasName$',
            true
          )
        ).toBe(true);
        expect(
          matchRunToRegex(
            buildRunWithName({
              runName: 'faaaaro',
              experimentAlias: {aliasText: 'aliasName', aliasNumber: 1},
            }),
            '^aliasName$',
            false
          )
        ).toBe(false);
      });

      it('matches against composite name for backwards compat', () => {
        expect(
          matchRunToRegex(
            buildRunWithName({
              runName: 'world',
              experimentAlias: {aliasText: 'hello', aliasNumber: 1},
            }),
            '^hello/world$',
            true
          )
        ).toBe(true);
        expect(
          matchRunToRegex(
            buildRunWithName({
              runName: 'world',
              experimentAlias: {aliasText: 'hello', aliasNumber: 1},
            }),
            'hello',
            true
          )
        ).toBe(true);
      });
    });

    it('returns true when regex string is empty', () => {
      expect(matchRunToRegex(buildRunWithName(), '', false)).toBe(true);
    });

    it('returns false when a regex string is invalid regex', () => {
      expect(
        matchRunToRegex(buildRunWithName({runName: '*'}), '*', false)
      ).toBe(false);
    });
  });
});
