/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
var tf_color_scale;
(function (tf_color_scale) {
    // Example usage:
    // runs = ["train", "test", "test1", "test2"]
    // ccs = new ColorScale();
    // ccs.domain(runs);
    // ccs.getColor("train");
    // ccs.getColor("test1");
    class ColorScale {
        /**
         * Creates a color scale with optional custom palette.
         * @param {Array<string>} palette The color palette to use, as an
         *   Array of hex strings. Defaults to the standard palette.
         */
        constructor(palette = tf_color_scale.standard) {
            this.palette = palette;
            this.identifiers = d3.map();
        }
        /**
         * Set the domain of strings.
         * @param {Array<string>} strings - An array of possible strings to use as the
         *     domain for your scale.
         */
        setDomain(strings) {
            this.identifiers = d3.map();
            strings.forEach((s, i) => {
                this.identifiers.set(s, this.palette[i % this.palette.length]);
            });
            return this;
        }
        /**
         * Use the color scale to transform an element in the domain into a color.
         * @param {string} The input string to map to a color.
         * @return {string} The color corresponding to that input string.
         * @throws Will error if input string is not in the scale's domain.
         */
        getColor(s) {
            if (!this.identifiers.has(s)) {
                throw new Error(`String ${s} was not in the domain.`);
            }
            return this.identifiers.get(s);
        }
    }
    tf_color_scale.ColorScale = ColorScale;
    /**
     * A color scale of a domain from a store.  Automatically updated when the store
     * emits a change.
     */
    function createAutoUpdateColorScale(store, getDomain) {
        const colorScale = new ColorScale();
        function updateRunsColorScale() {
            colorScale.setDomain(getDomain());
        }
        store.addListener(updateRunsColorScale);
        updateRunsColorScale();
        return (domain) => colorScale.getColor(domain);
    }
    tf_color_scale.runsColorScale = createAutoUpdateColorScale(tf_backend.runsStore, () => tf_backend.runsStore.getRuns());
    tf_color_scale.experimentsColorScale = createAutoUpdateColorScale(tf_backend.experimentsStore, () => {
        return tf_backend.experimentsStore.getExperiments().map(({ name }) => name);
    });
})(tf_color_scale || (tf_color_scale = {})); // tf_color_scale
