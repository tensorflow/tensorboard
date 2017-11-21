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
    var RGB_NUM_ELEMENTS = 3;
    var XYZ_NUM_ELEMENTS = 3;
    /**
     * Renders polylines that connect multiple points in the dataset.
     */
    var ScatterPlotVisualizerPolylines = /** @class */ (function () {
        function ScatterPlotVisualizerPolylines() {
            this.polylinePositionBuffer = {};
            this.polylineColorBuffer = {};
        }
        ScatterPlotVisualizerPolylines.prototype.updateSequenceIndicesInDataSet = function (ds) {
            for (var i = 0; i < ds.sequences.length; i++) {
                var sequence = ds.sequences[i];
                for (var j = 0; j < sequence.pointIndices.length - 1; j++) {
                    ds.points[sequence.pointIndices[j]].sequenceIndex = i;
                    ds.points[sequence.pointIndices[j + 1]].sequenceIndex = i;
                }
            }
        };
        ScatterPlotVisualizerPolylines.prototype.createPolylines = function (scene) {
            if (!this.dataSet || !this.dataSet.sequences) {
                return;
            }
            this.updateSequenceIndicesInDataSet(this.dataSet);
            this.polylines = [];
            for (var i = 0; i < this.dataSet.sequences.length; i++) {
                var geometry = new THREE.BufferGeometry();
                geometry.addAttribute('position', this.polylinePositionBuffer[i]);
                geometry.addAttribute('color', this.polylineColorBuffer[i]);
                var material = new THREE.LineBasicMaterial({
                    linewidth: 1,
                    opacity: 1.0,
                    transparent: true,
                    vertexColors: THREE.VertexColors
                });
                var polyline = new THREE.LineSegments(geometry, material);
                polyline.frustumCulled = false;
                this.polylines.push(polyline);
                scene.add(polyline);
            }
        };
        ScatterPlotVisualizerPolylines.prototype.dispose = function () {
            if (this.polylines == null) {
                return;
            }
            for (var i = 0; i < this.polylines.length; i++) {
                this.scene.remove(this.polylines[i]);
                this.polylines[i].geometry.dispose();
            }
            this.polylines = null;
            this.polylinePositionBuffer = {};
            this.polylineColorBuffer = {};
        };
        ScatterPlotVisualizerPolylines.prototype.setScene = function (scene) {
            this.scene = scene;
        };
        ScatterPlotVisualizerPolylines.prototype.setDataSet = function (dataSet) {
            this.dataSet = dataSet;
        };
        ScatterPlotVisualizerPolylines.prototype.onPointPositionsChanged = function (newPositions) {
            if ((newPositions == null) || (this.polylines != null)) {
                this.dispose();
            }
            if ((newPositions == null) || (this.dataSet == null)) {
                return;
            }
            // Set up the position buffer arrays for each polyline.
            for (var i = 0; i < this.dataSet.sequences.length; i++) {
                var sequence = this.dataSet.sequences[i];
                var vertexCount = 2 * (sequence.pointIndices.length - 1);
                var polylines = new Float32Array(vertexCount * XYZ_NUM_ELEMENTS);
                this.polylinePositionBuffer[i] =
                    new THREE.BufferAttribute(polylines, XYZ_NUM_ELEMENTS);
                var colors = new Float32Array(vertexCount * RGB_NUM_ELEMENTS);
                this.polylineColorBuffer[i] =
                    new THREE.BufferAttribute(colors, RGB_NUM_ELEMENTS);
            }
            for (var i = 0; i < this.dataSet.sequences.length; i++) {
                var sequence = this.dataSet.sequences[i];
                var src = 0;
                for (var j = 0; j < sequence.pointIndices.length - 1; j++) {
                    var p1Index = sequence.pointIndices[j];
                    var p2Index = sequence.pointIndices[j + 1];
                    var p1 = vz_projector.util.vector3FromPackedArray(newPositions, p1Index);
                    var p2 = vz_projector.util.vector3FromPackedArray(newPositions, p2Index);
                    this.polylinePositionBuffer[i].setXYZ(src, p1.x, p1.y, p1.z);
                    this.polylinePositionBuffer[i].setXYZ(src + 1, p2.x, p2.y, p2.z);
                    src += 2;
                }
                this.polylinePositionBuffer[i].needsUpdate = true;
            }
            if (this.polylines == null) {
                this.createPolylines(this.scene);
            }
        };
        ScatterPlotVisualizerPolylines.prototype.onRender = function (renderContext) {
            if (this.polylines == null) {
                return;
            }
            for (var i = 0; i < this.polylines.length; i++) {
                this.polylines[i].material.opacity = renderContext.polylineOpacities[i];
                this.polylines[i].material.linewidth =
                    renderContext.polylineWidths[i];
                this.polylineColorBuffer[i].array = renderContext.polylineColors[i];
                this.polylineColorBuffer[i].needsUpdate = true;
            }
        };
        ScatterPlotVisualizerPolylines.prototype.onPickingRender = function (renderContext) { };
        ScatterPlotVisualizerPolylines.prototype.onResize = function (newWidth, newHeight) { };
        return ScatterPlotVisualizerPolylines;
    }());
    vz_projector.ScatterPlotVisualizerPolylines = ScatterPlotVisualizerPolylines;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
