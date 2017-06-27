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

import {getTags} from '../tf-backend/backend.js';

/**
 * Functions to extract categories of tags and/or run-tag combinations
 * from a run-to-tag mapping, yielding data in a format suitable to be
 * used as items in a `<dom-repeat>`ed in a Polymer component.
 *
 * TODO(wchargin): Scrap `tagGroupRegexes?: string[]` and replace with a
 * `filter?: string`.
 */
export type RunToTag = {[run: string]: string[]};
export type TagCategory = {
  name: string,
  items: {
    tag: string,
    runs: string[],
  }[],
  count: number,  // === items.length; provided for Polymer binding convenience
}
export type RunTagCategory = {
  name: string,
  items: {
    tag: string,
    run: string,
  }[],
  count: number,  // === items.length; provided for Polymer binding convenience
}

// Used internally as an intermediate structure.
export type Category = {
  name: string,
  items: string[],
};

/**
 * For each source that represents a valid regex, compute a category
 * containing all elements that match that regex. Discard invalid
 * sources.
 */
function categorizeByRegexes(xs: string[], regexSources: string[]): Category[] {
  return regexSources.map(source => {
    try {
      return {source, re: new RegExp(source)};
    } catch (e) {
      return null;
    }
  }).filter(maybe => maybe != null).map(({source, re}) => ({
    name: source,
    items: xs.filter(x => x.match(re)),
  }));
}

/**
 * Compute the quotient set $X/{\sim}$, where $a \sim b$ if $a$ and $b$
 * share a common `separator`-prefix. Order is preserved.
 */
function categorizeByPrefix(xs: string[], separator = '/'): Category[] {
  const categories = [];
  const categoriesByName = {};
  xs.forEach(x => {
    const index = x.indexOf(separator);
    const name = index >= 0 ? x.slice(0, index) : x;
    if (!categoriesByName[name]) {
      const category = {name, items: []};
      categoriesByName[name] = category;
      categories.push(category);
    }
    categoriesByName[name].items.push(x);
  });
  return categories;
}

/*
 * Compute the standard categorization of the given input, including
 * both regex categories and prefix categories.
 */
export function categorize(xs: string[], regexSources: string[]): Category[] {
  const byRegexes = categorizeByRegexes(xs, regexSources);
  const byPrefix = categorizeByPrefix(xs);
  return [].concat(byRegexes, byPrefix);
}

export function categorizeTags(
    runToTag: RunToTag, selectedRuns: string[],
    tagGroupRegexes?: string[]): TagCategory[] {
  const tags = getTags(runToTag);
  const categories = categorize(tags, tagGroupRegexes || []);
  const tagToRuns = {};
  tags.forEach(tag => {
    tagToRuns[tag] = [];
  });
  selectedRuns.forEach(run => {
    runToTag[run].forEach(tag => {
      tagToRuns[tag].push(run);
    });
  });
  return categories.map(({name, items}) => ({
    name,
    items: items.map(tag => ({
      tag,
      runs: tagToRuns[tag].slice(),
    })),
    count: items.length,
  }));
}

export function categorizeRunTagCombinations(
    runToTag: RunToTag, selectedRuns: string[],
    tagGroupRegexes?: string[]): RunTagCategory[] {
  const tagCategories = categorizeTags(runToTag, selectedRuns, tagGroupRegexes);
  function explodeCategory(tagCategory: TagCategory): RunTagCategory {
    const items = _.flatten(tagCategory.items.map(
      ({tag, runs}) => runs.map(run => ({tag, run}))));
    return {
      name: tagCategory.name,
      items,
      count: items.length,
    };
  }
  return tagCategories.map(explodeCategory);
}
