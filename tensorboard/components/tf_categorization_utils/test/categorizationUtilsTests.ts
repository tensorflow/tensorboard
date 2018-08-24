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
namespace tf_categorization_utils {

const {assert, expect} = chai;

describe('categorizationUtils', () => {
  const {CategoryType} = tf_categorization_utils;

  describe('categorizeByPrefix', () => {
    const {categorizeByPrefix} = tf_categorization_utils;
    const metadata = {type: CategoryType.PREFIX_GROUP};

    it('returns empty array on empty tags', () => {
      assert.lengthOf(categorizeByPrefix([]), 0);
    });

    it('handles the singleton case', () => {
      const input = ['a'];
      const actual = categorizeByPrefix(input);
      const expected = [{
        name: 'a',
        metadata,
        items: ['a'],
      }];
      assert.deepEqual(categorizeByPrefix(input), expected);
    });

    it('handles a simple case', () => {
      const input = [
        'foo1/bar', 'foo1/zod', 'foo2/bar', 'foo2/zod', 'gosh/lod/mar',
        'gosh/lod/ned',
      ];
      const actual = categorizeByPrefix(input);
      const expected = [
        {name: 'foo1', metadata, items: ['foo1/bar', 'foo1/zod']},
        {name: 'foo2', metadata, items: ['foo2/bar', 'foo2/zod']},
        {name: 'gosh', metadata, items: ['gosh/lod/mar', 'gosh/lod/ned']},
      ];
      assert.deepEqual(actual, expected);
    });

    it('presents categories in first-occurrence order', () => {
      const input = ['e', 'f/1', 'g', 'a', 'f/2', 'b', 'c'];
      const actual = categorizeByPrefix(input);
      const expected = [
        {name: 'e', metadata, items: ['e']},
        {name: 'f', metadata, items: ['f/1', 'f/2']},
        {name: 'g', metadata, items: ['g']},
        {name: 'a', metadata, items: ['a']},
        {name: 'b', metadata, items: ['b']},
        {name: 'c', metadata, items: ['c']},
      ];
      assert.deepEqual(actual, expected);
    });

    it('handles cases where category names overlap item names', () => {
      const input = ['a', 'a/a', 'a/b', 'a/c', 'b', 'b/a'];
      const actual = categorizeByPrefix(input);
      const expected = [
        {name: 'a', metadata, items: ['a', 'a/a', 'a/b', 'a/c']},
        {name: 'b', metadata, items: ['b', 'b/a']},
      ];
      assert.deepEqual(actual, expected);
    });
  });

  describe('categorizeBySearchQuery', () => {
    const {categorizeBySearchQuery} = tf_categorization_utils;
    const baseMetadata = {
      type: CategoryType.SEARCH_RESULTS,
      validRegex: true,
      universalRegex: false,
    };

    it('properly selects just the items matching the query', () => {
      const query = 'cd';
      const items = ['def', 'cde', 'bcd', 'abc'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: baseMetadata,
        items: ['cde', 'bcd'],
      };
      assert.deepEqual(actual, expected);
    });

    it('treats the query as a regular expression', () => {
      const query = 'ba(?:na){2,}s';
      const items = ['apples', 'bananas', 'pears', 'more bananananas more fun'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: baseMetadata,
        items: ['bananas', 'more bananananas more fun'],
      };
      assert.deepEqual(actual, expected);
    });

    it('yields an empty category when there are no items', () => {
      const query = 'ba(?:na){2,}s';
      const items = [];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {name: query, metadata: baseMetadata, items: []};
      assert.deepEqual(actual, expected);
    });

    it('yields a universal category when the query is empty', () => {
      const query = '';
      const items = ['apples', 'bananas', 'pears', 'bananananas'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {name: query, metadata: baseMetadata, items};
      assert.deepEqual(actual, expected);
    });

    it('notes when the query is invalid', () => {
      const query = ')))';
      const items = ['abc', 'bar', 'zod'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: {...baseMetadata, validRegex: false},
        items: [],
      };
      assert.deepEqual(actual, expected);
    });

    it('notes when the query is ".*"', () => {
      const query = '.*';
      const items = ['abc', 'bar', 'zod'];
      const actual = categorizeBySearchQuery(items, query);
      const expected = {
        name: query,
        metadata: {...baseMetadata, universalRegex: true},
        items,
      };
      assert.deepEqual(actual, expected);
    });
  });

  describe('categorize', () => {
    const {categorize} = tf_categorization_utils;

    it('merges the results of the query and the prefix groups', () => {
      const query = 'ba(?:na){2,}s';
      const items = [
        'vegetable/asparagus',
        'vegetable/broccoli',
        'fruit/apples',
        'fruit/bananas',
        'fruit/bananananas',
        'fruit/pears',
        'singleton',
      ];
      const actual = categorize(items, query);
      const expected = [{
        name: query,
        metadata: {
          type: CategoryType.SEARCH_RESULTS,
          validRegex: true,
          universalRegex: false,
        },
        items: ['fruit/bananas', 'fruit/bananananas'],
      }, {
        name: 'vegetable',
        metadata: {type: CategoryType.PREFIX_GROUP},
        items: ['vegetable/asparagus', 'vegetable/broccoli'],
      }, {
        name: 'fruit',
        metadata: {type: CategoryType.PREFIX_GROUP},
        items: [
          'fruit/apples',
          'fruit/bananas',
          'fruit/bananananas',
          'fruit/pears',
        ],
      }, {
        name: 'singleton',
        metadata: {type: CategoryType.PREFIX_GROUP},
        items: ['singleton'],
      }];
      assert.deepEqual(actual, expected);
    });
  });

  describe('categorizeSelection', () => {
    const {categorizeSelection} = tf_categorization_utils;

    beforeEach(function() {
      const tag1 = {
        id: 1, pluginName: 'scalar',
        name: 'tag1', displayName: 'tag1',
      };
      const tag2_1 = {
        id: 2, pluginName: 'scalar',
        name: 'tag2/subtag1', displayName: 'tag2/subtag1',
      };
      const tag2_2 = {
        id: 3, pluginName: 'scalar',
        name: 'tag2/subtag2', displayName: 'tag2/subtag2',
      };
      const tag3 = {
        id: 4, pluginName: 'scalar',
        name: 'tag3', displayName: 'tag3',
      };
      const tag4 = {
        id: 5, pluginName: 'custom_scalar',
        name: 'tag4', displayName: 'tag4',
      };

      this.run1 = {id: 1, name: 'run1', startTime: 10, tags: [tag1, tag4]};
      this.run2 = {id: 2, name: 'run2', startTime: 5, tags: [tag2_1, tag2_2]};
      this.run3 = {id: 3, name: 'run3', startTime: 0, tags: [tag2_1, tag3]};

      this.selection1 = {
        experiment: {id: 1, name: 'exp1', startTime: 0},
        runs: [this.run1, this.run2],
        tagRegex: '',
      };
      this.selection2 = {
        experiment: {id: 2, name: 'exp2', startTime: 0},
        runs: [this.run2, this.run3],
        tagRegex: '(subtag1|tag3)',
      };
      this.selection3 = {
        experiment: {id: 3, name: 'exp3', startTime: 0},
        runs: [this.run1, this.run2, this.run3],
        tagRegex: 'junk',
      };
    });

    it('merges the results of the query and the prefix groups', function() {
      const result = categorizeSelection(
          [this.selection1], 'scalar');

      expect(result).to.have.lengthOf(3);
      expect(result[0]).to.have.property('metadata')
          .that.has.property('type', CategoryType.SEARCH_RESULTS);

      expect(result[1]).to.have.property('metadata')
          .that.has.property('type', CategoryType.PREFIX_GROUP);
      expect(result[2]).to.have.property('metadata')
          .that.has.property('type', CategoryType.PREFIX_GROUP);
    });

    describe('search group', () => {
      it('filters groups by tag with a tagRegex', function() {
        const [searchResult] = categorizeSelection(
            [this.selection2], 'scalar');

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

      it('combines selection without tagRegex with one', function() {
        const sel1 = this.selection1;
        const sel2 = this.selection2;
        const [searchResult] = categorizeSelection([sel1, sel2], 'scalar');

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
              {experiment: sel1.experiment, run: 'run2', tag: 'tag2/subtag1'},
              {experiment: sel2.experiment, run: 'run2', tag: 'tag2/subtag1'},
              {experiment: sel2.experiment, run: 'run3', tag: 'tag2/subtag1'},
            ]);
      });

      it('keeps name as empty if all selections have no regex', function() {
        const sel1 = this.selection1;
        const sel2 = Object.assign({}, this.selection2, {tagRegex: ''});
        const [searchResult] = categorizeSelection([sel1, sel2], 'scalar');

        expect(searchResult).to.have.property('items')
            .that.has.lengthOf(4);
        expect(searchResult).to.have.property('name', '');
      });

      it('reports bad regex when at least one selection is bad', function() {
        const sel1 = this.selection1;
        const sel2 = Object.assign({}, this.selection2, {tagRegex: '))'});
        const [searchResult] = categorizeSelection([sel1, sel2], 'scalar');

        expect(searchResult).to.have.property('metadata')
            .that.has.property('validRegex', false);
      });

      it('sorts the tag by name', function() {
        const [searchResult] = categorizeSelection(
            [this.selection2, this.selection1], 'scalar');

        // should match 'tag1', 'tag2/subtag1', 'tag2/subtag2', and 'tag3'.
        expect(searchResult).to.have.property('items')
            .that.has.lengthOf(4);
        expect(searchResult.items[0]).to.have.property('tag', 'tag1');
        expect(searchResult.items[1]).to.have.property('tag', 'tag2/subtag1');
        expect(searchResult.items[2]).to.have.property('tag', 'tag2/subtag2');
        expect(searchResult.items[3]).to.have.property('tag', 'tag3');
      });

      it('returns name `multi` when there are multiple selections', function() {
        const [searchResult2] = categorizeSelection(
            [this.selection2], 'scalar');
        expect(searchResult2).to.have.property('name', '(subtag1|tag3)');

        const [searchResult1] = categorizeSelection(
            [this.selection1, this.selection2], 'scalar');
        expect(searchResult1).to.have.property('name', 'multi');
      });

      it('returns an empty array when tagRegex does not match any', function() {
        const result = categorizeSelection([this.selection3], 'custom_scalar');

        expect(result).to.have.lengthOf(2);
        expect(result[0]).to.have.property('items')
            .that.has.lengthOf(0);
      });

      it('omits selection from tag series when its regex does not match',
          function() {
        const [searchResult] = categorizeSelection(
            [this.selection1, this.selection3], 'scalar');

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

    describe('prefix group', () => {
      it('creates a group when a tag misses separator', function() {
        const result = categorizeSelection([this.selection1], 'scalar');

        expect(result[1]).to.have.property('items')
            .that.has.lengthOf(1);

        expect(result[1]).to.have.property('name', 'tag1');
        expect(result[1].items[0]).to.have.property('tag', 'tag1');
        expect(result[1].items[0]).to.have.property('series')
            .that.has.lengthOf(1);
      });

      it('creates a grouping when tag has a separator', function() {
        const result = categorizeSelection([this.selection1], 'scalar');

        expect(result[2]).to.have.property('items')
            .that.has.lengthOf(2);

        expect(result[2]).to.have.property('name', 'tag2');
        expect(result[2].items[0]).to.have.property('tag', 'tag2/subtag1');
        expect(result[2].items[1]).to.have.property('tag', 'tag2/subtag2');
        expect(result[2].items[0]).to.have.property('series')
            .that.has.lengthOf(1);
      });

      it('creates a group with items with experiment and run', function() {
        const sel = this.selection1;
        const result = categorizeSelection([sel], 'scalar');

        expect(result[1].items[0]).to.have.property('series')
            .that.has.lengthOf(1)
            .and.that.deep.equal([
              {experiment: sel.experiment, run: 'run1', tag: 'tag1'},
            ]);
      });

      it('creates distinct subitems when tags exactly match', function() {
        const sel = this.selection2;
        const result = categorizeSelection([sel], 'scalar');
        expect(result[1].items[0]).to.have.property('series')
            .that.has.lengthOf(2)
            .and.that.deep.equal([
              {experiment: sel.experiment, run: 'run2', tag: 'tag2/subtag1'},
              {experiment: sel.experiment, run: 'run3', tag: 'tag2/subtag1'},
            ]);
      });

      it('filters out tags of a different plugin', function() {
        const sel = this.selection3;
        const result = categorizeSelection([sel], 'custom_scalar');

        expect(result).to.have.lengthOf(2);
        expect(result[1]).to.have.property('name', 'tag4');
        expect(result[1]).to.have.property('items')
            .that.has.lengthOf(1);
        expect(result[1].items[0]).to.have.property('series')
            .that.has.lengthOf(1)
            .and.that.deep.equal([
              {experiment: sel.experiment, run: 'run1', tag: 'tag4'},
            ]);
      });
    });
  });

});

} // namespace tf_categorization_utils
