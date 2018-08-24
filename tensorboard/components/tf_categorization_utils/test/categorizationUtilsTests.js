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
    var assert = chai.assert, expect = chai.expect;
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
        describe('categorizeSelection', function () {
            var categorizeSelection = tf_categorization_utils.categorizeSelection;
            beforeEach(function () {
                var tag1 = {
                    id: 1, pluginName: 'scalar',
                    name: 'tag1', displayName: 'tag1',
                };
                var tag2_1 = {
                    id: 2, pluginName: 'scalar',
                    name: 'tag2/subtag1', displayName: 'tag2/subtag1',
                };
                var tag2_2 = {
                    id: 3, pluginName: 'scalar',
                    name: 'tag2/subtag2', displayName: 'tag2/subtag2',
                };
                var tag3 = {
                    id: 4, pluginName: 'scalar',
                    name: 'tag3', displayName: 'tag3',
                };
                var tag4 = {
                    id: 5, pluginName: 'custom_scalar',
                    name: 'tag4', displayName: 'tag4',
                };
                this.run1 = { id: 1, name: 'run1', startTime: 10, tags: [tag1, tag4] };
                this.run2 = { id: 2, name: 'run2', startTime: 5, tags: [tag2_1, tag2_2] };
                this.run3 = { id: 3, name: 'run3', startTime: 0, tags: [tag2_1, tag3] };
                this.selection1 = {
                    experiment: { id: 1, name: 'exp1', startTime: 0 },
                    runs: [this.run1, this.run2],
                    tagRegex: '',
                };
                this.selection2 = {
                    experiment: { id: 2, name: 'exp2', startTime: 0 },
                    runs: [this.run2, this.run3],
                    tagRegex: '(subtag1|tag3)',
                };
                this.selection3 = {
                    experiment: { id: 3, name: 'exp3', startTime: 0 },
                    runs: [this.run1, this.run2, this.run3],
                    tagRegex: 'junk',
                };
            });
            it('merges the results of the query and the prefix groups', function () {
                var result = categorizeSelection([this.selection1], 'scalar');
                expect(result).to.have.lengthOf(3);
                expect(result[0]).to.have.property('metadata')
                    .that.has.property('type', CategoryType.SEARCH_RESULTS);
                expect(result[1]).to.have.property('metadata')
                    .that.has.property('type', CategoryType.PREFIX_GROUP);
                expect(result[2]).to.have.property('metadata')
                    .that.has.property('type', CategoryType.PREFIX_GROUP);
            });
            describe('search group', function () {
                it('filters groups by tag with a tagRegex', function () {
                    var searchResult = categorizeSelection([this.selection2], 'scalar')[0];
                    // should match 'tag2/subtag1' and 'tag3'.
                    expect(searchResult).to.have.property('items')
                        .that.has.lengthOf(2);
                    expect(searchResult.items[0]).to.have.property('tag', 'tag2/subtag1');
                    expect(searchResult.items[0]).to.have.property('series')
                        .that.deep.equal([
                        {
                            experiment: this.selection2.experiment,
                            run: 'run2',
                            tag: 'tag2/subtag1',
                        },
                        {
                            experiment: this.selection2.experiment,
                            run: 'run3',
                            tag: 'tag2/subtag1',
                        },
                    ]);
                    expect(searchResult.items[1]).to.have.property('tag', 'tag3');
                    expect(searchResult.items[1]).to.have.property('series')
                        .that.deep.equal([
                        {
                            experiment: this.selection2.experiment,
                            run: 'run3',
                            tag: 'tag3'
                        },
                    ]);
                });
                it('combines selection without tagRegex with one', function () {
                    var sel1 = this.selection1;
                    var sel2 = this.selection2;
                    var searchResult = categorizeSelection([sel1, sel2], 'scalar')[0];
                    // should match 'tag1', 'tag2/subtag1', 'tag2/subtag2', and 'tag3'.
                    expect(searchResult).to.have.property('items')
                        .that.has.lengthOf(4);
                    expect(searchResult.items[0]).to.have.property('tag', 'tag1');
                    expect(searchResult.items[1]).to.have.property('tag', 'tag2/subtag1');
                    expect(searchResult.items[2]).to.have.property('tag', 'tag2/subtag2');
                    expect(searchResult.items[3]).to.have.property('tag', 'tag3');
                    expect(searchResult.items[1]).to.have.property('series')
                        .that.has.lengthOf(3)
                        .and.that.deep.equal([
                        { experiment: sel1.experiment, run: 'run2', tag: 'tag2/subtag1' },
                        { experiment: sel2.experiment, run: 'run2', tag: 'tag2/subtag1' },
                        { experiment: sel2.experiment, run: 'run3', tag: 'tag2/subtag1' },
                    ]);
                });
                it('keeps name as empty if all selections have no regex', function () {
                    var sel1 = this.selection1;
                    var sel2 = Object.assign({}, this.selection2, { tagRegex: '' });
                    var searchResult = categorizeSelection([sel1, sel2], 'scalar')[0];
                    expect(searchResult).to.have.property('items')
                        .that.has.lengthOf(4);
                    expect(searchResult).to.have.property('name', '');
                });
                it('reports bad regex when at least one selection is bad', function () {
                    var sel1 = this.selection1;
                    var sel2 = Object.assign({}, this.selection2, { tagRegex: '))' });
                    var searchResult = categorizeSelection([sel1, sel2], 'scalar')[0];
                    expect(searchResult).to.have.property('metadata')
                        .that.has.property('validRegex', false);
                });
                it('sorts the tag by name', function () {
                    var searchResult = categorizeSelection([this.selection2, this.selection1], 'scalar')[0];
                    // should match 'tag1', 'tag2/subtag1', 'tag2/subtag2', and 'tag3'.
                    expect(searchResult).to.have.property('items')
                        .that.has.lengthOf(4);
                    expect(searchResult.items[0]).to.have.property('tag', 'tag1');
                    expect(searchResult.items[1]).to.have.property('tag', 'tag2/subtag1');
                    expect(searchResult.items[2]).to.have.property('tag', 'tag2/subtag2');
                    expect(searchResult.items[3]).to.have.property('tag', 'tag3');
                });
                it('returns name `multi` when there are multiple selections', function () {
                    var searchResult2 = categorizeSelection([this.selection2], 'scalar')[0];
                    expect(searchResult2).to.have.property('name', '(subtag1|tag3)');
                    var searchResult1 = categorizeSelection([this.selection1, this.selection2], 'scalar')[0];
                    expect(searchResult1).to.have.property('name', 'multi');
                });
                it('returns an empty array when tagRegex does not match any', function () {
                    var result = categorizeSelection([this.selection3], 'custom_scalar');
                    expect(result).to.have.lengthOf(2);
                    expect(result[0]).to.have.property('items')
                        .that.has.lengthOf(0);
                });
                it('omits selection from tag series when its regex does not match', function () {
                    var searchResult = categorizeSelection([this.selection1, this.selection3], 'scalar')[0];
                    // should match 'tag1', 'tag2/subtag1', 'tag2/subtag2', and 'tag3'.
                    expect(searchResult).to.have.property('items')
                        .that.has.lengthOf(3);
                    expect(searchResult.items[0]).to.have.property('tag', 'tag1');
                    expect(searchResult.items[1]).to.have.property('tag', 'tag2/subtag1');
                    expect(searchResult.items[2]).to.have.property('tag', 'tag2/subtag2');
                    // experiment3 also matches the tag1 but it has tagRegex of `junk`.
                    expect(searchResult.items[0]).to.have.property('series')
                        .that.deep.equal([
                        {
                            experiment: this.selection1.experiment,
                            run: 'run1',
                            tag: 'tag1',
                        },
                    ]);
                });
            });
            describe('prefix group', function () {
                it('creates a group when a tag misses separator', function () {
                    var result = categorizeSelection([this.selection1], 'scalar');
                    expect(result[1]).to.have.property('items')
                        .that.has.lengthOf(1);
                    expect(result[1]).to.have.property('name', 'tag1');
                    expect(result[1].items[0]).to.have.property('tag', 'tag1');
                    expect(result[1].items[0]).to.have.property('series')
                        .that.has.lengthOf(1);
                });
                it('creates a grouping when tag has a separator', function () {
                    var result = categorizeSelection([this.selection1], 'scalar');
                    expect(result[2]).to.have.property('items')
                        .that.has.lengthOf(2);
                    expect(result[2]).to.have.property('name', 'tag2');
                    expect(result[2].items[0]).to.have.property('tag', 'tag2/subtag1');
                    expect(result[2].items[1]).to.have.property('tag', 'tag2/subtag2');
                    expect(result[2].items[0]).to.have.property('series')
                        .that.has.lengthOf(1);
                });
                it('creates a group with items with experiment and run', function () {
                    var sel = this.selection1;
                    var result = categorizeSelection([sel], 'scalar');
                    expect(result[1].items[0]).to.have.property('series')
                        .that.has.lengthOf(1)
                        .and.that.deep.equal([
                        { experiment: sel.experiment, run: 'run1', tag: 'tag1' },
                    ]);
                });
                it('creates distinct subitems when tags exactly match', function () {
                    var sel = this.selection2;
                    var result = categorizeSelection([sel], 'scalar');
                    expect(result[1].items[0]).to.have.property('series')
                        .that.has.lengthOf(2)
                        .and.that.deep.equal([
                        { experiment: sel.experiment, run: 'run2', tag: 'tag2/subtag1' },
                        { experiment: sel.experiment, run: 'run3', tag: 'tag2/subtag1' },
                    ]);
                });
                it('filters out tags of a different plugin', function () {
                    var sel = this.selection3;
                    var result = categorizeSelection([sel], 'custom_scalar');
                    expect(result).to.have.lengthOf(2);
                    expect(result[1]).to.have.property('name', 'tag4');
                    expect(result[1]).to.have.property('items')
                        .that.has.lengthOf(1);
                    expect(result[1].items[0]).to.have.property('series')
                        .that.has.lengthOf(1)
                        .and.that.deep.equal([
                        { experiment: sel.experiment, run: 'run1', tag: 'tag4' },
                    ]);
                });
            });
        });
    });
})(tf_categorization_utils || (tf_categorization_utils = {})); // namespace tf_categorization_utils
