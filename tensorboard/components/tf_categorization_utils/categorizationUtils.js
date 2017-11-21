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
    var CategoryType;
    (function (CategoryType) {
        CategoryType[CategoryType["SEARCH_RESULTS"] = 0] = "SEARCH_RESULTS";
        CategoryType[CategoryType["PREFIX_GROUP"] = 1] = "PREFIX_GROUP";
    })(CategoryType = tf_categorization_utils.CategoryType || (tf_categorization_utils.CategoryType = {}));
    ;
    /**
     * Compute a category containing the search results for the given query.
     */
    function categorizeBySearchQuery(xs, query) {
        var re = (function () {
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
            items: re ? xs.filter(function (x) { return x.match(re); }) : [],
        };
    }
    tf_categorization_utils.categorizeBySearchQuery = categorizeBySearchQuery;
    /**
     * Compute the quotient set $X/{\sim}$, where $a \sim b$ if $a$ and $b$
     * share a common `separator`-prefix. Order is preserved.
     */
    function categorizeByPrefix(xs, separator) {
        if (separator === void 0) { separator = '/'; }
        var categories = [];
        var categoriesByName = {};
        xs.forEach(function (x) {
            var index = x.indexOf(separator);
            var name = index >= 0 ? x.slice(0, index) : x;
            if (!categoriesByName[name]) {
                var category = {
                    name: name,
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
    function categorize(xs, query) {
        if (query === void 0) { query = ''; }
        var byFilter = [categorizeBySearchQuery(xs, query)];
        var byPrefix = categorizeByPrefix(xs);
        return [].concat(byFilter, byPrefix);
    }
    tf_categorization_utils.categorize = categorize;
    function categorizeTags(runToTag, selectedRuns, query) {
        var tags = tf_backend.getTags(runToTag);
        var categories = categorize(tags, query);
        var tagToRuns = {};
        tags.forEach(function (tag) {
            tagToRuns[tag] = [];
        });
        selectedRuns.forEach(function (run) {
            (runToTag[run] || []).forEach(function (tag) {
                tagToRuns[tag].push(run);
            });
        });
        return categories.map(function (_a) {
            var name = _a.name, metadata = _a.metadata, items = _a.items;
            return ({
                name: name,
                metadata: metadata,
                items: items.map(function (tag) { return ({
                    tag: tag,
                    runs: tagToRuns[tag].slice(),
                }); }),
            });
        });
    }
    tf_categorization_utils.categorizeTags = categorizeTags;
    function compareTagRun(a, b) {
        var c = vz_sorting.compareTagNames(a.tag, b.tag);
        if (c != 0) {
            return c;
        }
        return vz_sorting.compareTagNames(a.run, b.run);
    }
    function categorizeRunTagCombinations(runToTag, selectedRuns, query) {
        var tagCategories = categorizeTags(runToTag, selectedRuns, query);
        function explodeCategory(tagCategory) {
            var items = _.flatten(tagCategory.items.map(function (_a) {
                var tag = _a.tag, runs = _a.runs;
                return runs.map(function (run) { return ({ tag: tag, run: run }); });
            }));
            items.sort(compareTagRun);
            return {
                name: tagCategory.name,
                metadata: tagCategory.metadata,
                items: items,
            };
        }
        return tagCategories.map(explodeCategory);
    }
    tf_categorization_utils.categorizeRunTagCombinations = categorizeRunTagCombinations;
})(tf_categorization_utils || (tf_categorization_utils = {})); // namespace tf_categorization_utils
