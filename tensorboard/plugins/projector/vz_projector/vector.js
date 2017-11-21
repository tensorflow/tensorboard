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
    var vector;
    (function (vector_1) {
        /**
         * @fileoverview Useful vector utilities.
         */
        /** Returns the dot product of two vectors. */
        function dot(a, b) {
            vz_projector.util.assert(a.length === b.length, 'Vectors a and b must be of same length');
            var result = 0;
            for (var i = 0; i < a.length; ++i) {
                result += a[i] * b[i];
            }
            return result;
        }
        vector_1.dot = dot;
        /** Sums all the elements in the vector */
        function sum(a) {
            var result = 0;
            for (var i = 0; i < a.length; ++i) {
                result += a[i];
            }
            return result;
        }
        vector_1.sum = sum;
        /** Returns the sum of two vectors, i.e. a + b */
        function add(a, b) {
            vz_projector.util.assert(a.length === b.length, 'Vectors a and b must be of same length');
            var result = new Float32Array(a.length);
            for (var i = 0; i < a.length; ++i) {
                result[i] = a[i] + b[i];
            }
            return result;
        }
        vector_1.add = add;
        /** Subtracts vector b from vector a, i.e. returns a - b */
        function sub(a, b) {
            vz_projector.util.assert(a.length === b.length, 'Vectors a and b must be of same length');
            var result = new Float32Array(a.length);
            for (var i = 0; i < a.length; ++i) {
                result[i] = a[i] - b[i];
            }
            return result;
        }
        vector_1.sub = sub;
        /** Returns the square norm of the vector */
        function norm2(a) {
            var result = 0;
            for (var i = 0; i < a.length; ++i) {
                result += a[i] * a[i];
            }
            return result;
        }
        vector_1.norm2 = norm2;
        /** Returns the euclidean distance between two vectors. */
        function dist(a, b) {
            return Math.sqrt(dist2(a, b));
        }
        vector_1.dist = dist;
        /** Returns the square euclidean distance between two vectors. */
        function dist2(a, b) {
            vz_projector.util.assert(a.length === b.length, 'Vectors a and b must be of same length');
            var result = 0;
            for (var i = 0; i < a.length; ++i) {
                var diff = a[i] - b[i];
                result += diff * diff;
            }
            return result;
        }
        vector_1.dist2 = dist2;
        /** Returns the square euclidean distance between two 2D points. */
        function dist2_2D(a, b) {
            var dX = a[0] - b[0];
            var dY = a[1] - b[1];
            return dX * dX + dY * dY;
        }
        vector_1.dist2_2D = dist2_2D;
        /** Returns the square euclidean distance between two 3D points. */
        function dist2_3D(a, b) {
            var dX = a[0] - b[0];
            var dY = a[1] - b[1];
            var dZ = a[2] - b[2];
            return dX * dX + dY * dY + dZ * dZ;
        }
        vector_1.dist2_3D = dist2_3D;
        /** Returns the euclidean distance between 2 3D points. */
        function dist_3D(a, b) {
            return Math.sqrt(dist2_3D(a, b));
        }
        vector_1.dist_3D = dist_3D;
        /**
         * Returns the square euclidean distance between two vectors, with an early
         * exit (returns -1) if the distance is >= to the provided limit.
         */
        function dist2WithLimit(a, b, limit) {
            vz_projector.util.assert(a.length === b.length, 'Vectors a and b must be of same length');
            var result = 0;
            for (var i = 0; i < a.length; ++i) {
                var diff = a[i] - b[i];
                result += diff * diff;
                if (result >= limit) {
                    return -1;
                }
            }
            return result;
        }
        vector_1.dist2WithLimit = dist2WithLimit;
        /** Returns the square euclidean distance between two 2D points. */
        function dist22D(a, b) {
            var dX = a[0] - b[0];
            var dY = a[1] - b[1];
            return dX * dX + dY * dY;
        }
        vector_1.dist22D = dist22D;
        /** Modifies the vector in-place to have unit norm. */
        function unit(a) {
            var norm = Math.sqrt(norm2(a));
            vz_projector.util.assert(norm >= 0, 'Norm of the vector must be > 0');
            for (var i = 0; i < a.length; ++i) {
                a[i] /= norm;
            }
        }
        vector_1.unit = unit;
        /**
         *  Projects the vectors to a lower dimension
         *
         * @param vectors Array of vectors to be projected.
         * @param newDim The resulting dimension of the vectors.
         */
        function projectRandom(vectors, newDim) {
            var dim = vectors[0].length;
            var N = vectors.length;
            var newVectors = new Array(N);
            for (var i = 0; i < N; ++i) {
                newVectors[i] = new Float32Array(newDim);
            }
            // Make nDim projections.
            for (var k = 0; k < newDim; ++k) {
                var randomVector = rn(dim);
                for (var i = 0; i < N; ++i) {
                    newVectors[i][k] = dot(vectors[i], randomVector);
                }
            }
            return newVectors;
        }
        vector_1.projectRandom = projectRandom;
        /**
         * Projects a vector onto a 2D plane specified by the two direction vectors.
         */
        function project2d(a, dir1, dir2) {
            return [dot(a, dir1), dot(a, dir2)];
        }
        vector_1.project2d = project2d;
        /**
         * Computes the centroid of the data points. If the provided data points are not
         * vectors, an accessor function needs to be provided.
         */
        function centroid(dataPoints, accessor) {
            if (dataPoints.length === 0) {
                return null;
            }
            if (accessor == null) {
                accessor = function (a) { return a; };
            }
            vz_projector.util.assert(dataPoints.length >= 0, '`vectors` must be of length >= 1');
            var centroid = new Float32Array(accessor(dataPoints[0]).length);
            for (var i = 0; i < dataPoints.length; ++i) {
                var dataPoint = dataPoints[i];
                var vector_2 = accessor(dataPoint);
                for (var j = 0; j < centroid.length; ++j) {
                    centroid[j] += vector_2[j];
                }
            }
            for (var j = 0; j < centroid.length; ++j) {
                centroid[j] /= dataPoints.length;
            }
            return centroid;
        }
        vector_1.centroid = centroid;
        /**
         * Generates a vector of the specified size where each component is drawn from
         * a random (0, 1) gaussian distribution.
         */
        function rn(size) {
            var normal = d3.randomNormal();
            var result = new Float32Array(size);
            for (var i = 0; i < size; ++i) {
                result[i] = normal();
            }
            return result;
        }
        vector_1.rn = rn;
        /**
         * Returns the cosine distance ([0, 2]) between two vectors
         * that have been normalized to unit norm.
         */
        function cosDistNorm(a, b) {
            return 1 - dot(a, b);
        }
        vector_1.cosDistNorm = cosDistNorm;
        /**
         * Returns the cosine distance ([0, 2]) between two vectors.
         */
        function cosDist(a, b) {
            return 1 - cosSim(a, b);
        }
        vector_1.cosDist = cosDist;
        /** Returns the cosine similarity ([-1, 1]) between two vectors. */
        function cosSim(a, b) {
            return dot(a, b) / Math.sqrt(norm2(a) * norm2(b));
        }
        vector_1.cosSim = cosSim;
        /**
         * Converts list of vectors (matrix) into a 1-dimensional
         * typed array with row-first order.
         */
        function toTypedArray(dataPoints, accessor) {
            var N = dataPoints.length;
            var dim = accessor(dataPoints[0]).length;
            var result = new Float32Array(N * dim);
            for (var i = 0; i < N; ++i) {
                var vector_3 = accessor(dataPoints[i]);
                for (var d = 0; d < dim; ++d) {
                    result[i * dim + d] = vector_3[d];
                }
            }
            return result;
        }
        vector_1.toTypedArray = toTypedArray;
        /**
         * Transposes an RxC matrix represented as a flat typed array
         * into a CxR matrix, again represented as a flat typed array.
         */
        function transposeTypedArray(r, c, typedArray) {
            var result = new Float32Array(r * c);
            for (var i = 0; i < r; ++i) {
                for (var j = 0; j < c; ++j) {
                    result[j * r + i] = typedArray[i * c + j];
                }
            }
            return result;
        }
        vector_1.transposeTypedArray = transposeTypedArray;
    })(vector = vz_projector.vector || (vz_projector.vector = {}));
})(vz_projector || (vz_projector = {})); // namespace vz_projector.vector
