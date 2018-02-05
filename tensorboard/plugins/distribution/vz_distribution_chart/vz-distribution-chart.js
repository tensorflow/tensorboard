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
var vz_distribution_chart;
(function (vz_distribution_chart) {
    var DistributionChart = /** @class */ (function () {
        function DistributionChart(xType, colorScale) {
            this.run2datasets = {};
            this.colorScale = colorScale;
            this.buildChart(xType);
        }
        DistributionChart.prototype.getDataset = function (run) {
            if (this.run2datasets[run] === undefined) {
                this.run2datasets[run] = new Plottable.Dataset([], { run: run });
            }
            return this.run2datasets[run];
        };
        DistributionChart.prototype.buildChart = function (xType) {
            if (this.outer) {
                this.outer.destroy();
            }
            var xComponents = vz_line_chart.getXComponents(xType);
            this.xAccessor = xComponents.accessor;
            this.xScale = xComponents.scale;
            this.xAxis = xComponents.axis;
            this.xAxis.margin(0).tickLabelPadding(3);
            this.yScale = new Plottable.Scales.Linear();
            this.yAxis = new Plottable.Axes.Numeric(this.yScale, 'left');
            var yFormatter = vz_line_chart.multiscaleFormatter(vz_line_chart.Y_AXIS_FORMATTER_PRECISION);
            this.yAxis.margin(0).tickLabelPadding(5).formatter(yFormatter);
            this.yAxis.usesTextWidthApproximation(true);
            var center = this.buildPlot(this.xAccessor, this.xScale, this.yScale);
            this.gridlines =
                new Plottable.Components.Gridlines(this.xScale, this.yScale);
            this.center = new Plottable.Components.Group([this.gridlines, center]);
            this.outer = new Plottable.Components.Table([[this.yAxis, this.center], [null, this.xAxis]]);
        };
        DistributionChart.prototype.buildPlot = function (xAccessor, xScale, yScale) {
            var _this = this;
            var percents = [0, 228, 1587, 3085, 5000, 6915, 8413, 9772, 10000];
            var opacities = _.range(percents.length - 1)
                .map(function (i) { return (percents[i + 1] - percents[i]) / 2500; });
            var accessors = percents.map(function (p, i) { return function (datum) { return datum[i][1]; }; });
            var median = 4;
            var medianAccessor = accessors[median];
            var plots = _.range(accessors.length - 1).map(function (i) {
                var p = new Plottable.Plots.Area();
                p.x(xAccessor, xScale);
                var y0 = i > median ? accessors[i] : accessors[i + 1];
                var y = i > median ? accessors[i + 1] : accessors[i];
                p.y(y, yScale);
                p.y0(y0);
                p.attr('fill', function (d, i, dataset) {
                    return _this.colorScale.scale(dataset.metadata().run);
                });
                p.attr('stroke', function (d, i, dataset) {
                    return _this.colorScale.scale(dataset.metadata().run);
                });
                p.attr('stroke-weight', function (d, i, m) { return '0.5px'; });
                p.attr('stroke-opacity', function () { return opacities[i]; });
                p.attr('fill-opacity', function () { return opacities[i]; });
                return p;
            });
            var medianPlot = new Plottable.Plots.Line();
            medianPlot.x(xAccessor, xScale);
            medianPlot.y(medianAccessor, yScale);
            medianPlot.attr('stroke', function (d, i, m) { return _this.colorScale.scale(m.run); });
            this.plots = plots;
            return new Plottable.Components.Group(plots);
        };
        DistributionChart.prototype.setVisibleSeries = function (runs) {
            var _this = this;
            this.runs = runs;
            var datasets = runs.map(function (r) { return _this.getDataset(r); });
            this.plots.forEach(function (p) { return p.datasets(datasets); });
        };
        /**
         * Set the data of a series on the chart.
         */
        DistributionChart.prototype.setSeriesData = function (name, data) {
            this.getDataset(name).data(data);
        };
        DistributionChart.prototype.renderTo = function (targetSVG) {
            this.targetSVG = targetSVG;
            this.outer.renderTo(targetSVG);
        };
        DistributionChart.prototype.redraw = function () {
            this.outer.redraw();
        };
        DistributionChart.prototype.destroy = function () {
            this.outer.destroy();
        };
        return DistributionChart;
    }());
    vz_distribution_chart.DistributionChart = DistributionChart;
    Polymer({
        is: 'vz-distribution-chart',
        properties: {
            /**
             * Scale that maps series names to colors. The default colors are from
             * d3.d3.schemeCategory10. Use this property to replace the default
             * line colors with colors of your own choice.
             * @type {Plottable.Scales.Color}
             * @required
             */
            colorScale: {
                type: Object,
                value: function () {
                    return new Plottable.Scales.Color().range(d3.schemeCategory10);
                }
            },
            /**
             * The way to display the X values. Allows:
             * - "step" - Linear scale using the  "step" property of the datum.
             * - "wall_time" - Temporal scale using the "wall_time" property of the
             * datum.
             * - "relative" - Temporal scale using the "relative" property of the
             * datum if it is present or calculating from "wall_time" if it isn't.
             */
            xType: { type: String, value: 'step' },
            _attached: Boolean,
            _chart: Object,
            _visibleSeriesCache: {
                type: Array,
                value: function () {
                    return [];
                }
            },
            _seriesDataCache: {
                type: Object,
                value: function () {
                    return {};
                }
            },
            _makeChartAsyncCallbackId: { type: Number, value: null }
        },
        observers: [
            '_makeChart(xType, colorScale, _attached)',
            '_reloadFromCache(_chart)',
        ],
        setVisibleSeries: function (names) {
            this._visibleSeriesCache = names;
            if (this._chart) {
                this._chart.setVisibleSeries(names);
                this.redraw();
            }
        },
        setSeriesData: function (name, data) {
            this._seriesDataCache[name] = data;
            if (this._chart) {
                this._chart.setSeriesData(name, data);
            }
        },
        redraw: function () {
            this._chart.redraw();
        },
        ready: function () {
            this.scopeSubtree(this.$.chartdiv, true);
        },
        _makeChart: function (xType, colorScale, _attached) {
            if (this._makeChartAsyncCallbackId === null) {
                this.cancelAsync(this._makeChartAsyncCallbackId);
            }
            this._makeChartAsyncCallbackId = this.async(function () {
                this._makeChartAsyncCallbackId = null;
                if (!_attached)
                    return;
                if (this._chart)
                    this._chart.destroy();
                var chart = new DistributionChart(xType, colorScale);
                var svg = d3.select(this.$.chartdiv);
                chart.renderTo(svg);
                this._chart = chart;
            }, 350);
        },
        _reloadFromCache: function () {
            if (this._chart) {
                this._chart.setVisibleSeries(this._visibleSeriesCache);
                this._visibleSeriesCache.forEach(function (name) {
                    this._chart.setSeriesData(name, this._seriesDataCache[name] || []);
                }.bind(this));
            }
        },
        attached: function () {
            this._attached = true;
        },
        detached: function () {
            this._attached = false;
        }
    });
})(vz_distribution_chart || (vz_distribution_chart = {})); // namespace vz_distribution_chart
