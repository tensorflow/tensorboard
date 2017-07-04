/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

import {categorize} from '../categorizationUtils';

const assert = chai.assert;

describe('categorizationUtils', () => {

  describe('categorize', () => {

    it('returns empty array on empty tags', () => {
      assert.lengthOf(categorize([], []), 0);
    });

    it('handles the singleton case', () => {
      assert.deepEqual(categorize(['a'], []), [{name: 'a', items: ['a']}]);
    });

    it('handles a simple case', () => {
      const input = [
        'foo1/bar', 'foo1/zod', 'foo2/bar', 'foo2/zod', 'gosh/lod/mar',
        'gosh/lod/ned',
      ];
      const expected = [
        {name: 'foo1', items: ['foo1/bar', 'foo1/zod']},
        {name: 'foo2', items: ['foo2/bar', 'foo2/zod']},
        {name: 'gosh', items: ['gosh/lod/mar', 'gosh/lod/ned']},
      ];
      assert.deepEqual(categorize(input, []), expected);
    });

    it('presents categories in first-occurrence order', () => {
      const input = ['e', 'f/1', 'g', 'a', 'f/2', 'b', 'c'];
      const expected = [
        {name: 'e', items: ['e']},
        {name: 'f', items: ['f/1', 'f/2']},
        {name: 'g', items: ['g']},
        {name: 'a', items: ['a']},
        {name: 'b', items: ['b']},
        {name: 'c', items: ['c']},
      ];
      assert.deepEqual(categorize(input, []), expected);
    });

    it('handles cases where category names overlap item names', () => {
      const input = ['a', 'a/a', 'a/b', 'a/c', 'b', 'b/a'];
      const actual = categorize(input, []);
      const expected = [
        {name: 'a', items: ['a', 'a/a', 'a/b', 'a/c']},
        {name: 'b', items: ['b', 'b/a']},
      ];
      assert.deepEqual(actual, expected);
    });

    it('categorizes by regular expression', () => {
      const regexes = ['foo..', 'bar..'];
      const items = ['foods', 'fools', 'barts', 'barms'];
      const actual = categorize(items, regexes);
      const expected = [
        {name: 'foo..', items: ['foods', 'fools']},
        {name: 'bar..', items: ['barts', 'barms']},
        {name: 'foods', items: ['foods']},
        {name: 'fools', items: ['fools']},
        {name: 'barts', items: ['barts']},
        {name: 'barms', items: ['barms']},
      ];
      assert.deepEqual(actual, expected);
    });

    it('matches non-exclusively', () => {
      const regexes = ['...', 'bar'];
      const items = ['abc', 'bar', 'zod'];
      const actual = categorize(items, regexes);
      const expected = [
        {name: '...', items: ['abc', 'bar', 'zod']},
        {name: 'bar', items: ['bar']},
        {name: 'abc', items: ['abc']},
        {name: 'bar', items: ['bar']},
        {name: 'zod', items: ['zod']},
      ];
      assert.deepEqual(actual, expected);
    });

    it('creates categories for unmatched rules', () => {
      const regexes = ['a', 'b', 'c'];
      const items = [];
      const actual = categorize(items, regexes);
      const expected = [
        {name: 'a', items: []},
        {name: 'b', items: []},
        {name: 'c', items: []},
      ];
      assert.deepEqual(actual, expected);
    });

    it('works with special characters in regexes', () => {
      const regexes = ['^\\w+$', '^\\d+$', '^\\/..$'];
      const items = ['foo', '3243', '/xa'];
      const actual = categorize(items, regexes);
      const expected = [
        {name: '^\\w+$', items: ['foo', '3243']},
        {name: '^\\d+$', items: ['3243']},
        {name: '^\\/..$', items: ['/xa']},
        {name: 'foo', items: ['foo']},
        {name: '3243', items: ['3243']},
        {name: '', items: ['/xa']},
      ];
      assert.deepEqual(actual, expected);
    });

  });

});
