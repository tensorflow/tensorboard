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
    var test;
    (function (test) {
        /**
         * Helper method that makes a list of points given an array of
         * sequence indexes.
         *
         * @param sequences The i-th entry holds the 'next' attribute for the i-th
         * point.
         */
        function makePointsWithSequences(sequences, nextAttr) {
            if (nextAttr === void 0) { nextAttr = '__seq_next__'; }
            var points = [];
            sequences.forEach(function (t, i) {
                var metadata = {};
                metadata[nextAttr] = t >= 0 ? t : null;
                points.push({
                    vector: new Float32Array(0),
                    metadata: metadata,
                    projections: {},
                    index: i
                });
            });
            return points;
        }
        describe('constructor_with_sequences', function () {
            it('Simple forward pointing sequences, __seq_next__ metadata format', function () {
                // The input is: 0->2, 1->None, 2->3, 3->None. This should return
                // one sequence 0->2->3.
                var points = makePointsWithSequences([2, -1, 3, -1]);
                var dataset = new vz_projector.DataSet(points);
                test.assert.equal(1, dataset.sequences.length);
                test.assert.deepEqual([0, 2, 3], dataset.sequences[0].pointIndices);
            });
            it('Simple forward pointing sequences, __next__ metadata format', function () {
                // The input is: 0->2, 1->None, 2->3, 3->None. This should return
                // one sequence 0->2->3.
                var points = makePointsWithSequences([2, -1, 3, -1], '__next__');
                var dataset = new vz_projector.DataSet(points);
                test.assert.equal(1, dataset.sequences.length);
                test.assert.deepEqual([0, 2, 3], dataset.sequences[0].pointIndices);
            });
            it('No sequences', function () {
                var points = makePointsWithSequences([-1, -1, -1, -1]);
                var dataset = new vz_projector.DataSet(points);
                test.assert.equal(0, dataset.sequences.length);
            });
            it('A sequence that goes backwards and forward in the array', function () {
                // The input is: 0->2, 1->0, 2->nothing, 3->1. This should return
                // one sequence 3->1->0->2.
                var points = makePointsWithSequences([2, 0, -1, 1]);
                var dataset = new vz_projector.DataSet(points);
                test.assert.equal(1, dataset.sequences.length);
                test.assert.deepEqual([3, 1, 0, 2], dataset.sequences[0].pointIndices);
            });
        });
        describe('stateGetAccessorDimensions', function () {
            it('returns [0, 1] for 2d t-SNE', function () {
                var state = new vz_projector.State();
                state.selectedProjection = 'tsne';
                state.tSNEis3d = false;
                test.assert.deepEqual([0, 1], vz_projector.stateGetAccessorDimensions(state));
            });
            it('returns [0, 1, 2] for 3d t-SNE', function () {
                var state = new vz_projector.State();
                state.selectedProjection = 'tsne';
                state.tSNEis3d = true;
                test.assert.deepEqual([0, 1, 2], vz_projector.stateGetAccessorDimensions(state));
            });
            it('returns pca component dimensions array for pca', function () {
                var state = new vz_projector.State();
                state.selectedProjection = 'pca';
                state.pcaComponentDimensions = [13, 12, 11, 10];
                test.assert.deepEqual(state.pcaComponentDimensions, vz_projector.stateGetAccessorDimensions(state));
            });
            it('returns ["x", "y"] for custom projections', function () {
                var state = new vz_projector.State();
                state.selectedProjection = 'custom';
                test.assert.deepEqual(['x', 'y'], vz_projector.stateGetAccessorDimensions(state));
            });
        });
    })(test = vz_projector.test || (vz_projector.test = {}));
})(vz_projector || (vz_projector = {})); // namespace vz_projector.test
