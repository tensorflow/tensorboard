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
var tf_categorization_utils;
(function (tf_categorization_utils) {
    /**
     * Functions to extract categories of tags and/or run-tag combinations
     * from a run-to-tag mapping. The resulting categories can be fed to a
     * `tf-category-pane`, and their items can be `<dom-repeat>`ed in a
     * Polymer component.
     */
    let CategoryType;
    (function (CategoryType) {
        CategoryType[CategoryType["SEARCH_RESULTS"] = 0] = "SEARCH_RESULTS";
        CategoryType[CategoryType["PREFIX_GROUP"] = 1] = "PREFIX_GROUP";
    })(CategoryType = tf_categorization_utils.CategoryType || (tf_categorization_utils.CategoryType = {}));
    ;
    /**
     * Compute a category containing the search results for the given query.
     */
    function categorizeBySearchQuery(xs, query) {
        const re = (() => {
            try {
                return new RegExp(query);
            }
            catch (e) {
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
    tf_categorization_utils.categorizeBySearchQuery = categorizeBySearchQuery;
    /**
     * Compute the quotient set $X/{\sim}$, where $a \sim b$ if $a$ and $b$
     * share a common `separator`-prefix. Order is preserved.
     */
    function categorizeByPrefix(xs, separator = '/') {
        const categories = [];
        const categoriesByName = {};
        xs.forEach(x => {
            const index = x.indexOf(separator);
            const name = index >= 0 ? x.slice(0, index) : x;
            if (!categoriesByName[name]) {
                const category = {
                    name,
                    metadata: { type: CategoryType.PREFIX_GROUP },
                    items: [],
                };
                categoriesByName[name] = category;
                categories.push(category);
            }
            categoriesByName[name].items.push(x);
        });
        return categories;
    }
    tf_categorization_utils.categorizeByPrefix = categorizeByPrefix;
    /*
     * Compute the standard categorization of the given input, including
     * both search categories and prefix categories.
     */
    function categorize(xs, query = '') {
        const byFilter = [categorizeBySearchQuery(xs, query)];
        const byPrefix = categorizeByPrefix(xs);
        return [].concat(byFilter, byPrefix);
    }
    tf_categorization_utils.categorize = categorize;
    function categorizeTags(runToTag, selectedRuns, query) {
        const tags = tf_backend.getTags(runToTag);
        const categories = categorize(tags, query);
        const tagToRuns = createTagToRuns(_.pick(runToTag, selectedRuns));
        return categories.map(({ name, metadata, items }) => ({
            name,
            metadata,
            items: items.map(tag => ({
                tag,
                runs: (tagToRuns.get(tag) || []).slice(),
            })),
        }));
    }
    tf_categorization_utils.categorizeTags = categorizeTags;
    function createTagToRuns(runToTag) {
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
    function createRunToTagForPlugin(runs, pluginName) {
        const runToTag = {};
        runs.forEach((run) => {
            runToTag[run.name] = run.tags
                .filter(tag => tag.pluginName == pluginName)
                .map(({ name }) => name);
        });
        return runToTag;
    }
    function compareTagRun(a, b) {
        const c = vz_sorting.compareTagNames(a.tag, b.tag);
        if (c != 0) {
            return c;
        }
        return vz_sorting.compareTagNames(a.run, b.run);
    }
    function categorizeRunTagCombinations(runToTag, selectedRuns, query) {
        const tagCategories = categorizeTags(runToTag, selectedRuns, query);
        function explodeCategory(tagCategory) {
            const items = _.flatten(tagCategory.items.map(({ tag, runs }) => runs.map(run => ({ tag, run }))));
            items.sort(compareTagRun);
            return {
                name: tagCategory.name,
                metadata: tagCategory.metadata,
                items,
            };
        }
        return tagCategories.map(explodeCategory);
    }
    tf_categorization_utils.categorizeRunTagCombinations = categorizeRunTagCombinations;
})(tf_categorization_utils || (tf_categorization_utils = {})); // namespace wtf_categorization_utils
