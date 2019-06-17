/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
/* Defines the InteractionManager class and related classes.
   This is the main entry point to the parallel coordinates implementation.
*/
var tf;
(function (tf) {
    var hparams;
    (function (hparams) {
        var parallel_coords_plot;
        (function (parallel_coords_plot) {
            /**
             * Stores some global properties such as width and height of the SVG element
             * used for rendering the parallel coordinates plot. Also contains the top-level
             * DOM <g> element underwhich the plot will be rendered.
             */
            var SVGProperties = /** @class */ (function () {
                /**
                 * Computes the width and height of the SVG element based on the number of
                 * columns in the schema. Adds some margins and adds a top-level <g> element
                 * underwhich the plot should be rendered.
                 */
                function SVGProperties(svg, numColumns) {
                    // We use the following algorithm for laying out our SVG:
                    // We compute a minimum size for the SVG based on the number columns
                    // and some margins. We set the svg "width" and "height" styles
                    // to "100%" so that it takes up the full area of its parent, but use
                    // "min-width" and "min-height", so that if the parent is too small
                    // the svg won't shrink down (it will overflow with scroll bars).
                    // If the parent is larger than the minimum size, we use the its
                    // preserveAspectRatio attr to scale the contents to fit the larger
                    // size.
                    this.svg = d3.select(svg);
                    var margin = { top: 30, right: 10, bottom: 10, left: 10 };
                    var COL_WIDTH = 100;
                    var COL_HEIGHT = 200;
                    var totalWidth = numColumns * COL_WIDTH + margin.left + margin.right;
                    var totalHeight = COL_HEIGHT + margin.top + margin.bottom;
                    this.svg.attr("viewBox", "0 0 " + totalWidth + " " + totalHeight);
                    this.svg.attr("preserveAspectRatio", "xMidYMid");
                    // Set a minimum width so scale factor want be less than 1
                    // (but if size of '#container' is larger then we'll scale up
                    // our svg).
                    this.svg.style("min-width", totalWidth + "px");
                    this.svg.style("min-height", totalHeight + "px");
                    // 'width' and 'height' store the width of the svg without our margins.
                    this.width = totalWidth - margin.left - margin.right;
                    this.height = totalHeight - margin.top - margin.bottom;
                    this.svgG = this.svg
                        .append("g")
                        .attr("transform", tf.hparams.utils.translateStr(margin.left, margin.top));
                }
                return SVGProperties;
            }());
            parallel_coords_plot.SVGProperties = SVGProperties;
            /**
             * Orchastrates the behavior of the parallel coordinates plot. This is the
             * class that consumers of this module should use.
             * Usage example:
             *    manager = new InteractionManager(svgProps, schema, peakedSessionChangedCB,
             *                                     selectedSessionChangedCB);
             *    ...
             *    // Notify manager of new options or session groups:
             *    manager.onOptionsOrSessionGroupsChanged(newOptions, newSessionGroups)
             *    ...
             *    // This will be called when peaked session changed:
             *    function peakedSessionChangedCB(newSessionGroup) {
             *      // Do something with the newSessionGroup.
             *    }
             */
            var InteractionManager = /** @class */ (function () {
                function InteractionManager(svgProps, schema, peakedSessionGroupChangedCallback, selectedSessionChangedCallback) {
                    var _this = this;
                    this._svgProps = svgProps;
                    this._schema = schema;
                    this._peakedSessionGroupChangedCB = peakedSessionGroupChangedCallback;
                    this._selectedSessionGroupChangedCB = selectedSessionChangedCallback;
                    this._axesCollection = new parallel_coords_plot.AxesCollection(svgProps, schema, 
                    /*interactionManager=*/ this);
                    this._linesCollection = new parallel_coords_plot.LinesCollection(svgProps, schema, this._axesCollection);
                    this._svgProps.svg
                        .on("click", function () { return _this.onClick(); })
                        .on("mousemove mouseenter", function () {
                        var _a = d3.mouse(_this._svgProps.svgG.node()), x = _a[0], y = _a[1];
                        _this.onMouseMoved(x, y);
                    })
                        .on("mouseleave", function () { return _this.onMouseLeave(); });
                }
                InteractionManager.prototype.onDragStart = function (colIndex) {
                    this._axesCollection.dragStart(colIndex);
                    this._linesCollection.hideBackgroundLines();
                };
                InteractionManager.prototype.onDrag = function (newX) {
                    this._axesCollection.drag(newX);
                    this._linesCollection.recomputeControlPoints(parallel_coords_plot.LineType.FOREGROUND);
                };
                InteractionManager.prototype.onDragEnd = function () {
                    var _this = this;
                    this._axesCollection.dragEnd(/*transitionDuration=*/ 500);
                    this._linesCollection.recomputeControlPoints(parallel_coords_plot.LineType.FOREGROUND, /* transitionDuration=*/ 500);
                    window.setTimeout(function () {
                        _this._linesCollection.recomputeControlPoints(parallel_coords_plot.LineType.BACKGROUND);
                        _this._linesCollection.showBackgroundLines();
                    }, 500);
                };
                InteractionManager.prototype.onBrushChanged = function (colIndex, newBrushSelection) {
                    this._axesCollection.getAxisForColIndex(colIndex).setBrushSelection(newBrushSelection);
                    this._linesCollection.recomputeForegroundLinesVisibility();
                };
                InteractionManager.prototype.onMouseMoved = function (newX, newY) {
                    this._linesCollection.updatePeakedSessionGroup(this._linesCollection.findClosestSessionGroup(newX, newY));
                    this._peakedSessionGroupChangedCB(this._linesCollection.peakedSessionGroupHandle().sessionGroup());
                };
                InteractionManager.prototype.onMouseLeave = function () {
                    if (!this._linesCollection.peakedSessionGroupHandle().isNull()) {
                        this._linesCollection.clearPeakedSessionGroup();
                        this._peakedSessionGroupChangedCB(null);
                    }
                };
                InteractionManager.prototype.onClick = function () {
                    if (this._linesCollection.peakedSessionGroupHandle().sessionGroup() ===
                        this._linesCollection.selectedSessionGroupHandle().sessionGroup()) {
                        /* If the selected session group is the same as the "peaked" one,
                           clear the selection. */
                        this._linesCollection.updateSelectedSessionGroup(new parallel_coords_plot.SessionGroupHandle());
                    }
                    else {
                        this._linesCollection.updateSelectedSessionGroup(this._linesCollection.peakedSessionGroupHandle());
                    }
                    this._selectedSessionGroupChangedCB(this._linesCollection.selectedSessionGroupHandle().sessionGroup());
                };
                InteractionManager.prototype.onOptionsOrSessionGroupsChanged = function (newOptions, newSessionGroups) {
                    this._axesCollection.updateAxes(newOptions, newSessionGroups);
                    var oldPeakedSessionGroupHandle = this._linesCollection.peakedSessionGroupHandle();
                    var oldSelectedSessionGroupHandle = this._linesCollection.selectedSessionGroupHandle();
                    this._linesCollection.redraw(newSessionGroups, newOptions.colorByColumnIndex !== undefined
                        ? newOptions.columns[newOptions.colorByColumnIndex].absoluteIndex
                        : null, newOptions.minColor, newOptions.maxColor);
                    // A redraw may change the selected / peaked session group. So call the
                    // apropriate callbacks if needed.
                    if (!oldPeakedSessionGroupHandle.equalsTo(this._linesCollection.peakedSessionGroupHandle())) {
                        this._peakedSessionGroupChangedCB(this._linesCollection.peakedSessionGroupHandle().sessionGroup());
                    }
                    if (!oldSelectedSessionGroupHandle.equalsTo(this._linesCollection.selectedSessionGroupHandle())) {
                        this._selectedSessionGroupChangedCB(this._linesCollection.selectedSessionGroupHandle().sessionGroup());
                    }
                };
                InteractionManager.prototype.schema = function () {
                    return this._schema;
                };
                return InteractionManager;
            }());
            parallel_coords_plot.InteractionManager = InteractionManager;
            ;
        })(parallel_coords_plot = hparams.parallel_coords_plot || (hparams.parallel_coords_plot = {}));
    })(hparams = tf.hparams || (tf.hparams = {}));
})(tf || (tf = {})); // namespace tf.hparams.parallel_coords_plot
