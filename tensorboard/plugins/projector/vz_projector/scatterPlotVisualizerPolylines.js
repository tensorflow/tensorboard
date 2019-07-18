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
    const RGB_NUM_ELEMENTS = 3;
    const XYZ_NUM_ELEMENTS = 3;
    /**
     * Renders polylines that connect multiple points in the dataset.
     */
    class ScatterPlotVisualizerPolylines {
        constructor() {
            this.polylinePositionBuffer = {};
            this.polylineColorBuffer = {};
        }
        updateSequenceIndicesInDataSet(ds) {
            for (let i = 0; i < ds.sequences.length; i++) {
                const sequence = ds.sequences[i];
                for (let j = 0; j < sequence.pointIndices.length - 1; j++) {
                    ds.points[sequence.pointIndices[j]].sequenceIndex = i;
                    ds.points[sequence.pointIndices[j + 1]].sequenceIndex = i;
                }
            }
        }
        createPolylines(scene) {
            if (!this.dataSet || !this.dataSet.sequences) {
                return;
            }
            this.updateSequenceIndicesInDataSet(this.dataSet);
            this.polylines = [];
            for (let i = 0; i < this.dataSet.sequences.length; i++) {
                const geometry = new THREE.BufferGeometry();
                geometry.addAttribute('position', this.polylinePositionBuffer[i]);
                geometry.addAttribute('color', this.polylineColorBuffer[i]);
                const material = new THREE.LineBasicMaterial({
                    linewidth: 1,
                    opacity: 1.0,
                    transparent: true,
                    vertexColors: THREE.VertexColors
                });
                const polyline = new THREE.LineSegments(geometry, material);
                polyline.frustumCulled = false;
                this.polylines.push(polyline);
                scene.add(polyline);
            }
        }
        dispose() {
            if (this.polylines == null) {
                return;
            }
            for (let i = 0; i < this.polylines.length; i++) {
                this.scene.remove(this.polylines[i]);
                this.polylines[i].geometry.dispose();
            }
            this.polylines = null;
            this.polylinePositionBuffer = {};
            this.polylineColorBuffer = {};
        }
        setScene(scene) {
            this.scene = scene;
        }
        setDataSet(dataSet) {
            this.dataSet = dataSet;
        }
        onPointPositionsChanged(newPositions) {
            if ((newPositions == null) || (this.polylines != null)) {
                this.dispose();
            }
            if ((newPositions == null) || (this.dataSet == null)) {
                return;
            }
            // Set up the position buffer arrays for each polyline.
            for (let i = 0; i < this.dataSet.sequences.length; i++) {
                let sequence = this.dataSet.sequences[i];
                const vertexCount = 2 * (sequence.pointIndices.length - 1);
                let polylines = new Float32Array(vertexCount * XYZ_NUM_ELEMENTS);
                this.polylinePositionBuffer[i] =
                    new THREE.BufferAttribute(polylines, XYZ_NUM_ELEMENTS);
                let colors = new Float32Array(vertexCount * RGB_NUM_ELEMENTS);
                this.polylineColorBuffer[i] =
                    new THREE.BufferAttribute(colors, RGB_NUM_ELEMENTS);
            }
            for (let i = 0; i < this.dataSet.sequences.length; i++) {
                const sequence = this.dataSet.sequences[i];
                let src = 0;
                for (let j = 0; j < sequence.pointIndices.length - 1; j++) {
                    const p1Index = sequence.pointIndices[j];
                    const p2Index = sequence.pointIndices[j + 1];
                    const p1 = vz_projector.util.vector3FromPackedArray(newPositions, p1Index);
                    const p2 = vz_projector.util.vector3FromPackedArray(newPositions, p2Index);
                    this.polylinePositionBuffer[i].setXYZ(src, p1.x, p1.y, p1.z);
                    this.polylinePositionBuffer[i].setXYZ(src + 1, p2.x, p2.y, p2.z);
                    src += 2;
                }
                this.polylinePositionBuffer[i].needsUpdate = true;
            }
            if (this.polylines == null) {
                this.createPolylines(this.scene);
            }
        }
        onRender(renderContext) {
            if (this.polylines == null) {
                return;
            }
            for (let i = 0; i < this.polylines.length; i++) {
                this.polylines[i].material.opacity = renderContext.polylineOpacities[i];
                this.polylines[i].material.linewidth =
                    renderContext.polylineWidths[i];
                this.polylineColorBuffer[i]
                    .setArray(renderContext.polylineColors[i]);
                this.polylineColorBuffer[i].needsUpdate = true;
            }
        }
        onPickingRender(renderContext) { }
        onResize(newWidth, newHeight) { }
    }
    vz_projector.ScatterPlotVisualizerPolylines = ScatterPlotVisualizerPolylines;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
