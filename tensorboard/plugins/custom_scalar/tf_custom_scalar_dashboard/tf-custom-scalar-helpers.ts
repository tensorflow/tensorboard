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
namespace tf_custom_scalar_dashboard {

export interface CustomScalarResponse {
  regex_valid: boolean;

  // Maps tag name to a list of scalar data.
  tag_to_events: {[key: string]: vz_chart_helpers.ScalarDatum[]};
}

/**
 * A chart encapsulates data on a single chart.
 */
export interface Chart {
  // A title for the chart. If not provided, a comma-separated list of tags is
  // used.
  title: string,

  // A list of regexes for tags that should be long in this chart.
  tag: string[],
}

/**
 * A category specifies charts within a single collapsible.
 */
export interface Category {
  title: string,

  // A list of charts to show in this category.
  chart: Chart[],
}

/**
 * A layout specifies how the various categories and charts should be laid out
 * within the dashboard.
 */
export interface Layout {
  category: Category[],
}

/**
 * A class that represents a data series for a custom scalars chart.
 */
export class DataSeries {
  private run: string;
  private tag: string;
  private name: string;
  private scalarData: vz_chart_helpers.ScalarDatum[];
  private symbol: vz_chart_helpers.LineChartSymbol;

  constructor(run: string,
              tag: string,
              name: string,
              scalarData: vz_chart_helpers.ScalarDatum[],
              symbol: vz_chart_helpers.LineChartSymbol) {
    this.run = run;
    this.tag = tag;
    this.name = name;
    this.scalarData = scalarData;
    this.symbol = symbol;
  }

  getName(): string {
    return this.name;
  }

  setData(scalarData: vz_chart_helpers.ScalarDatum[]) {
    this.scalarData = scalarData;
  }

  getData(): vz_chart_helpers.ScalarDatum[] {
    return this.scalarData;
  }

  getRun(): string {
    return this.run;
  }

  getTag(): string {
    return this.tag;
  }

  getSymbol(): vz_chart_helpers.LineChartSymbol {
    return this.symbol;
  }
}

export function generateDataSeriesName(run: string, tag: string): string {
  return `${tag} (${run})`;
}

/**
 * A color scale that wraps the usual color scale that relies on runs. This
 * particular color scale parses the run from a series name and defers to that
 * former color scale.
 */
export class DataSeriesColorScale {
  private runBasedColorScale: Plottable.Scales.Color;

  constructor(runBasedColorScale: Plottable.Scales.Color) {
    this.runBasedColorScale = runBasedColorScale;
  }

  /**
   * Obtains the correct color based on the run.
   * @param {string} dataSeries
   * @return {string} The color.
   */
  scale(dataSeries: string): string {
    return this.runBasedColorScale.scale(this.parseRunName(dataSeries));
  }

  /**
   * Parses the run name from a data series string. Returns the empty string if
   * parsing fails.
   */
  private parseRunName(dataSeries: string): string {
    const match = dataSeries.match(/\((.*)\)$/);
    if (!match) {
      // No match found.
      return '';
    }
    return match[1];
  }
}

}  // namespace tf_custom_scalar_dashboard
