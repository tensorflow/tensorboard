/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
var vz_line_chart2;
(function (vz_line_chart2) {
    var TooltipColumnEvalType;
    (function (TooltipColumnEvalType) {
        TooltipColumnEvalType[TooltipColumnEvalType["TEXT"] = 0] = "TEXT";
        TooltipColumnEvalType[TooltipColumnEvalType["DOM"] = 1] = "DOM";
    })(TooltipColumnEvalType || (TooltipColumnEvalType = {}));
    /**
     * The maximum number of marker symbols within any line for a data series. Too
     * many markers clutter the chart.
     */
    var _MAX_MARKERS = 20;
    var LineChart = /** @class */ (function () {
        function LineChart(xComponentsCreationMethod, yValueAccessor, yScaleType, colorScale, tooltip, tooltipColumns, fillArea, defaultXRange, defaultYRange, symbolFunction, xAxisFormatter) {
            this.seriesNames = [];
            this.name2datasets = {};
            this.colorScale = colorScale;
            this.tooltip = tooltip;
            this.datasets = [];
            this._ignoreYOutliers = false;
            // lastPointDataset is a dataset that contains just the last point of
            // every dataset we're currently drawing.
            this.lastPointsDataset = new Plottable.Dataset();
            this.nanDataset = new Plottable.Dataset();
            this.yValueAccessor = yValueAccessor;
            // The symbol function maps series to marker. It uses a special dataset that
            // varies based on whether smoothing is enabled.
            this.symbolFunction = symbolFunction;
            // need to do a single bind, so we can deregister the callback from
            // old Plottable.Datasets. (Deregistration is done by identity checks.)
            this.onDatasetChanged = this._onDatasetChanged.bind(this);
            this._defaultXRange = defaultXRange;
            this._defaultYRange = defaultYRange;
            this.tooltipColumns = tooltipColumns;
            this.buildChart(xComponentsCreationMethod, yValueAccessor, yScaleType, fillArea, xAxisFormatter);
        }
        LineChart.prototype.buildChart = function (xComponentsCreationMethod, yValueAccessor, yScaleType, fillArea, xAxisFormatter) {
            this.destroy();
            var xComponents = xComponentsCreationMethod();
            this.xAccessor = xComponents.accessor;
            this.xScale = xComponents.scale;
            this.xAxis = xComponents.axis;
            this.xAxis.margin(0).tickLabelPadding(3);
            if (xAxisFormatter) {
                this.xAxis.formatter(xAxisFormatter);
            }
            this.yScale = LineChart.getYScaleFromType(yScaleType);
            this.yAxis = new Plottable.Axes.Numeric(this.yScale, 'left');
            var yFormatter = vz_chart_helpers.multiscaleFormatter(vz_chart_helpers.Y_AXIS_FORMATTER_PRECISION);
            this.yAxis.margin(0).tickLabelPadding(5).formatter(yFormatter);
            this.yAxis.usesTextWidthApproximation(true);
            this.fillArea = fillArea;
            this.dzl = new vz_line_chart.DragZoomLayer(this.xScale, this.yScale, this.resetYDomain.bind(this));
            this.tooltipInteraction = this.createTooltipInteraction(this.dzl);
            this.tooltipPointsComponent = new Plottable.Component();
            var plot = this.buildPlot(this.xScale, this.yScale, fillArea);
            this.gridlines =
                new Plottable.Components.Gridlines(this.xScale, this.yScale);
            var xZeroLine = new Plottable.Components.GuideLineLayer('horizontal');
            xZeroLine.scale(this.yScale).value(0);
            var yZeroLine = new Plottable.Components.GuideLineLayer('vertical');
            yZeroLine.scale(this.xScale).value(0);
            this.center = new Plottable.Components.Group([
                this.gridlines, xZeroLine, yZeroLine, plot,
                this.dzl, this.tooltipPointsComponent
            ]);
            this.outer = new Plottable.Components.Table([[this.yAxis, this.center], [null, this.xAxis]]);
        };
        LineChart.prototype.buildPlot = function (xScale, yScale, fillArea) {
            var _this = this;
            if (fillArea) {
                this.marginAreaPlot = new Plottable.Plots.Area();
                this.marginAreaPlot.x(this.xAccessor, xScale);
                this.marginAreaPlot.y(fillArea.higherAccessor, yScale);
                this.marginAreaPlot.y0(fillArea.lowerAccessor);
                this.marginAreaPlot.attr('fill', function (d, i, dataset) {
                    return _this.colorScale.scale(dataset.metadata().name);
                });
                this.marginAreaPlot.attr('fill-opacity', 0.3);
                this.marginAreaPlot.attr('stroke-width', 0);
            }
            this.smoothedAccessor = function (d) { return d.smoothed; };
            var linePlot = new Plottable.Plots.Line();
            linePlot.x(this.xAccessor, xScale);
            linePlot.y(this.yValueAccessor, yScale);
            linePlot.attr('stroke', function (d, i, dataset) {
                return _this.colorScale.scale(dataset.metadata().name);
            });
            this.linePlot = linePlot;
            this.setupTooltips(linePlot);
            var smoothLinePlot = new Plottable.Plots.Line();
            smoothLinePlot.x(this.xAccessor, xScale);
            smoothLinePlot.y(this.smoothedAccessor, yScale);
            smoothLinePlot.attr('stroke', function (d, i, dataset) {
                return _this.colorScale.scale(dataset.metadata().name);
            });
            this.smoothLinePlot = smoothLinePlot;
            if (this.symbolFunction) {
                var markersScatterPlot = new Plottable.Plots.Scatter();
                markersScatterPlot.x(this.xAccessor, xScale);
                markersScatterPlot.y(this.yValueAccessor, yScale);
                markersScatterPlot.attr('fill', function (d, i, dataset) {
                    return _this.colorScale.scale(dataset.metadata().name);
                });
                markersScatterPlot.attr('opacity', 1);
                markersScatterPlot.size(vz_chart_helpers.TOOLTIP_CIRCLE_SIZE * 2);
                markersScatterPlot.symbol(function (d, i, dataset) {
                    return _this.symbolFunction(dataset.metadata().name);
                });
                // Use a special dataset because this scatter plot should use the accesor
                // that depends on whether smoothing is enabled.
                this.markersScatterPlot = markersScatterPlot;
            }
            // The scatterPlot will display the last point for each dataset.
            // This way, if there is only one datum for the series, it is still
            // visible. We hide it when tooltips are active to keep things clean.
            var scatterPlot = new Plottable.Plots.Scatter();
            scatterPlot.x(this.xAccessor, xScale);
            scatterPlot.y(this.yValueAccessor, yScale);
            scatterPlot.attr('fill', function (d) { return _this.colorScale.scale(d.name); });
            scatterPlot.attr('opacity', 1);
            scatterPlot.size(vz_chart_helpers.TOOLTIP_CIRCLE_SIZE * 2);
            scatterPlot.datasets([this.lastPointsDataset]);
            this.scatterPlot = scatterPlot;
            var nanDisplay = new Plottable.Plots.Scatter();
            nanDisplay.x(this.xAccessor, xScale);
            nanDisplay.y(function (x) { return x.displayY; }, yScale);
            nanDisplay.attr('fill', function (d) { return _this.colorScale.scale(d.name); });
            nanDisplay.attr('opacity', 1);
            nanDisplay.size(vz_chart_helpers.NAN_SYMBOL_SIZE * 2);
            nanDisplay.datasets([this.nanDataset]);
            nanDisplay.symbol(Plottable.SymbolFactories.triangle);
            this.nanDisplay = nanDisplay;
            var groups = [nanDisplay, scatterPlot, smoothLinePlot, linePlot];
            if (this.marginAreaPlot) {
                groups.push(this.marginAreaPlot);
            }
            if (this.markersScatterPlot) {
                groups.push(this.markersScatterPlot);
            }
            return new Plottable.Components.Group(groups);
        };
        /** Updates the chart when a dataset changes. Called every time the data of
         * a dataset changes to update the charts.
         */
        LineChart.prototype._onDatasetChanged = function (dataset) {
            if (this.smoothingEnabled) {
                this.resmoothDataset(dataset);
            }
            this.updateSpecialDatasets();
        };
        LineChart.prototype.ignoreYOutliers = function (ignoreYOutliers) {
            if (ignoreYOutliers !== this._ignoreYOutliers) {
                this._ignoreYOutliers = ignoreYOutliers;
                this.updateSpecialDatasets();
                this.resetYDomain();
            }
        };
        /** Constructs special datasets. Each special dataset contains exceptional
         * values from all of the regular datasets, e.g. last points in series, or
         * NaN values. Those points will have a `name` and `relative` property added
         * (since usually those are context in the surrounding dataset).
         */
        LineChart.prototype.updateSpecialDatasets = function () {
            var accessor = this.getYAxisAccessor();
            var lastPointsData = this.datasets
                .map(function (d) {
                var datum = null;
                // filter out NaNs to ensure last point is a clean one
                var nonNanData = d.data().filter(function (x) { return !isNaN(accessor(x, -1, d)); });
                if (nonNanData.length > 0) {
                    var idx = nonNanData.length - 1;
                    datum = nonNanData[idx];
                    datum.name = d.metadata().name;
                    datum.relative = vz_chart_helpers.relativeAccessor(datum, -1, d);
                }
                return datum;
            })
                .filter(function (x) { return x != null; });
            this.lastPointsDataset.data(lastPointsData);
            if (this.markersScatterPlot) {
                this.markersScatterPlot.datasets(this.datasets.map(this.createSampledDatasetForMarkers));
            }
            // Take a dataset, return an array of NaN data points
            // the NaN points will have a "displayY" property which is the
            // y-value of a nearby point that was not NaN (0 if all points are NaN)
            var datasetToNaNData = function (d) {
                var displayY = null;
                var data = d.data();
                var i = 0;
                while (i < data.length && displayY == null) {
                    if (!isNaN(accessor(data[i], -1, d))) {
                        displayY = accessor(data[i], -1, d);
                    }
                    i++;
                }
                if (displayY == null) {
                    displayY = 0;
                }
                var nanData = [];
                for (i = 0; i < data.length; i++) {
                    if (!isNaN(accessor(data[i], -1, d))) {
                        displayY = accessor(data[i], -1, d);
                    }
                    else {
                        data[i].name = d.metadata().name;
                        data[i].displayY = displayY;
                        data[i].relative = vz_chart_helpers.relativeAccessor(data[i], -1, d);
                        nanData.push(data[i]);
                    }
                }
                return nanData;
            };
            var nanData = _.flatten(this.datasets.map(datasetToNaNData));
            this.nanDataset.data(nanData);
        };
        LineChart.prototype.resetDomain = function () {
            this.resetXDomain();
            this.resetYDomain();
        };
        LineChart.prototype.resetXDomain = function () {
            var xDomain;
            if (this._defaultXRange != null) {
                // Use the range specified by the caller.
                xDomain = this._defaultXRange;
            }
            else {
                // (Copied from vz_line_chart.DragZoomLayer.unzoom.)
                var xScale = this.xScale;
                xScale._domainMin = null;
                xScale._domainMax = null;
                xDomain = xScale._getExtent();
            }
            this.xScale.domain(xDomain);
        };
        LineChart.prototype.resetYDomain = function () {
            var yDomain;
            if (this._defaultYRange != null) {
                // Use the range specified by the caller.
                yDomain = this._defaultYRange;
            }
            else {
                // Generate a reasonable range.
                var accessors_1 = this.getAccessorsForComputingYRange();
                var datasetToValues = function (d) {
                    return accessors_1.map(function (accessor) { return d.data().map(function (x) { return accessor(x, -1, d); }); });
                };
                var vals = _.flattenDeep(this.datasets.map(datasetToValues))
                    .filter(isFinite);
                yDomain = vz_chart_helpers.computeDomain(vals, this._ignoreYOutliers);
            }
            this.yScale.domain(yDomain);
        };
        LineChart.prototype.getAccessorsForComputingYRange = function () {
            var accessors = [this.getYAxisAccessor()];
            if (this.fillArea) {
                // Make the Y domain take margins into account.
                accessors.push(this.fillArea.lowerAccessor, this.fillArea.higherAccessor);
            }
            return accessors;
        };
        LineChart.prototype.getYAxisAccessor = function () {
            return this.smoothingEnabled ? this.smoothedAccessor : this.yValueAccessor;
        };
        LineChart.prototype.createTooltipInteraction = function (dzl) {
            var _this = this;
            var pi = new Plottable.Interactions.Pointer();
            // Disable interaction while drag zooming.
            dzl.interactionStart(function () {
                pi.enabled(false);
                _this.hideTooltips();
            });
            dzl.interactionEnd(function () { return pi.enabled(true); });
            pi.onPointerMove(function (p) {
                // Line plot must be initialized to draw.
                if (!_this.linePlot)
                    return;
                window.cancelAnimationFrame(_this._tooltipUpdateAnimationFrame);
                _this._tooltipUpdateAnimationFrame = window.requestAnimationFrame(function () {
                    var target = {
                        x: p.x,
                        y: p.y,
                        datum: null,
                        dataset: null,
                    };
                    var bbox = _this.gridlines.content().node().getBBox();
                    // pts is the closets point to the tooltip for each dataset
                    var pts = _this.linePlot.datasets()
                        .map(function (dataset) { return _this.findClosestPoint(target, dataset); })
                        .filter(Boolean);
                    var intersectsBBox = Plottable.Utils.DOM.intersectsBBox;
                    // We draw tooltips for points that are NaN, or are currently visible
                    var ptsForTooltips = pts.filter(function (p) { return intersectsBBox(p.x, p.y, bbox) ||
                        isNaN(_this.yValueAccessor(p.datum, 0, p.dataset)); });
                    // Only draw little indicator circles for the non-NaN points
                    var ptsToCircle = ptsForTooltips.filter(function (p) { return !isNaN(_this.yValueAccessor(p.datum, 0, p.dataset)); });
                    if (pts.length !== 0) {
                        _this.scatterPlot.attr('display', 'none');
                        var ptsSelection = _this.tooltipPointsComponent.content().selectAll('.point').data(ptsToCircle, function (p) { return p.dataset.metadata().name; });
                        ptsSelection.enter().append('circle').classed('point', true);
                        ptsSelection.attr('r', vz_chart_helpers.TOOLTIP_CIRCLE_SIZE)
                            .attr('cx', function (p) { return p.x; })
                            .attr('cy', function (p) { return p.y; })
                            .style('stroke', 'none')
                            .attr('fill', function (p) { return _this.colorScale.scale(p.dataset.metadata().name); });
                        ptsSelection.exit().remove();
                        _this.drawTooltips(ptsForTooltips, target, _this.tooltipColumns);
                    }
                    else {
                        _this.hideTooltips();
                    }
                });
            });
            pi.onPointerExit(function () { return _this.hideTooltips(); });
            return pi;
        };
        LineChart.prototype.hideTooltips = function () {
            window.cancelAnimationFrame(this._tooltipUpdateAnimationFrame);
            window.cancelAnimationFrame(this._tooltipPositionAnimationFrame);
            this.tooltip.style('opacity', 0);
            this.scatterPlot.attr('display', 'block');
            this.tooltipPointsComponent.content().selectAll('.point').remove();
        };
        LineChart.prototype.setupTooltips = function (plot) {
            var _this = this;
            plot.onDetach(function () {
                _this.tooltipInteraction.detachFrom(plot);
                _this.tooltipInteraction.enabled(false);
            });
            plot.onAnchor(function () {
                _this.tooltipInteraction.attachTo(plot);
                _this.tooltipInteraction.enabled(true);
            });
        };
        LineChart.prototype.drawTooltips = function (points, target, tooltipColumns) {
            var _this = this;
            if (!points.length) {
                this.tooltip.style('opacity', 0);
                return;
            }
            // Formatters for value, step, and wall_time
            var valueFormatter = vz_chart_helpers.multiscaleFormatter(vz_chart_helpers.Y_TOOLTIP_FORMATTER_PRECISION);
            var dist = function (p) {
                return Math.pow(p.x - target.x, 2) + Math.pow(p.y - target.y, 2);
            };
            var closestDist = _.min(points.map(dist));
            var valueSortMethod = this.smoothingEnabled ?
                this.smoothedAccessor : this.yValueAccessor;
            if (this.tooltipSortingMethod === 'ascending') {
                points = _.sortBy(points, function (d) { return valueSortMethod(d.datum, -1, d.dataset); });
            }
            else if (this.tooltipSortingMethod === 'descending') {
                points = _.sortBy(points, function (d) { return valueSortMethod(d.datum, -1, d.dataset); })
                    .reverse();
            }
            else if (this.tooltipSortingMethod === 'nearest') {
                points = _.sortBy(points, dist);
            }
            else {
                // The 'default' sorting method maintains the order of names passed to
                // setVisibleSeries(). However we reverse that order when defining the
                // datasets. So we must call reverse again to restore the order.
                points = points.slice(0).reverse();
            }
            var self = this;
            var rows = this.tooltip.select('tbody')
                .selectAll('tr')
                .data(points, function (pt, _, __) {
                return pt.dataset.metadata().name;
            });
            rows.classed('distant', function (d) {
                // Grey out the point if any of the following are true:
                // - The cursor is outside of the x-extent of the dataset
                // - The point's y value is NaN
                var firstPoint = d.dataset.data()[0];
                var lastPoint = _.last(d.dataset.data());
                var firstX = _this.xScale.scale(_this.xAccessor(firstPoint, 0, d.dataset));
                var lastX = _this.xScale.scale(_this.xAccessor(lastPoint, 0, d.dataset));
                var s = _this.smoothingEnabled ?
                    d.datum.smoothed : _this.yValueAccessor(d.datum, 0, d.dataset);
                return target.x < firstX || target.x > lastX || isNaN(s);
            })
                .classed('closest', function (p) { return dist(p) === closestDist; })
                .each(function (point) {
                self.drawTooltipRow(this, tooltipColumns, point);
            })
                // reorders DOM to match the ordering of the `data`.
                .order();
            rows.exit().remove();
            rows.enter().append('tr').each(function (point) {
                self.drawTooltipRow(this, tooltipColumns, point);
            });
            // Because a tooltip content update is a DOM _mutation_, after an animation
            // frame, we update the position which is another read and mutation.
            window.cancelAnimationFrame(this._tooltipPositionAnimationFrame);
            this._tooltipPositionAnimationFrame = window.requestAnimationFrame(function () {
                _this.repositionTooltip();
            });
        };
        LineChart.prototype.drawTooltipRow = function (row, tooltipColumns, point) {
            var _a = this, smoothingEnabled = _a.smoothingEnabled, colorScale = _a.colorScale;
            var self = this;
            var swatchCol = {
                name: 'Swatch',
                evalType: TooltipColumnEvalType.DOM,
                evaluate: function (d) {
                    d3.select(this)
                        .select('span')
                        .style('background-color', function () { return colorScale.scale(d.dataset.metadata().name); });
                },
                enter: function (d) {
                    d3.select(this)
                        .append('span')
                        .classed('swatch', true)
                        .style('background-color', function () { return colorScale.scale(d.dataset.metadata().name); });
                },
            };
            var columns = d3.select(row).selectAll('td')
                .data([swatchCol].concat(tooltipColumns));
            columns.each(function (col) {
                // Skip column value update when the column is static.
                if (col.static)
                    return;
                self.drawTooltipColumn.call(self, this, col, point);
            });
            columns.enter()
                .append('td')
                .each(function (col) {
                if (col.enter)
                    col.enter.call(this, point);
                self.drawTooltipColumn.call(self, this, col, point);
            });
        };
        LineChart.prototype.drawTooltipColumn = function (column, tooltipCol, point) {
            var smoothingEnabled = this.smoothingEnabled;
            if (tooltipCol.evalType == TooltipColumnEvalType.DOM) {
                tooltipCol.evaluate.call(column, point, { smoothingEnabled: smoothingEnabled });
            }
            else {
                d3.select(column)
                    .text(tooltipCol.evaluate.call(column, point, { smoothingEnabled: smoothingEnabled }));
            }
        };
        /**
         * Repositions the tooltip based on new width and height of the bounding box.
         * In order to update the position, it _read_ the DOM, then _mutate_ the DOM.
         */
        LineChart.prototype.repositionTooltip = function () {
            // compute left position
            var documentWidth = document.body.clientWidth;
            var node = this.tooltip.node();
            var parentRect = node.parentElement.getBoundingClientRect();
            var nodeRect = node.getBoundingClientRect();
            // prevent it from falling off the right side of the screen
            var left = documentWidth - parentRect.left - nodeRect.width - 60, top = 0;
            if (this.tooltipPosition === 'right') {
                left = Math.min(parentRect.width, left);
            }
            else { // 'bottom'
                left = Math.min(0, left);
                top = parentRect.height + vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET;
            }
            this.tooltip.style('transform', "translate(" + left + "px, " + top + "px)");
            this.tooltip.style('opacity', 1);
        };
        LineChart.prototype.findClosestPoint = function (target, dataset) {
            var _this = this;
            var xPoints = dataset.data()
                .map(function (d, i) { return _this.xScale.scale(_this.xAccessor(d, i, dataset)); });
            var idx = _.sortedIndex(xPoints, target.x);
            if (xPoints.length == 0)
                return null;
            if (idx === xPoints.length) {
                idx = idx - 1;
            }
            else if (idx !== 0) {
                var prevDist = Math.abs(xPoints[idx - 1] - target.x);
                var nextDist = Math.abs(xPoints[idx] - target.x);
                idx = prevDist < nextDist ? idx - 1 : idx;
            }
            var datum = dataset.data()[idx];
            var y = this.smoothingEnabled ?
                this.smoothedAccessor(datum, idx, dataset) :
                this.yValueAccessor(datum, idx, dataset);
            return {
                x: xPoints[idx],
                y: this.yScale.scale(y),
                datum: datum,
                dataset: dataset,
            };
        };
        LineChart.prototype.resmoothDataset = function (dataset) {
            var _this = this;
            var data = dataset.data();
            var smoothingWeight = this.smoothingWeight;
            // 1st-order IIR low-pass filter to attenuate the higher-
            // frequency components of the time-series.
            var last = data.length > 0 ? 0 : NaN;
            var numAccum = 0;
            data.forEach(function (d, i) {
                var nextVal = _this.yValueAccessor(d, i, dataset);
                if (!_.isFinite(nextVal)) {
                    d.smoothed = nextVal;
                }
                else {
                    last = last * smoothingWeight + (1 - smoothingWeight) * nextVal;
                    numAccum++;
                    // The uncorrected moving average is biased towards the initial value.
                    // For example, if initialized with `0`, with smoothingWeight `s`, where
                    // every data point is `c`, after `t` steps the moving average is
                    // ```
                    //   EMA = 0*s^(t) + c*(1 - s)*s^(t-1) + c*(1 - s)*s^(t-2) + ...
                    //       = c*(1 - s^t)
                    // ```
                    // If initialized with `0`, dividing by (1 - s^t) is enough to debias
                    // the moving average. We count the number of finite data points and
                    // divide appropriately before storing the data.
                    var debiasWeight = 1;
                    if (smoothingWeight !== 1.0) {
                        debiasWeight = 1.0 - Math.pow(smoothingWeight, numAccum);
                    }
                    d.smoothed = last / debiasWeight;
                }
            });
        };
        LineChart.prototype.getDataset = function (name) {
            if (this.name2datasets[name] === undefined) {
                this.name2datasets[name] = new Plottable.Dataset([], {
                    name: name,
                    meta: null,
                });
            }
            return this.name2datasets[name];
        };
        LineChart.getYScaleFromType = function (yScaleType) {
            if (yScaleType === 'log') {
                return new Plottable.Scales.ModifiedLog();
            }
            else if (yScaleType === 'linear') {
                return new Plottable.Scales.Linear();
            }
            else {
                throw new Error('Unrecognized yScale type ' + yScaleType);
            }
        };
        /**
         * Update the selected series on the chart.
         */
        LineChart.prototype.setVisibleSeries = function (names) {
            var _this = this;
            names = names.sort();
            this.seriesNames = names;
            names.reverse(); // draw first series on top
            this.datasets.forEach(function (d) { return d.offUpdate(_this.onDatasetChanged); });
            this.datasets = names.map(function (r) { return _this.getDataset(r); });
            this.datasets.forEach(function (d) { return d.onUpdate(_this.onDatasetChanged); });
            this.linePlot.datasets(this.datasets);
            if (this.smoothingEnabled) {
                this.smoothLinePlot.datasets(this.datasets);
            }
            if (this.marginAreaPlot) {
                this.marginAreaPlot.datasets(this.datasets);
            }
            this.updateSpecialDatasets();
        };
        /**
         * Samples a dataset so that it contains no more than _MAX_MARKERS number of
         * data points. This function returns the original dataset if it does not
         * exceed that many points.
         */
        LineChart.prototype.createSampledDatasetForMarkers = function (original) {
            var originalData = original.data();
            if (originalData.length <= _MAX_MARKERS) {
                // This dataset is small enough. Do not sample.
                return original;
            }
            // Downsample the data. Otherwise, too many markers clutter the chart.
            var skipLength = Math.ceil(originalData.length / _MAX_MARKERS);
            var data = new Array(Math.floor(originalData.length / skipLength));
            for (var i = 0, j = 0; i < data.length; i++, j += skipLength) {
                data[i] = originalData[j];
            }
            return new Plottable.Dataset(data, original.metadata());
        };
        /**
         * Sets the data of a series on the chart.
         */
        LineChart.prototype.setSeriesData = function (name, data) {
            this.getDataset(name).data(data);
        };
        /**
         * Sets the metadata of a series on the chart.
         */
        LineChart.prototype.setSeriesMetadata = function (name, meta) {
            var newMeta = Object.assign({}, this.getDataset(name).metadata(), { meta: meta });
            this.getDataset(name).metadata(newMeta);
        };
        LineChart.prototype.smoothingUpdate = function (weight) {
            var _this = this;
            this.smoothingWeight = weight;
            this.datasets.forEach(function (d) { return _this.resmoothDataset(d); });
            if (!this.smoothingEnabled) {
                this.linePlot.addClass('ghost');
                this.scatterPlot.y(this.smoothedAccessor, this.yScale);
                this.smoothingEnabled = true;
                this.smoothLinePlot.datasets(this.datasets);
            }
            if (this.markersScatterPlot) {
                // Use the correct accessor for marker positioning.
                this.markersScatterPlot.y(this.getYAxisAccessor(), this.yScale);
            }
            this.updateSpecialDatasets();
        };
        LineChart.prototype.smoothingDisable = function () {
            if (this.smoothingEnabled) {
                this.linePlot.removeClass('ghost');
                this.scatterPlot.y(this.yValueAccessor, this.yScale);
                this.smoothLinePlot.datasets([]);
                this.smoothingEnabled = false;
                this.updateSpecialDatasets();
            }
            if (this.markersScatterPlot) {
                // Use the correct accessor (which depends on whether smoothing is
                // enabled) for marker positioning.
                this.markersScatterPlot.y(this.getYAxisAccessor(), this.yScale);
            }
        };
        LineChart.prototype.setTooltipSortingMethod = function (method) {
            this.tooltipSortingMethod = method;
        };
        LineChart.prototype.setTooltipPosition = function (position) {
            this.tooltipPosition = position;
        };
        LineChart.prototype.renderTo = function (targetSVG) {
            this.targetSVG = targetSVG;
            this.outer.renderTo(targetSVG);
            if (this._defaultXRange != null) {
                // A higher-level component provided a default range for the X axis.
                // Start with that range.
                this.resetXDomain();
            }
            if (this._defaultYRange != null) {
                // A higher-level component provided a default range for the Y axis.
                // Start with that range.
                this.resetYDomain();
            }
        };
        LineChart.prototype.redraw = function () {
            this.outer.redraw();
        };
        LineChart.prototype.destroy = function () {
            // Destroying outer destroys all subcomponents recursively.
            if (this.outer)
                this.outer.destroy();
        };
        return LineChart;
    }());
    vz_line_chart2.LineChart = LineChart;
})(vz_line_chart2 || (vz_line_chart2 = {})); // namespace vz_line_chart2
