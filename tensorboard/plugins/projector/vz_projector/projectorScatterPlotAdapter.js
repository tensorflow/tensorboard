/* Copyright 2016 The TensorFlow Authors. All Rights Reserved.

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
var vz_projector;
(function (vz_projector) {
    var LABEL_FONT_SIZE = 10;
    var LABEL_SCALE_DEFAULT = 1.0;
    var LABEL_SCALE_LARGE = 2;
    var LABEL_FILL_COLOR_SELECTED = 0x000000;
    var LABEL_FILL_COLOR_HOVER = 0x000000;
    var LABEL_FILL_COLOR_NEIGHBOR = 0x000000;
    var LABEL_STROKE_COLOR_SELECTED = 0xFFFFFF;
    var LABEL_STROKE_COLOR_HOVER = 0xFFFFFF;
    var LABEL_STROKE_COLOR_NEIGHBOR = 0xFFFFFF;
    var POINT_COLOR_UNSELECTED = 0xE3E3E3;
    var POINT_COLOR_NO_SELECTION = 0x7575D9;
    var POINT_COLOR_SELECTED = 0xFA6666;
    var POINT_COLOR_HOVER = 0x760B4F;
    var POINT_SCALE_DEFAULT = 1.0;
    var POINT_SCALE_SELECTED = 1.2;
    var POINT_SCALE_NEIGHBOR = 1.2;
    var POINT_SCALE_HOVER = 1.2;
    var LABELS_3D_COLOR_UNSELECTED = 0xFFFFFF;
    var LABELS_3D_COLOR_NO_SELECTION = 0xFFFFFF;
    var SPRITE_IMAGE_COLOR_UNSELECTED = 0xFFFFFF;
    var SPRITE_IMAGE_COLOR_NO_SELECTION = 0xFFFFFF;
    var POLYLINE_START_HUE = 60;
    var POLYLINE_END_HUE = 360;
    var POLYLINE_SATURATION = 1;
    var POLYLINE_LIGHTNESS = .3;
    var POLYLINE_DEFAULT_OPACITY = .2;
    var POLYLINE_DEFAULT_LINEWIDTH = 2;
    var POLYLINE_SELECTED_OPACITY = .9;
    var POLYLINE_SELECTED_LINEWIDTH = 3;
    var POLYLINE_DESELECTED_OPACITY = .05;
    var SCATTER_PLOT_CUBE_LENGTH = 2;
    /** Color scale for nearest neighbors. */
    var NN_COLOR_SCALE = d3.scaleLinear()
        .domain([1, 0.7, 0.4])
        .range(['hsl(285, 80%, 40%)', 'hsl(0, 80%, 65%)', 'hsl(40, 70%, 60%)'])
        .clamp(true);
    /**
     * Interprets projector events and assembes the arrays and commands necessary
     * to use the ScatterPlot to render the current projected data set.
     */
    var ProjectorScatterPlotAdapter = /** @class */ (function () {
        function ProjectorScatterPlotAdapter(scatterPlotContainer, projectorEventContext) {
            var _this = this;
            this.scatterPlotContainer = scatterPlotContainer;
            this.renderLabelsIn3D = false;
            this.scatterPlot =
                new vz_projector.ScatterPlot(scatterPlotContainer, projectorEventContext);
            projectorEventContext.registerProjectionChangedListener(function (projection) {
                _this.projection = projection;
                _this.updateScatterPlotWithNewProjection(projection);
            });
            projectorEventContext.registerSelectionChangedListener(function (selectedPointIndices, neighbors) {
                _this.selectedPointIndices = selectedPointIndices;
                _this.neighborsOfFirstSelectedPoint = neighbors;
                _this.updateScatterPlotPositions();
                _this.updateScatterPlotAttributes();
                _this.scatterPlot.render();
            });
            projectorEventContext.registerHoverListener(function (hoverPointIndex) {
                _this.hoverPointIndex = hoverPointIndex;
                _this.updateScatterPlotAttributes();
                _this.scatterPlot.render();
            });
            projectorEventContext.registerDistanceMetricChangedListener(function (distanceMetric) {
                _this.distanceMetric = distanceMetric;
                _this.updateScatterPlotAttributes();
                _this.scatterPlot.render();
            });
            this.createVisualizers(false);
        }
        ProjectorScatterPlotAdapter.prototype.notifyProjectionPositionsUpdated = function () {
            this.updateScatterPlotPositions();
            this.scatterPlot.render();
        };
        ProjectorScatterPlotAdapter.prototype.setDataSet = function (dataSet) {
            if (this.projection != null) {
                // TODO(@charlesnicholson): setDataSet needs to go away, the projection is the
                // atomic unit of update.
                this.projection.dataSet = dataSet;
            }
            if (this.polylineVisualizer != null) {
                this.polylineVisualizer.setDataSet(dataSet);
            }
            if (this.labels3DVisualizer != null) {
                this.labels3DVisualizer.setLabelStrings(this.generate3DLabelsArray(dataSet, this.labelPointAccessor));
            }
            if (this.spriteVisualizer == null) {
                return;
            }
            this.spriteVisualizer.clearSpriteAtlas();
            if ((dataSet == null) || (dataSet.spriteAndMetadataInfo == null)) {
                return;
            }
            var metadata = dataSet.spriteAndMetadataInfo;
            if ((metadata.spriteImage == null) || (metadata.spriteMetadata == null)) {
                return;
            }
            var n = dataSet.points.length;
            var spriteIndices = new Float32Array(n);
            for (var i = 0; i < n; ++i) {
                spriteIndices[i] = dataSet.points[i].index;
            }
            this.spriteVisualizer.setSpriteAtlas(metadata.spriteImage, metadata.spriteMetadata.singleImageDim, spriteIndices);
        };
        ProjectorScatterPlotAdapter.prototype.set3DLabelMode = function (renderLabelsIn3D) {
            this.renderLabelsIn3D = renderLabelsIn3D;
            this.createVisualizers(renderLabelsIn3D);
            this.updateScatterPlotAttributes();
            this.scatterPlot.render();
        };
        ProjectorScatterPlotAdapter.prototype.setLegendPointColorer = function (legendPointColorer) {
            this.legendPointColorer = legendPointColorer;
        };
        ProjectorScatterPlotAdapter.prototype.setLabelPointAccessor = function (labelPointAccessor) {
            this.labelPointAccessor = labelPointAccessor;
            if (this.labels3DVisualizer != null) {
                var ds = (this.projection == null) ? null : this.projection.dataSet;
                this.labels3DVisualizer.setLabelStrings(this.generate3DLabelsArray(ds, labelPointAccessor));
            }
        };
        ProjectorScatterPlotAdapter.prototype.resize = function () {
            this.scatterPlot.resize();
        };
        ProjectorScatterPlotAdapter.prototype.populateBookmarkFromUI = function (state) {
            state.cameraDef = this.scatterPlot.getCameraDef();
        };
        ProjectorScatterPlotAdapter.prototype.restoreUIFromBookmark = function (state) {
            this.scatterPlot.setCameraParametersForNextCameraCreation(state.cameraDef, false);
        };
        ProjectorScatterPlotAdapter.prototype.updateScatterPlotPositions = function () {
            var ds = (this.projection == null) ? null : this.projection.dataSet;
            var projectionComponents = (this.projection == null) ? null : this.projection.projectionComponents;
            var newPositions = this.generatePointPositionArray(ds, projectionComponents);
            this.scatterPlot.setPointPositions(newPositions);
        };
        ProjectorScatterPlotAdapter.prototype.updateScatterPlotAttributes = function () {
            if (this.projection == null) {
                return;
            }
            var dataSet = this.projection.dataSet;
            var selectedSet = this.selectedPointIndices;
            var hoverIndex = this.hoverPointIndex;
            var neighbors = this.neighborsOfFirstSelectedPoint;
            var pointColorer = this.legendPointColorer;
            var pointColors = this.generatePointColorArray(dataSet, pointColorer, this.distanceMetric, selectedSet, neighbors, hoverIndex, this.renderLabelsIn3D, this.getSpriteImageMode());
            var pointScaleFactors = this.generatePointScaleFactorArray(dataSet, selectedSet, neighbors, hoverIndex);
            var labels = this.generateVisibleLabelRenderParams(dataSet, selectedSet, neighbors, hoverIndex);
            var polylineColors = this.generateLineSegmentColorMap(dataSet, pointColorer);
            var polylineOpacities = this.generateLineSegmentOpacityArray(dataSet, selectedSet);
            var polylineWidths = this.generateLineSegmentWidthArray(dataSet, selectedSet);
            this.scatterPlot.setPointColors(pointColors);
            this.scatterPlot.setPointScaleFactors(pointScaleFactors);
            this.scatterPlot.setLabels(labels);
            this.scatterPlot.setPolylineColors(polylineColors);
            this.scatterPlot.setPolylineOpacities(polylineOpacities);
            this.scatterPlot.setPolylineWidths(polylineWidths);
        };
        ProjectorScatterPlotAdapter.prototype.render = function () {
            this.scatterPlot.render();
        };
        ProjectorScatterPlotAdapter.prototype.generatePointPositionArray = function (ds, projectionComponents) {
            if (ds == null) {
                return null;
            }
            var xScaler = d3.scaleLinear();
            var yScaler = d3.scaleLinear();
            var zScaler = null;
            {
                // Determine max and min of each axis of our data.
                var xExtent = d3.extent(ds.points, function (p, i) { return ds.points[i].projections[projectionComponents[0]]; });
                var yExtent = d3.extent(ds.points, function (p, i) { return ds.points[i].projections[projectionComponents[1]]; });
                var range = [-SCATTER_PLOT_CUBE_LENGTH / 2, SCATTER_PLOT_CUBE_LENGTH / 2];
                xScaler.domain(xExtent).range(range);
                yScaler.domain(yExtent).range(range);
                if (projectionComponents[2] != null) {
                    var zExtent = d3.extent(ds.points, function (p, i) { return ds.points[i].projections[projectionComponents[2]]; });
                    zScaler = d3.scaleLinear();
                    zScaler.domain(zExtent).range(range);
                }
            }
            var positions = new Float32Array(ds.points.length * 3);
            var dst = 0;
            ds.points.forEach(function (d, i) {
                positions[dst++] =
                    xScaler(ds.points[i].projections[projectionComponents[0]]);
                positions[dst++] =
                    yScaler(ds.points[i].projections[projectionComponents[1]]);
                positions[dst++] = 0.0;
            });
            if (zScaler) {
                dst = 2;
                ds.points.forEach(function (d, i) {
                    positions[dst] =
                        zScaler(ds.points[i].projections[projectionComponents[2]]);
                    dst += 3;
                });
            }
            return positions;
        };
        ProjectorScatterPlotAdapter.prototype.generateVisibleLabelRenderParams = function (ds, selectedPointIndices, neighborsOfFirstPoint, hoverPointIndex) {
            if (ds == null) {
                return null;
            }
            var selectedPointCount = (selectedPointIndices == null) ? 0 : selectedPointIndices.length;
            var neighborCount = (neighborsOfFirstPoint == null) ? 0 : neighborsOfFirstPoint.length;
            var n = selectedPointCount + neighborCount +
                ((hoverPointIndex != null) ? 1 : 0);
            var visibleLabels = new Uint32Array(n);
            var scale = new Float32Array(n);
            var opacityFlags = new Int8Array(n);
            var fillColors = new Uint8Array(n * 3);
            var strokeColors = new Uint8Array(n * 3);
            var labelStrings = [];
            scale.fill(LABEL_SCALE_DEFAULT);
            opacityFlags.fill(1);
            var dst = 0;
            if (hoverPointIndex != null) {
                labelStrings.push(this.getLabelText(ds, hoverPointIndex, this.labelPointAccessor));
                visibleLabels[dst] = hoverPointIndex;
                scale[dst] = LABEL_SCALE_LARGE;
                opacityFlags[dst] = 0;
                var fillRgb = styleRgbFromHexColor(LABEL_FILL_COLOR_HOVER);
                packRgbIntoUint8Array(fillColors, dst, fillRgb[0], fillRgb[1], fillRgb[2]);
                var strokeRgb = styleRgbFromHexColor(LABEL_STROKE_COLOR_HOVER);
                packRgbIntoUint8Array(strokeColors, dst, strokeRgb[0], strokeRgb[1], strokeRgb[1]);
                ++dst;
            }
            // Selected points
            {
                var n_1 = selectedPointCount;
                var fillRgb = styleRgbFromHexColor(LABEL_FILL_COLOR_SELECTED);
                var strokeRgb = styleRgbFromHexColor(LABEL_STROKE_COLOR_SELECTED);
                for (var i = 0; i < n_1; ++i) {
                    var labelIndex = selectedPointIndices[i];
                    labelStrings.push(this.getLabelText(ds, labelIndex, this.labelPointAccessor));
                    visibleLabels[dst] = labelIndex;
                    scale[dst] = LABEL_SCALE_LARGE;
                    opacityFlags[dst] = (n_1 === 1) ? 0 : 1;
                    packRgbIntoUint8Array(fillColors, dst, fillRgb[0], fillRgb[1], fillRgb[2]);
                    packRgbIntoUint8Array(strokeColors, dst, strokeRgb[0], strokeRgb[1], strokeRgb[2]);
                    ++dst;
                }
            }
            // Neighbors
            {
                var n_2 = neighborCount;
                var fillRgb = styleRgbFromHexColor(LABEL_FILL_COLOR_NEIGHBOR);
                var strokeRgb = styleRgbFromHexColor(LABEL_STROKE_COLOR_NEIGHBOR);
                for (var i = 0; i < n_2; ++i) {
                    var labelIndex = neighborsOfFirstPoint[i].index;
                    labelStrings.push(this.getLabelText(ds, labelIndex, this.labelPointAccessor));
                    visibleLabels[dst] = labelIndex;
                    packRgbIntoUint8Array(fillColors, dst, fillRgb[0], fillRgb[1], fillRgb[2]);
                    packRgbIntoUint8Array(strokeColors, dst, strokeRgb[0], strokeRgb[1], strokeRgb[2]);
                    ++dst;
                }
            }
            return new vz_projector.LabelRenderParams(new Float32Array(visibleLabels), labelStrings, scale, opacityFlags, LABEL_FONT_SIZE, fillColors, strokeColors);
        };
        ProjectorScatterPlotAdapter.prototype.generatePointScaleFactorArray = function (ds, selectedPointIndices, neighborsOfFirstPoint, hoverPointIndex) {
            if (ds == null) {
                return new Float32Array(0);
            }
            var scale = new Float32Array(ds.points.length);
            scale.fill(POINT_SCALE_DEFAULT);
            var selectedPointCount = (selectedPointIndices == null) ? 0 : selectedPointIndices.length;
            var neighborCount = (neighborsOfFirstPoint == null) ? 0 : neighborsOfFirstPoint.length;
            // Scale up all selected points.
            {
                var n = selectedPointCount;
                for (var i = 0; i < n; ++i) {
                    var p = selectedPointIndices[i];
                    scale[p] = POINT_SCALE_SELECTED;
                }
            }
            // Scale up the neighbor points.
            {
                var n = neighborCount;
                for (var i = 0; i < n; ++i) {
                    var p = neighborsOfFirstPoint[i].index;
                    scale[p] = POINT_SCALE_NEIGHBOR;
                }
            }
            // Scale up the hover point.
            if (hoverPointIndex != null) {
                scale[hoverPointIndex] = POINT_SCALE_HOVER;
            }
            return scale;
        };
        ProjectorScatterPlotAdapter.prototype.generateLineSegmentColorMap = function (ds, legendPointColorer) {
            var polylineColorArrayMap = {};
            if (ds == null) {
                return polylineColorArrayMap;
            }
            for (var i = 0; i < ds.sequences.length; i++) {
                var sequence = ds.sequences[i];
                var colors = new Float32Array(2 * (sequence.pointIndices.length - 1) * 3);
                var colorIndex = 0;
                if (legendPointColorer) {
                    for (var j = 0; j < sequence.pointIndices.length - 1; j++) {
                        var c1 = new THREE.Color(legendPointColorer(ds, sequence.pointIndices[j]));
                        var c2 = new THREE.Color(legendPointColorer(ds, sequence.pointIndices[j + 1]));
                        colors[colorIndex++] = c1.r;
                        colors[colorIndex++] = c1.g;
                        colors[colorIndex++] = c1.b;
                        colors[colorIndex++] = c2.r;
                        colors[colorIndex++] = c2.g;
                        colors[colorIndex++] = c2.b;
                    }
                }
                else {
                    for (var j = 0; j < sequence.pointIndices.length - 1; j++) {
                        var c1 = getDefaultPointInPolylineColor(j, sequence.pointIndices.length);
                        var c2 = getDefaultPointInPolylineColor(j + 1, sequence.pointIndices.length);
                        colors[colorIndex++] = c1.r;
                        colors[colorIndex++] = c1.g;
                        colors[colorIndex++] = c1.b;
                        colors[colorIndex++] = c2.r;
                        colors[colorIndex++] = c2.g;
                        colors[colorIndex++] = c2.b;
                    }
                }
                polylineColorArrayMap[i] = colors;
            }
            return polylineColorArrayMap;
        };
        ProjectorScatterPlotAdapter.prototype.generateLineSegmentOpacityArray = function (ds, selectedPoints) {
            if (ds == null) {
                return new Float32Array(0);
            }
            var opacities = new Float32Array(ds.sequences.length);
            var selectedPointCount = (selectedPoints == null) ? 0 : selectedPoints.length;
            if (selectedPointCount > 0) {
                opacities.fill(POLYLINE_DESELECTED_OPACITY);
                var i = ds.points[selectedPoints[0]].sequenceIndex;
                opacities[i] = POLYLINE_SELECTED_OPACITY;
            }
            else {
                opacities.fill(POLYLINE_DEFAULT_OPACITY);
            }
            return opacities;
        };
        ProjectorScatterPlotAdapter.prototype.generateLineSegmentWidthArray = function (ds, selectedPoints) {
            if (ds == null) {
                return new Float32Array(0);
            }
            var widths = new Float32Array(ds.sequences.length);
            widths.fill(POLYLINE_DEFAULT_LINEWIDTH);
            var selectedPointCount = (selectedPoints == null) ? 0 : selectedPoints.length;
            if (selectedPointCount > 0) {
                var i = ds.points[selectedPoints[0]].sequenceIndex;
                widths[i] = POLYLINE_SELECTED_LINEWIDTH;
            }
            return widths;
        };
        ProjectorScatterPlotAdapter.prototype.generatePointColorArray = function (ds, legendPointColorer, distFunc, selectedPointIndices, neighborsOfFirstPoint, hoverPointIndex, label3dMode, spriteImageMode) {
            if (ds == null) {
                return new Float32Array(0);
            }
            var selectedPointCount = (selectedPointIndices == null) ? 0 : selectedPointIndices.length;
            var neighborCount = (neighborsOfFirstPoint == null) ? 0 : neighborsOfFirstPoint.length;
            var colors = new Float32Array(ds.points.length * 3);
            var unselectedColor = POINT_COLOR_UNSELECTED;
            var noSelectionColor = POINT_COLOR_NO_SELECTION;
            if (label3dMode) {
                unselectedColor = LABELS_3D_COLOR_UNSELECTED;
                noSelectionColor = LABELS_3D_COLOR_NO_SELECTION;
            }
            if (spriteImageMode) {
                unselectedColor = SPRITE_IMAGE_COLOR_UNSELECTED;
                noSelectionColor = SPRITE_IMAGE_COLOR_NO_SELECTION;
            }
            // Give all points the unselected color.
            {
                var n = ds.points.length;
                var dst = 0;
                if (selectedPointCount > 0) {
                    var c = new THREE.Color(unselectedColor);
                    for (var i = 0; i < n; ++i) {
                        colors[dst++] = c.r;
                        colors[dst++] = c.g;
                        colors[dst++] = c.b;
                    }
                }
                else {
                    if (legendPointColorer != null) {
                        for (var i = 0; i < n; ++i) {
                            var c = new THREE.Color(legendPointColorer(ds, i));
                            colors[dst++] = c.r;
                            colors[dst++] = c.g;
                            colors[dst++] = c.b;
                        }
                    }
                    else {
                        var c = new THREE.Color(noSelectionColor);
                        for (var i = 0; i < n; ++i) {
                            colors[dst++] = c.r;
                            colors[dst++] = c.g;
                            colors[dst++] = c.b;
                        }
                    }
                }
            }
            // Color the selected points.
            {
                var n = selectedPointCount;
                var c = new THREE.Color(POINT_COLOR_SELECTED);
                for (var i = 0; i < n; ++i) {
                    var dst = selectedPointIndices[i] * 3;
                    colors[dst++] = c.r;
                    colors[dst++] = c.g;
                    colors[dst++] = c.b;
                }
            }
            // Color the neighbors.
            {
                var n = neighborCount;
                var minDist = n > 0 ? neighborsOfFirstPoint[0].dist : 0;
                for (var i = 0; i < n; ++i) {
                    var c = new THREE.Color(dist2color(distFunc, neighborsOfFirstPoint[i].dist, minDist));
                    var dst = neighborsOfFirstPoint[i].index * 3;
                    colors[dst++] = c.r;
                    colors[dst++] = c.g;
                    colors[dst++] = c.b;
                }
            }
            // Color the hover point.
            if (hoverPointIndex != null) {
                var c = new THREE.Color(POINT_COLOR_HOVER);
                var dst = hoverPointIndex * 3;
                colors[dst++] = c.r;
                colors[dst++] = c.g;
                colors[dst++] = c.b;
            }
            return colors;
        };
        ProjectorScatterPlotAdapter.prototype.generate3DLabelsArray = function (ds, accessor) {
            if ((ds == null) || (accessor == null)) {
                return null;
            }
            var labels = [];
            var n = ds.points.length;
            for (var i = 0; i < n; ++i) {
                labels.push(this.getLabelText(ds, i, accessor));
            }
            return labels;
        };
        ProjectorScatterPlotAdapter.prototype.getLabelText = function (ds, i, accessor) {
            return ds.points[i].metadata[accessor].toString();
        };
        ProjectorScatterPlotAdapter.prototype.updateScatterPlotWithNewProjection = function (projection) {
            if (projection == null) {
                this.createVisualizers(this.renderLabelsIn3D);
                this.scatterPlot.render();
                return;
            }
            this.setDataSet(projection.dataSet);
            this.scatterPlot.setDimensions(projection.dimensionality);
            if (projection.dataSet.projectionCanBeRendered(projection.projectionType)) {
                this.updateScatterPlotAttributes();
                this.notifyProjectionPositionsUpdated();
            }
            this.scatterPlot.setCameraParametersForNextCameraCreation(null, false);
        };
        ProjectorScatterPlotAdapter.prototype.createVisualizers = function (inLabels3DMode) {
            var ds = (this.projection == null) ? null : this.projection.dataSet;
            var scatterPlot = this.scatterPlot;
            scatterPlot.removeAllVisualizers();
            this.labels3DVisualizer = null;
            this.canvasLabelsVisualizer = null;
            this.spriteVisualizer = null;
            this.polylineVisualizer = null;
            if (inLabels3DMode) {
                this.labels3DVisualizer = new vz_projector.ScatterPlotVisualizer3DLabels();
                this.labels3DVisualizer.setLabelStrings(this.generate3DLabelsArray(ds, this.labelPointAccessor));
            }
            else {
                this.spriteVisualizer = new vz_projector.ScatterPlotVisualizerSprites();
                scatterPlot.addVisualizer(this.spriteVisualizer);
                this.canvasLabelsVisualizer =
                    new vz_projector.ScatterPlotVisualizerCanvasLabels(this.scatterPlotContainer);
            }
            this.polylineVisualizer = new vz_projector.ScatterPlotVisualizerPolylines();
            this.setDataSet(ds);
            if (this.spriteVisualizer) {
                scatterPlot.addVisualizer(this.spriteVisualizer);
            }
            if (this.labels3DVisualizer) {
                scatterPlot.addVisualizer(this.labels3DVisualizer);
            }
            if (this.canvasLabelsVisualizer) {
                scatterPlot.addVisualizer(this.canvasLabelsVisualizer);
            }
            scatterPlot.addVisualizer(this.polylineVisualizer);
        };
        ProjectorScatterPlotAdapter.prototype.getSpriteImageMode = function () {
            if (this.projection == null) {
                return false;
            }
            var ds = this.projection.dataSet;
            if ((ds == null) || (ds.spriteAndMetadataInfo == null)) {
                return false;
            }
            return ds.spriteAndMetadataInfo.spriteImage != null;
        };
        return ProjectorScatterPlotAdapter;
    }());
    vz_projector.ProjectorScatterPlotAdapter = ProjectorScatterPlotAdapter;
    function packRgbIntoUint8Array(rgbArray, labelIndex, r, g, b) {
        rgbArray[labelIndex * 3] = r;
        rgbArray[labelIndex * 3 + 1] = g;
        rgbArray[labelIndex * 3 + 2] = b;
    }
    function styleRgbFromHexColor(hex) {
        var c = new THREE.Color(hex);
        return [(c.r * 255) | 0, (c.g * 255) | 0, (c.b * 255) | 0];
    }
    function getDefaultPointInPolylineColor(index, totalPoints) {
        var hue = POLYLINE_START_HUE +
            (POLYLINE_END_HUE - POLYLINE_START_HUE) * index / totalPoints;
        var rgb = d3.hsl(hue, POLYLINE_SATURATION, POLYLINE_LIGHTNESS).rgb();
        return new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    }
    /**
     * Normalizes the distance so it can be visually encoded with color.
     * The normalization depends on the distance metric (cosine vs euclidean).
     */
    function normalizeDist(distFunc, d, minDist) {
        return (distFunc === vz_projector.vector.dist) ? (minDist / d) : (1 - d);
    }
    vz_projector.normalizeDist = normalizeDist;
    /** Normalizes and encodes the provided distance with color. */
    function dist2color(distFunc, d, minDist) {
        return NN_COLOR_SCALE(normalizeDist(distFunc, d, minDist));
    }
    vz_projector.dist2color = dist2color;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
