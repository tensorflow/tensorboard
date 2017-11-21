var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
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
var tf_categorization_utils;
(function (tf_categorization_utils) {
    var assert = chai.assert;
    describe('categorizationUtils', function () {
        var CategoryType = tf_categorization_utils.CategoryType;
        describe('categorizeByPrefix', function () {
            var categorizeByPrefix = tf_categorization_utils.categorizeByPrefix;
            var metadata = { type: CategoryType.PREFIX_GROUP };
            it('returns empty array on empty tags', function () {
                assert.lengthOf(categorizeByPrefix([]), 0);
            });
            it('handles the singleton case', function () {
                var input = ['a'];
                var actual = categorizeByPrefix(input);
                var expected = [{
                        name: 'a',
                        metadata: metadata,
                        items: ['a'],
                    }];
                assert.deepEqual(categorizeByPrefix(input), expected);
            });
            it('handles a simple case', function () {
                var input = [
                    'foo1/bar', 'foo1/zod', 'foo2/bar', 'foo2/zod', 'gosh/lod/mar',
                    'gosh/lod/ned',
                ];
                var actual = categorizeByPrefix(input);
                var expected = [
                    { name: 'foo1', metadata: metadata, items: ['foo1/bar', 'foo1/zod'] },
                    { name: 'foo2', metadata: metadata, items: ['foo2/bar', 'foo2/zod'] },
                    { name: 'gosh', metadata: metadata, items: ['gosh/lod/mar', 'gosh/lod/ned'] },
                ];
                assert.deepEqual(actual, expected);
            });
            it('presents categories in first-occurrence order', function () {
                var input = ['e', 'f/1', 'g', 'a', 'f/2', 'b', 'c'];
                var actual = categorizeByPrefix(input);
                var expected = [
                    { name: 'e', metadata: metadata, items: ['e'] },
                    { name: 'f', metadata: metadata, items: ['f/1', 'f/2'] },
                    { name: 'g', metadata: metadata, items: ['g'] },
                    { name: 'a', metadata: metadata, items: ['a'] },
                    { name: 'b', metadata: metadata, items: ['b'] },
                    { name: 'c', metadata: metadata, items: ['c'] },
                ];
                assert.deepEqual(actual, expected);
            });
            it('handles cases where category names overlap item names', function () {
                var input = ['a', 'a/a', 'a/b', 'a/c', 'b', 'b/a'];
                var actual = categorizeByPrefix(input);
                var expected = [
                    { name: 'a', metadata: metadata, items: ['a', 'a/a', 'a/b', 'a/c'] },
                    { name: 'b', metadata: metadata, items: ['b', 'b/a'] },
                ];
                assert.deepEqual(actual, expected);
            });
        });
        describe('categorizeBySearchQuery', function () {
            var categorizeBySearchQuery = tf_categorization_utils.categorizeBySearchQuery;
            var baseMetadata = {
                type: CategoryType.SEARCH_RESULTS,
                validRegex: true,
                universalRegex: false,
            };
            it('properly selects just the items matching the query', function () {
                var query = 'cd';
                var items = ['def', 'cde', 'bcd', 'abc'];
                var actual = categorizeBySearchQuery(items, query);
                var expected = {
                    name: query,
                    metadata: baseMetadata,
                    items: ['cde', 'bcd'],
                };
                assert.deepEqual(actual, expected);
            });
            it('treats the query as a regular expression', function () {
                var query = 'ba(?:na){2,}s';
                var items = ['apples', 'bananas', 'pears', 'more bananananas more fun'];
                var actual = categorizeBySearchQuery(items, query);
                var expected = {
                    name: query,
                    metadata: baseMetadata,
                    items: ['bananas', 'more bananananas more fun'],
                };
                assert.deepEqual(actual, expected);
            });
            it('yields an empty category when there are no items', function () {
                var query = 'ba(?:na){2,}s';
                var items = [];
                var actual = categorizeBySearchQuery(items, query);
                var expected = { name: query, metadata: baseMetadata, items: [] };
                assert.deepEqual(actual, expected);
            });
            it('yields a universal category when the query is empty', function () {
                var query = '';
                var items = ['apples', 'bananas', 'pears', 'bananananas'];
                var actual = categorizeBySearchQuery(items, query);
                var expected = { name: query, metadata: baseMetadata, items: items };
                assert.deepEqual(actual, expected);
            });
            it('notes when the query is invalid', function () {
                var query = ')))';
                var items = ['abc', 'bar', 'zod'];
                var actual = categorizeBySearchQuery(items, query);
                var expected = {
                    name: query,
                    metadata: __assign({}, baseMetadata, { validRegex: false }),
                    items: [],
                };
                assert.deepEqual(actual, expected);
            });
            it('notes when the query is ".*"', function () {
                var query = '.*';
                var items = ['abc', 'bar', 'zod'];
                var actual = categorizeBySearchQuery(items, query);
                var expected = {
                    name: query,
                    metadata: __assign({}, baseMetadata, { universalRegex: true }),
                    items: items,
                };
                assert.deepEqual(actual, expected);
            });
        });
        describe('categorize', function () {
            var categorize = tf_categorization_utils.categorize;
            it('merges the results of the query and the prefix groups', function () {
                var query = 'ba(?:na){2,}s';
                var items = [
                    'vegetable/asparagus',
                    'vegetable/broccoli',
                    'fruit/apples',
                    'fruit/bananas',
                    'fruit/bananananas',
                    'fruit/pears',
                    'singleton',
                ];
                var actual = categorize(items, query);
                var expected = [{
                        name: query,
                        metadata: {
                            type: CategoryType.SEARCH_RESULTS,
                            validRegex: true,
                            universalRegex: false,
                        },
                        items: ['fruit/bananas', 'fruit/bananananas'],
                    }, {
                        name: 'vegetable',
                        metadata: { type: CategoryType.PREFIX_GROUP },
                        items: ['vegetable/asparagus', 'vegetable/broccoli'],
                    }, {
                        name: 'fruit',
                        metadata: { type: CategoryType.PREFIX_GROUP },
                        items: [
                            'fruit/apples',
                            'fruit/bananas',
                            'fruit/bananananas',
                            'fruit/pears',
                        ],
                    }, {
                        name: 'singleton',
                        metadata: { type: CategoryType.PREFIX_GROUP },
                        items: ['singleton'],
                    }];
                assert.deepEqual(actual, expected);
            });
        });
    });
})(tf_categorization_utils || (tf_categorization_utils = {})); // namespace tf_categorization_utils
