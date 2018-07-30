/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
namespace tf_categorization_utils {

/**
 * Functions to extract categories of tags and/or run-tag combinations
 * from a run-to-tag mapping. The resulting categories can be fed to a
 * `tf-category-pane`, and their items can be `<dom-repeat>`ed in a
 * Polymer component.
 */

export type RunToTag = {[run: string]: string[]};

export enum CategoryType {
  SEARCH_RESULTS,
  PREFIX_GROUP,
}
export interface PrefixGroupMetadata {
  type: CategoryType;
}
export interface SearchResultsMetadata {
  type: CategoryType;
  validRegex: boolean;
  universalRegex: boolean;  // is the search query ".*"? ("(?:)" doesn't count)
}
export type CategoryMetadata = PrefixGroupMetadata | SearchResultsMetadata;

export interface Category<T> {
  name: string,
  metadata: CategoryMetadata,
  items: T[],
};
export type TagCategory = Category<{tag: string, runs: string[]}>;
export type RunTagCategory = Category<{tag: string, run: string}>;

/**
 * Organize data by tagPrefix, tag, experiments, and lastly runs. Specifically,
 * for scalar plugin, sections are created from tagPrefixes, line graphs are
 * created from tag name, and within a graph, lines are colored and grouped by
 * experiments.
 */
export type FourLeveledCategory = Category<{
  tag: string,
  items: Array<{
    experiment: string,
    run: string,
  }>,
}>;

export type RawCategory = Category<string>;  // Intermediate structure.

/**
 * Compute a category containing the search results for the given query.
 */
export function categorizeBySearchQuery(
    xs: string[], query: string): RawCategory {
  const re = (() => {
    try {
      return new RegExp(query);
    } catch (e) {
      return null;
    }
  })();
  return {
    name: query,
    metadata: {
      type: CategoryType.SEARCH_RESULTS,
      validRegex: !!re,
      universalRegex: query === '.*',
    },
    items: re ? xs.filter(x => x.match(re)) : [],
  };
}

/**
 * Compute the quotient set $X/{\sim}$, where $a \sim b$ if $a$ and $b$
 * share a common `separator`-prefix. Order is preserved.
 */
export function categorizeByPrefix(xs: string[], separator = '/'): RawCategory[] {
  const categories = [];
  const categoriesByName = {};
  xs.forEach(x => {
    const index = x.indexOf(separator);
    const name = index >= 0 ? x.slice(0, index) : x;
    if (!categoriesByName[name]) {
      const category = {
        name,
        metadata: {type: CategoryType.PREFIX_GROUP},
        items: [],
      };
      categoriesByName[name] = category;
      categories.push(category);
    }
    categoriesByName[name].items.push(x);
  });
  return categories;
}

/*
 * Compute the standard categorization of the given input, including
 * both search categories and prefix categories.
 */
export function categorize(xs: string[], query = ''): RawCategory[] {
  const byFilter = [categorizeBySearchQuery(xs, query)];
  const byPrefix = categorizeByPrefix(xs);
  return [].concat(byFilter, byPrefix);
}

export function categorizeTags(
    runToTag: RunToTag,
    selectedRuns: string[],
    query?: string): TagCategory[] {
  const tags = tf_backend.getTags(runToTag);
  const categories = categorize(tags, query);
  const tagToRuns = createTagToRuns(_.pick(runToTag, selectedRuns));

  return categories.map(({name, metadata, items}) => ({
    name,
    metadata,
    items: items.map(tag => ({
      tag,
      runs: tagToRuns[tag].slice(),
    })),
  }));
}

/**
 * Creates grouping of the data based on selection from tf-data-selector. It
 * groups data by prefixes of tag names and by tag names. Each group contains
 * names of experiments and runs.
 */
export function categorizeSelection(
    selection: tf_data_selector.Selection[],
    runToTag: RunToTag): FourLeveledCategory[] {
  const tagToItems = new Map();
  const searchTagToItems = new Map();

  selection.forEach(({experiment, runs, tagRegex}) => {
    const runNames = runs.map(({name}) => name);
    const selectedRunToTag = (_.pick(runToTag, runNames) as RunToTag);
    const tagToSelectedRuns = createTagToRuns(selectedRunToTag);
    const tags = tf_backend.getTags(selectedRunToTag);

    const searchCategory = categorizeBySearchQuery(tags, tagRegex);
    // list of matching tags.
    searchCategory.items.forEach(tag => {
      const items = searchTagToItems.get(tag) || [];
      items.push(...tagToSelectedRuns.get(tag)
          .map(run => ({experiment: experiment.name, run})));
      searchTagToItems.set(tag, items);
    });

    // list of all tags that has selected runs.
    tags.forEach(tag => {
      const items = tagToItems.get(tag) || [];
      items.push(...tagToSelectedRuns.get(tag)
          .map(run => ({experiment: experiment.name, run})));
      tagToItems.set(tag, items);
    });
  });

  const searchCategory = {
    name: selection.length == 1 ? selection[0].tagRegex : 'multi',
    metadata: {
      type: CategoryType.SEARCH_RESULTS,
      validRegex: false,
      universalRegex: false,
    },
    items: Array.from(searchTagToItems.entries())
        .map(([tag, value]) => ({
          tag,
          items: value,
        })),
  };

  // Organize the tag to items by prefix.
  const prefixCategories = categorizeByPrefix(Array.from(tagToItems.keys()))
      .map(({name, metadata, items}) => ({
        name,
        metadata,
        items: items.map(tag => ({
          tag,
          items: tagToItems.get(tag),
        })),
      }));

  return [
    searchCategory,
    ...prefixCategories,
  ];
}

function createTagToRuns(runToTag: RunToTag): Map<string, string[]> {
  const tagToRun = new Map();
  Object.keys(runToTag).forEach(run => {
    runToTag[run].forEach(tag => {
      const runs = tagToRun.get(tag) || [];
      runs.push(run);
      tagToRun.set(tag, runs);
    });
  });
  return tagToRun;
}

function compareTagRun(a, b: {tag: string, run: string}): number {
  const c = vz_sorting.compareTagNames(a.tag, b.tag);
  if (c != 0) {
    return c;
  }
  return vz_sorting.compareTagNames(a.run, b.run);
}

export function categorizeRunTagCombinations(
    runToTag: RunToTag,
    selectedRuns: string[],
    query?: string): RunTagCategory[] {
  const tagCategories =
    categorizeTags(runToTag, selectedRuns, query);
  function explodeCategory(tagCategory: TagCategory): RunTagCategory {
    const items = _.flatten(tagCategory.items.map(
      ({tag, runs}) => runs.map(run => ({tag, run}))));
    items.sort(compareTagRun);
    return {
      name: tagCategory.name,
      metadata: tagCategory.metadata,
      items,
    };
  }
  return tagCategories.map(explodeCategory);
}

}  // namespace tf_categorization_utils
