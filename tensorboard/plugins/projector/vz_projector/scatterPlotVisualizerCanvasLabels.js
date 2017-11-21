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
    var MAX_LABELS_ON_SCREEN = 10000;
    var LABEL_STROKE_WIDTH = 3;
    var LABEL_FILL_WIDTH = 6;
    /**
     * Creates and maintains a 2d canvas on top of the GL canvas. All labels, when
     * active, are rendered to the 2d canvas as part of the visible render pass.
     */
    var ScatterPlotVisualizerCanvasLabels = /** @class */ (function () {
        function ScatterPlotVisualizerCanvasLabels(container) {
            this.labelsActive = true;
            this.canvas = document.createElement('canvas');
            container.appendChild(this.canvas);
            this.gc = this.canvas.getContext('2d');
            this.canvas.style.position = 'absolute';
            this.canvas.style.left = '0';
            this.canvas.style.top = '0';
            this.canvas.style.pointerEvents = 'none';
        }
        ScatterPlotVisualizerCanvasLabels.prototype.removeAllLabels = function () {
            var pixelWidth = this.canvas.width * window.devicePixelRatio;
            var pixelHeight = this.canvas.height * window.devicePixelRatio;
            this.gc.clearRect(0, 0, pixelWidth, pixelHeight);
        };
        /** Render all of the non-overlapping visible labels to the canvas. */
        ScatterPlotVisualizerCanvasLabels.prototype.makeLabels = function (rc) {
            if ((rc.labels == null) || (rc.labels.pointIndices.length === 0)) {
                return;
            }
            if (this.worldSpacePointPositions == null) {
                return;
            }
            var lrc = rc.labels;
            var sceneIs3D = (rc.cameraType === vz_projector.CameraType.Perspective);
            var labelHeight = parseInt(this.gc.font, 10);
            var dpr = window.devicePixelRatio;
            var grid;
            {
                var pixw = this.canvas.width * dpr;
                var pixh = this.canvas.height * dpr;
                var bb = { loX: 0, hiX: pixw, loY: 0, hiY: pixh };
                grid = new vz_projector.CollisionGrid(bb, pixw / 25, pixh / 50);
            }
            var opacityMap = d3.scalePow()
                .exponent(Math.E)
                .domain([rc.farthestCameraSpacePointZ, rc.nearestCameraSpacePointZ])
                .range([0.1, 1]);
            var camPos = rc.camera.position;
            var camToTarget = camPos.clone().sub(rc.cameraTarget);
            var camToPoint = new THREE.Vector3();
            this.gc.textBaseline = 'middle';
            this.gc.miterLimit = 2;
            // Have extra space between neighboring labels. Don't pack too tightly.
            var labelMargin = 2;
            // Shift the label to the right of the point circle.
            var xShift = 4;
            var n = Math.min(MAX_LABELS_ON_SCREEN, lrc.pointIndices.length);
            for (var i = 0; i < n; ++i) {
                var point = void 0;
                {
                    var pi = lrc.pointIndices[i];
                    point = vz_projector.util.vector3FromPackedArray(this.worldSpacePointPositions, pi);
                }
                // discard points that are behind the camera
                camToPoint.copy(camPos).sub(point);
                if (camToTarget.dot(camToPoint) < 0) {
                    continue;
                }
                var _a = vz_projector.util.vector3DToScreenCoords(rc.camera, rc.screenWidth, rc.screenHeight, point), x = _a[0], y = _a[1];
                x += xShift;
                // Computing the width of the font is expensive,
                // so we assume width of 1 at first. Then, if the label doesn't
                // conflict with other labels, we measure the actual width.
                var textBoundingBox = {
                    loX: x - labelMargin,
                    hiX: x + 1 + labelMargin,
                    loY: y - labelHeight / 2 - labelMargin,
                    hiY: y + labelHeight / 2 + labelMargin
                };
                if (grid.insert(textBoundingBox, true)) {
                    var text = lrc.labelStrings[i];
                    var fontSize = lrc.defaultFontSize * lrc.scaleFactors[i] * dpr;
                    this.gc.font = fontSize + 'px roboto';
                    // Now, check with properly computed width.
                    textBoundingBox.hiX += this.gc.measureText(text).width - 1;
                    if (grid.insert(textBoundingBox)) {
                        var opacity = 1;
                        if (sceneIs3D && (lrc.useSceneOpacityFlags[i] === 1)) {
                            opacity = opacityMap(camToPoint.length());
                        }
                        this.gc.fillStyle =
                            this.styleStringFromPackedRgba(lrc.fillColors, i, opacity);
                        this.gc.strokeStyle =
                            this.styleStringFromPackedRgba(lrc.strokeColors, i, opacity);
                        this.gc.lineWidth = LABEL_STROKE_WIDTH;
                        this.gc.strokeText(text, x, y);
                        this.gc.lineWidth = LABEL_FILL_WIDTH;
                        this.gc.fillText(text, x, y);
                    }
                }
            }
        };
        ScatterPlotVisualizerCanvasLabels.prototype.styleStringFromPackedRgba = function (packedRgbaArray, colorIndex, opacity) {
            var offset = colorIndex * 3;
            var r = packedRgbaArray[offset];
            var g = packedRgbaArray[offset + 1];
            var b = packedRgbaArray[offset + 2];
            return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
        };
        ScatterPlotVisualizerCanvasLabels.prototype.onResize = function (newWidth, newHeight) {
            var dpr = window.devicePixelRatio;
            this.canvas.width = newWidth * dpr;
            this.canvas.height = newHeight * dpr;
            this.canvas.style.width = newWidth + 'px';
            this.canvas.style.height = newHeight + 'px';
        };
        ScatterPlotVisualizerCanvasLabels.prototype.dispose = function () {
            this.removeAllLabels();
            this.canvas = null;
            this.gc = null;
        };
        ScatterPlotVisualizerCanvasLabels.prototype.onPointPositionsChanged = function (newPositions) {
            this.worldSpacePointPositions = newPositions;
            this.removeAllLabels();
        };
        ScatterPlotVisualizerCanvasLabels.prototype.onRender = function (rc) {
            if (!this.labelsActive) {
                return;
            }
            this.removeAllLabels();
            this.makeLabels(rc);
        };
        ScatterPlotVisualizerCanvasLabels.prototype.setScene = function (scene) { };
        ScatterPlotVisualizerCanvasLabels.prototype.onPickingRender = function (renderContext) { };
        return ScatterPlotVisualizerCanvasLabels;
    }());
    vz_projector.ScatterPlotVisualizerCanvasLabels = ScatterPlotVisualizerCanvasLabels;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
