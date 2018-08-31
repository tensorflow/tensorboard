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
var vz_chart_helpers;
(function (vz_chart_helpers) {
    /**
     * A list of symbols that line charts can cycle through per data series.
     */
    vz_chart_helpers.SYMBOLS_LIST = [
        {
            character: '\u25FC',
            method: Plottable.SymbolFactories.square,
        },
        {
            character: '\u25c6',
            method: Plottable.SymbolFactories.diamond,
        },
        {
            character: '\u25B2',
            method: Plottable.SymbolFactories.triangle,
        },
        {
            character: '\u2605',
            method: Plottable.SymbolFactories.star,
        },
        {
            character: '\u271a',
            method: Plottable.SymbolFactories.cross,
        },
    ];
    /** X axis choices for TensorBoard charts. */
    var XType;
    (function (XType) {
        /** Linear scale using the "step" property of the datum. */
        XType["STEP"] = "step";
        /** Temporal scale using the "wall_time" property of the datum. */
        XType["RELATIVE"] = "relative";
        /**
         * Temporal scale using the "relative" property of the datum if it is present
         * or calculating from "wall_time" if it isn't.
         */
        XType["WALL_TIME"] = "wall_time";
    })(XType = vz_chart_helpers.XType || (vz_chart_helpers.XType = {}));
    vz_chart_helpers.Y_TOOLTIP_FORMATTER_PRECISION = 4;
    vz_chart_helpers.STEP_FORMATTER_PRECISION = 4;
    vz_chart_helpers.Y_AXIS_FORMATTER_PRECISION = 3;
    vz_chart_helpers.TOOLTIP_Y_PIXEL_OFFSET = 20;
    vz_chart_helpers.TOOLTIP_CIRCLE_SIZE = 4;
    vz_chart_helpers.NAN_SYMBOL_SIZE = 6;
    /* Create a formatter function that will switch between exponential and
     * regular display depending on the scale of the number being formatted,
     * and show `digits` significant digits.
     */
    function multiscaleFormatter(digits) {
        return function (v) {
            var absv = Math.abs(v);
            if (absv < 1E-15) {
                // Sometimes zero-like values get an annoying representation
                absv = 0;
            }
            var f;
            if (absv >= 1E4) {
                f = d3.format('.' + digits + 'e');
            }
            else if (absv > 0 && absv < 0.01) {
                f = d3.format('.' + digits + 'e');
            }
            else {
                f = d3.format('.' + digits + 'g');
            }
            return f(v);
        };
    }
    vz_chart_helpers.multiscaleFormatter = multiscaleFormatter;
    /* Compute an appropriate domain given an array of all the values that are
     * going to be displayed. If ignoreOutliers is true, it will ignore the
     * lowest 10% and highest 10% of the data when computing a domain.
     * It has n log n performance when ignoreOutliers is true, as it needs to
     * sort the data.
     */
    function computeDomain(values, ignoreOutliers) {
        // Don't include infinities and NaNs in the domain computation.
        values = values.filter(function (z) { return isFinite(z); });
        if (values.length === 0) {
            return [-0.1, 1.1];
        }
        var a;
        var b;
        if (ignoreOutliers) {
            var sorted = _.sortBy(values);
            a = d3.quantile(sorted, 0.05);
            b = d3.quantile(sorted, 0.95);
        }
        else {
            a = d3.min(values);
            b = d3.max(values);
        }
        var padding;
        var span = b - a;
        if (span === 0) {
            // If b===a, we would create an empty range. We instead select the range
            // [0, 2*a] if a > 0, or [-2*a, 0] if a < 0, plus a little bit of
            // extra padding on the top and bottom of the plot.
            padding = Math.abs(a) * 1.1 + 1.1;
        }
        else {
            padding = span * 0.2;
        }
        var lower;
        if (a >= 0 && a < span) {
            // We include the intercept (y = 0) if doing so less than doubles the span
            // of the y-axis. (We actually select a lower bound that's slightly less
            // than 0 so that 0.00 will clearly be written on the lower edge of the
            // chart. The label on the lowest tick is often filtered out.)
            lower = -0.1 * b;
        }
        else {
            lower = a - padding;
        }
        var domain = [lower, b + padding];
        domain = d3.scaleLinear().domain(domain).nice().domain();
        return domain;
    }
    vz_chart_helpers.computeDomain = computeDomain;
    function accessorize(key) {
        // tslint:disable-next-line:no-any be quiet tsc
        return function (d, index, dataset) { return d[key]; };
    }
    vz_chart_helpers.accessorize = accessorize;
    vz_chart_helpers.stepFormatter = Plottable.Formatters.siSuffix(vz_chart_helpers.STEP_FORMATTER_PRECISION);
    function stepX() {
        var scale = new Plottable.Scales.Linear();
        scale.tickGenerator(Plottable.Scales.TickGenerators.integerTickGenerator());
        var axis = new Plottable.Axes.Numeric(scale, 'bottom');
        axis.formatter(vz_chart_helpers.stepFormatter);
        return {
            scale: scale,
            axis: axis,
            accessor: function (d) { return d.step; },
        };
    }
    vz_chart_helpers.stepX = stepX;
    vz_chart_helpers.timeFormatter = Plottable.Formatters.time('%a %b %e, %H:%M:%S');
    function wallX() {
        var scale = new Plottable.Scales.Time();
        return {
            scale: scale,
            axis: new Plottable.Axes.Time(scale, 'bottom'),
            accessor: function (d) { return d.wall_time; },
        };
    }
    vz_chart_helpers.wallX = wallX;
    vz_chart_helpers.relativeAccessor = 
    // tslint:disable-next-line:no-any be quiet tsc
    function (d, index, dataset) {
        // We may be rendering the final-point datum for scatterplot.
        // If so, we will have already provided the 'relative' property
        if (d.relative != null) {
            return d.relative;
        }
        var data = dataset.data();
        // I can't imagine how this function would be called when the data is
        // empty (after all, it iterates over the data), but lets guard just
        // to be safe.
        var first = data.length > 0 ? +data[0].wall_time : 0;
        return (+d.wall_time - first) / (60 * 60 * 1000); // ms to hours
    };
    vz_chart_helpers.relativeFormatter = function (n) {
        // we will always show 2 units of precision, e.g days and hours, or
        // minutes and seconds, but not hours and minutes and seconds
        var ret = '';
        var days = Math.floor(n / 24);
        n -= (days * 24);
        if (days) {
            ret += days + 'd ';
        }
        var hours = Math.floor(n);
        n -= hours;
        n *= 60;
        if (hours || days) {
            ret += hours + 'h ';
        }
        var minutes = Math.floor(n);
        n -= minutes;
        n *= 60;
        if (minutes || hours || days) {
            ret += minutes + 'm ';
        }
        var seconds = Math.floor(n);
        return ret + seconds + 's';
    };
    function relativeX() {
        var scale = new Plottable.Scales.Linear();
        return {
            scale: scale,
            axis: new Plottable.Axes.Numeric(scale, 'bottom'),
            accessor: vz_chart_helpers.relativeAccessor,
        };
    }
    vz_chart_helpers.relativeX = relativeX;
    function getXComponents(xType) {
        switch (xType) {
            case XType.STEP:
                return stepX();
            case XType.WALL_TIME:
                return wallX();
            case XType.RELATIVE:
                return relativeX();
            default:
                throw new Error('invalid xType: ' + xType);
        }
    }
    vz_chart_helpers.getXComponents = getXComponents;
})(vz_chart_helpers || (vz_chart_helpers = {})); // namespace vz_chart_helpers
