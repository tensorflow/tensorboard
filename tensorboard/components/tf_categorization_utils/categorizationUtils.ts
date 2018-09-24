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
  compositeSearch?: boolean;
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

export type Series = {
  experiment: tf_backend.Experiment,
  run: string,
  tag: string,
};

/**
 * Organize data by tagPrefix, tag, then list of series which is comprised of
 * an experiment and a run.
 */
export type SeriesCategory = Category<{
  tag: string,
  series: Series[],
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
      runs: (tagToRuns.get(tag) || []).slice(),
    })),
  }));
}

/**
 * Creates grouping of the data based on selection from tf-data-selector. It
 * groups data by prefixes of tag names and by tag names. Each group contains
 * series, a tuple of experiment name and run name.
 */
export function categorizeSelection(
    selection: tf_data_selector.Selection[], pluginName: string):
    SeriesCategory[] {
  const tagToSeries = new Map<string, Series[]>();
  // `tagToSearchSeries` contains subset of `tagToSeries`. tagRegex in each
  // selection can omit series from a tag category.
  const tagToSearchSeries = new Map<string, Series[]>();
  const searchCategories = [];

  selection.forEach(({experiment, runs, tagRegex}) => {
    const runNames = runs.map(({name}) => name);
    const selectedRunToTag = createRunToTagForPlugin(runs, pluginName);
    const tagToSelectedRuns = createTagToRuns(selectedRunToTag);
    const tags = tf_backend.getTags(selectedRunToTag);
    // list of all tags that has selected runs.
    tags.forEach(tag => {
      const series = tagToSeries.get(tag) || [];
      series.push(...tagToSelectedRuns.get(tag)
          .map(run => ({experiment, run, tag})));
      tagToSeries.set(tag, series);
    });

    const searchCategory = categorizeBySearchQuery(tags, tagRegex);
    searchCategories.push(searchCategory);
    // list of tags matching tagRegex in the selection.
    searchCategory.items.forEach(tag => {
      const series = tagToSearchSeries.get(tag) || [];
      series.push(...tagToSelectedRuns.get(tag)
          .map(run => ({experiment, run, tag})));
      tagToSearchSeries.set(tag, series);
    });
  });

  const searchCategory: RawCategory = searchCategories.length == 1 ?
      searchCategories[0] :
      {
        name: searchCategories.every(c => !c.name) ? '' : 'multi',
        metadata: {
          type: CategoryType.SEARCH_RESULTS,
          compositeSearch: true,
          validRegex: searchCategories.every(c => c.metadata.validRegex),
          universalRegex: false,
        },
        items: Array.from(tagToSearchSeries.keys())
            .sort(vz_sorting.compareTagNames),
      };

  const searchSeriesCategory: SeriesCategory = Object.assign(
    {},
    searchCategory,
    {
      items: searchCategory.items.map(tag => ({
        tag,
        series: tagToSearchSeries.get(tag),
      })),
    },
  );

  // Organize the tag to items by prefix.
  const prefixCategories: SeriesCategory[] = categorizeByPrefix(
      Array.from(tagToSeries.keys()))
          .map(({name, metadata, items}) => ({
            name,
            metadata,
            items: items.map(tag => ({
              tag,
              series: tagToSeries.get(tag),
            })),
          }));

  return [
    searchSeriesCategory,
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

function createRunToTagForPlugin(runs: tf_backend.Run[], pluginName: string):
    RunToTag {
  const runToTag = {};
  runs.forEach((run) => {
    runToTag[run.name] = run.tags
        .filter(tag => tag.pluginName == pluginName)
        .map(({name}) => name);
  })
  return runToTag;
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

}  // namespace wtf_categorization_utils
