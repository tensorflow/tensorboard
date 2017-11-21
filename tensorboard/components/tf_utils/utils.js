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
var tf_utils;
(function (tf_utils) {
    /**
     * Given many occurrences of tag info for a particular tag across
     * multiple runs, create a representative info object. This is useful
     * for plugins that display just one visualization per tag, instead of
     * one per run--tag combination: each run--tag combination can have its
     * own display name or description, so there is a dimension mismatch. We
     * reconcile this as follows:
     *
     *   - We only show a display name if all runs agree. Otherwise, or if
     *     there are no runs, we use the provided `defaultDisplayName`.
     *
     *   - If all runs agree on a description, we use it. Otherwise,
     *     we concatenate all descriptions, annotating which ones
     *     came from which run, and display them in a list.
     *
     * NOTE: Per TensorBoard convention, we assume that the provided
     * `description`s have sanitized HTML and are safe to render into the
     * DOM, while the `displayName` may be an arbitrary string. The output
     * of this function respects this convention as well.
     */
    function aggregateTagInfo(runToTagInfo, defaultDisplayName) {
        var unanimousDisplayName = undefined;
        var descriptionToRuns = {};
        Object.keys(runToTagInfo).forEach(function (run) {
            var info = runToTagInfo[run];
            if (unanimousDisplayName === undefined) {
                unanimousDisplayName = info.displayName;
            }
            if (unanimousDisplayName !== info.displayName) {
                unanimousDisplayName = null;
            }
            if (descriptionToRuns[info.description] === undefined) {
                descriptionToRuns[info.description] = [];
            }
            descriptionToRuns[info.description].push(run);
        });
        var displayName = unanimousDisplayName != null ?
            unanimousDisplayName :
            defaultDisplayName;
        var description = (function () {
            var descriptions = Object.keys(descriptionToRuns);
            if (descriptions.length === 0) {
                return '';
            }
            else if (descriptions.length === 1) {
                return descriptions[0];
            }
            else {
                var items = descriptions.map(function (description) {
                    var runs = descriptionToRuns[description].map(function (run) {
                        // We're splicing potentially unsafe display names into
                        // sanitized descriptions, so we need to sanitize them.
                        var safeRun = run
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;') // for symmetry :-)
                            .replace(/&/g, '&amp;');
                        return "<code>" + safeRun + "</code>";
                    });
                    var joined = runs.length > 2 ?
                        (runs.slice(0, runs.length - 1).join(', ')
                            + ', and ' + runs[runs.length - 1]) :
                        runs.join(' and ');
                    var runNoun = ngettext(runs.length, 'run', 'runs');
                    return "<li><p>For " + runNoun + " " + joined + ":</p>" + description + "</li>";
                });
                var prefix = '<p><strong>Multiple descriptions:</strong></p>';
                return prefix + "<ul>" + items.join('') + "</ul>";
            }
        })();
        return { displayName: displayName, description: description };
    }
    tf_utils.aggregateTagInfo = aggregateTagInfo;
    function ngettext(k, enSingular, enPlural) {
        // Potential extension point for proper i18n infrastructure, if we
        // ever implement it.
        return k === 1 ? enSingular : enPlural;
    }
})(tf_utils || (tf_utils = {})); // namespace tf_utils
