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
var tf_custom_scalar_dashboard;
(function (tf_custom_scalar_dashboard) {
    /**
     * A class that represents a data series for a custom scalars chart.
     */
    class DataSeries {
        constructor(run, tag, name, scalarData, symbol) {
            this.run = run;
            this.tag = tag;
            this.name = name;
            this.scalarData = scalarData;
            this.symbol = symbol;
        }
        getName() {
            return this.name;
        }
        setData(scalarData) {
            this.scalarData = scalarData;
        }
        getData() {
            return this.scalarData;
        }
        getRun() {
            return this.run;
        }
        getTag() {
            return this.tag;
        }
        getSymbol() {
            return this.symbol;
        }
    }
    tf_custom_scalar_dashboard.DataSeries = DataSeries;
    function generateDataSeriesName(run, tag) {
        return `${tag} (${run})`;
    }
    tf_custom_scalar_dashboard.generateDataSeriesName = generateDataSeriesName;
    /**
     * A color scale that wraps the usual color scale that relies on runs. This
     * particular color scale parses the run from a series name and defers to that
     * former color scale.
     */
    class DataSeriesColorScale {
        constructor(runBasedColorScale) {
            this.runBasedColorScale = runBasedColorScale;
        }
        /**
         * Obtains the correct color based on the run.
         * @param {string} dataSeries
         * @return {string} The color.
         */
        scale(dataSeries) {
            return this.runBasedColorScale.scale(this.parseRunName(dataSeries));
        }
        /**
         * Parses the run name from a data series string. Returns the empty string if
         * parsing fails.
         */
        parseRunName(dataSeries) {
            const match = dataSeries.match(/\((.*)\)$/);
            if (!match) {
                // No match found.
                return '';
            }
            return match[1];
        }
    }
    tf_custom_scalar_dashboard.DataSeriesColorScale = DataSeriesColorScale;
})(tf_custom_scalar_dashboard || (tf_custom_scalar_dashboard = {})); // namespace tf_custom_scalar_dashboard
