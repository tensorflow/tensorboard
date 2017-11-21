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
    var knn;
    (function (knn) {
        /**
         * Optimal size for the height of the matrix when doing computation on the GPU
         * using WebGL. This was found experimentally.
         *
         * This also guarantees that for computing pair-wise distance for up to 10K
         * vectors, no more than 40MB will be allocated in the GPU. Without the
         * allocation limit, we can freeze the graphics of the whole OS.
         */
        var OPTIMAL_GPU_BLOCK_SIZE = 256;
        /** Id of message box used for knn gpu progress bar. */
        var KNN_GPU_MSG_ID = 'knn-gpu';
        /**
         * Returns the K nearest neighbors for each vector where the distance
         * computation is done on the GPU (WebGL) using cosine distance.
         *
         * @param dataPoints List of data points, where each data point holds an
         *   n-dimensional vector.
         * @param k Number of nearest neighbors to find.
         * @param accessor A method that returns the vector, given the data point.
         */
        function findKNNGPUCosine(dataPoints, k, accessor) {
            var N = dataPoints.length;
            var dim = accessor(dataPoints[0]).length;
            // The goal is to compute a large matrix multiplication A*A.T where A is of
            // size NxD and A.T is its transpose. This results in a NxN matrix which
            // could be too big to store on the GPU memory. To avoid memory overflow, we
            // compute multiple A*partial_A.T where partial_A is of size BxD (B is much
            // smaller than N). This results in storing only NxB size matrices on the GPU
            // at a given time.
            // A*A.T will give us NxN matrix holding the cosine distance between every
            // pair of points, which we sort using KMin data structure to obtain the
            // K nearest neighbors for each point.
            var typedArray = vz_projector.vector.toTypedArray(dataPoints, accessor);
            var bigMatrix = new weblas.pipeline.Tensor([N, dim], typedArray);
            var nearest = new Array(N);
            var numPieces = Math.ceil(N / OPTIMAL_GPU_BLOCK_SIZE);
            var M = Math.floor(N / numPieces);
            var modulo = N % numPieces;
            var offset = 0;
            var progress = 0;
            var progressDiff = 1 / (2 * numPieces);
            var piece = 0;
            function step(resolve) {
                var progressMsg = 'Finding nearest neighbors: ' + (progress * 100).toFixed() + '%';
                vz_projector.util.runAsyncTask(progressMsg, function () {
                    var B = piece < modulo ? M + 1 : M;
                    var typedB = new Float32Array(B * dim);
                    for (var i = 0; i < B; ++i) {
                        var vector_1 = accessor(dataPoints[offset + i]);
                        for (var d = 0; d < dim; ++d) {
                            typedB[i * dim + d] = vector_1[d];
                        }
                    }
                    var partialMatrix = new weblas.pipeline.Tensor([B, dim], typedB);
                    // Result is N x B matrix.
                    var result = weblas.pipeline.sgemm(1, bigMatrix, partialMatrix, null, null);
                    var partial = result.transfer();
                    partialMatrix.delete();
                    result.delete();
                    progress += progressDiff;
                    for (var i = 0; i < B; i++) {
                        var kMin = new vz_projector.KMin(k);
                        var iReal = offset + i;
                        for (var j = 0; j < N; j++) {
                            if (j === iReal) {
                                continue;
                            }
                            var cosDist = 1 - partial[j * B + i]; // [j, i];
                            kMin.add(cosDist, { index: j, dist: cosDist });
                        }
                        nearest[iReal] = kMin.getMinKItems();
                    }
                    progress += progressDiff;
                    offset += B;
                    piece++;
                }, KNN_GPU_MSG_ID).then(function () {
                    if (piece < numPieces) {
                        step(resolve);
                    }
                    else {
                        vz_projector.logging.setModalMessage(null, KNN_GPU_MSG_ID);
                        bigMatrix.delete();
                        resolve(nearest);
                    }
                }, function (error) {
                    // GPU failed. Reverting back to CPU.
                    vz_projector.logging.setModalMessage(null, KNN_GPU_MSG_ID);
                    var distFunc = function (a, b, limit) { return vz_projector.vector.cosDistNorm(a, b); };
                    findKNN(dataPoints, k, accessor, distFunc).then(function (nearest) {
                        resolve(nearest);
                    });
                });
            }
            return new Promise(function (resolve) { return step(resolve); });
        }
        knn.findKNNGPUCosine = findKNNGPUCosine;
        /**
         * Returns the K nearest neighbors for each vector where the distance
         * computation is done on the CPU using a user-specified distance method.
         *
         * @param dataPoints List of data points, where each data point holds an
         *   n-dimensional vector.
         * @param k Number of nearest neighbors to find.
         * @param accessor A method that returns the vector, given the data point.
         * @param dist Method that takes two vectors and a limit, and computes the
         *   distance between two vectors, with the ability to stop early if the
         *   distance is above the limit.
         */
        function findKNN(dataPoints, k, accessor, dist) {
            return vz_projector.util.runAsyncTask('Finding nearest neighbors...', function () {
                var N = dataPoints.length;
                var nearest = new Array(N);
                // Find the distances from node i.
                var kMin = new Array(N);
                for (var i = 0; i < N; i++) {
                    kMin[i] = new vz_projector.KMin(k);
                }
                for (var i = 0; i < N; i++) {
                    var a = accessor(dataPoints[i]);
                    var kMinA = kMin[i];
                    for (var j = i + 1; j < N; j++) {
                        var kMinB = kMin[j];
                        var limitI = kMinA.getSize() === k ?
                            kMinA.getLargestKey() || Number.MAX_VALUE :
                            Number.MAX_VALUE;
                        var limitJ = kMinB.getSize() === k ?
                            kMinB.getLargestKey() || Number.MAX_VALUE :
                            Number.MAX_VALUE;
                        var limit = Math.max(limitI, limitJ);
                        var dist2ItoJ = dist(a, accessor(dataPoints[j]), limit);
                        if (dist2ItoJ >= 0) {
                            kMinA.add(dist2ItoJ, { index: j, dist: dist2ItoJ });
                            kMinB.add(dist2ItoJ, { index: i, dist: dist2ItoJ });
                        }
                    }
                }
                for (var i = 0; i < N; i++) {
                    nearest[i] = kMin[i].getMinKItems();
                }
                return nearest;
            });
        }
        knn.findKNN = findKNN;
        /** Calculates the minimum distance between a search point and a rectangle. */
        function minDist(point, x1, y1, x2, y2) {
            var x = point[0];
            var y = point[1];
            var dx1 = x - x1;
            var dx2 = x - x2;
            var dy1 = y - y1;
            var dy2 = y - y2;
            if (dx1 * dx2 <= 0) {
                if (dy1 * dy2 <= 0) {
                    return 0; // return 0 as point is in rect
                }
                return Math.min(Math.abs(dy1), Math.abs(dy2));
            }
            if (dy1 * dy2 <= 0) {
                // We know it is already inside the rectangle
                return Math.min(Math.abs(dx1), Math.abs(dx2));
            }
            var corner;
            if (x > x2) {
                // Upper-right vs lower-right.
                corner = y > y2 ? [x2, y2] : [x2, y1];
            }
            else {
                // Upper-left vs lower-left.
                corner = y > y2 ? [x1, y2] : [x1, y1];
            }
            return Math.sqrt(vz_projector.vector.dist22D([x, y], corner));
        }
        /**
         * Returns the nearest neighbors of a particular point.
         *
         * @param dataPoints List of data points.
         * @param pointIndex The index of the point we need the nearest neighbors of.
         * @param k Number of nearest neighbors to search for.
         * @param accessor Method that maps a data point => vector (array of numbers).
         * @param distance Method that takes two vectors and returns their distance.
         */
        function findKNNofPoint(dataPoints, pointIndex, k, accessor, distance) {
            var kMin = new vz_projector.KMin(k);
            var a = accessor(dataPoints[pointIndex]);
            for (var i = 0; i < dataPoints.length; ++i) {
                if (i === pointIndex) {
                    continue;
                }
                var b = accessor(dataPoints[i]);
                var dist = distance(a, b);
                kMin.add(dist, { index: i, dist: dist });
            }
            return kMin.getMinKItems();
        }
        knn.findKNNofPoint = findKNNofPoint;
    })(knn = vz_projector.knn || (vz_projector.knn = {}));
})(vz_projector || (vz_projector = {})); // namespace vz_projector.knn
