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
import {categorizer as makeCategorizer} from '../tf-dashboard-common/tf-categorizer.js';

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

export function categorizeTags(
    runToTag: RunToTag, selectedRuns: string[],
    tagGroupRegexes?: string[]): TagCategory[] {
  const categorizer = makeCategorizer({
    categoryDefinitions: tagGroupRegexes || [],
    fallbackCategorizer: 'TopLevelNamespaceCategorizer',
  });
  const tags = getTags(runToTag);
  const categories = categorizer(tags);

  const tagToRuns = {};
  tags.forEach(tag => {
    tagToRuns[tag] = [];
  });
  selectedRuns.forEach(run => {
    runToTag[run].forEach(tag => {
      tagToRuns[tag].push(run);
    });
  });
  return categories.map(({name, tags}) => ({
    name,
    items: tags.map(tag => ({
      tag,
      runs: tagToRuns[tag].slice(),
    })),
    count: tags.length,
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
