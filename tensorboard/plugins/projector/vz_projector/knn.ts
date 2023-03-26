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
import * as tf from '../../../webapp/third_party/tfjs';
import {KMin} from './heap';
import * as logging from './logging';
import * as util from './util';
import * as vector from './vector';

export type NearestEntry = {
  index: number;
  dist: number;
};

/** Id of message box used for knn. */
const KNN_MSG_ID = 'knn';

/**
 * Returns the K nearest neighbors for each vector where the distance
 * computation is done on the GPU (WebGL) using cosine distance.
 *
 * @param dataPoints List of data points, where each data point holds an
 *   n-dimensional vector. Assumes that the vector is already normalized to unit
 *   norm.
 * @param k Number of nearest neighbors to find.
 * @param accessor A method that returns the vector, given the data point.
 */
export function findKNNGPUCosDistNorm<T>(
  dataPoints: T[],
  k: number,
  accessor: (dataPoint: T) => Float32Array
): Promise<NearestEntry[][]> {
  const N = dataPoints.length;
  const dim = accessor(dataPoints[0]).length;
  // The goal is to compute a large matrix multiplication A*A.T where A is of
  // size NxD and A.T is its transpose. This results in a NxN matrix.
  // A*A.T will give us NxN matrix holding the cosine distance between every
  // pair of points, which we sort using KMin data structure to obtain the
  // K nearest neighbors for each point.
  const nearest: NearestEntry[][] = new Array(N);
  function step(resolve: (result: NearestEntry[][]) => void) {
    util
      .runAsyncTask(
        'Finding nearest neighbors...',
        async () => {
          const cosSimilarityMatrix = tf.tidy(() => {
            const typedArray = vector.toTypedArray(dataPoints, accessor);
            const bigMatrix = tf.tensor(typedArray, [N, dim]);
            const bigMatrixTransposed = tf.transpose(bigMatrix);
            // A * A^T.
            return tf.matMul(bigMatrix, bigMatrixTransposed);
          });
          // `.data()` returns flattened Float32Array of B * N dimension.
          // For matrix of
          // [ 1  2 ]
          // [ 3  4 ],
          // `.data()` returns [1, 2, 3, 4].
          let partial;
          try {
            partial = await cosSimilarityMatrix.data();
          } finally {
            // Discard all tensors and free up the memory.
            cosSimilarityMatrix.dispose();
          }
          for (let i = 0; i < N; i++) {
            let kMin = new KMin<NearestEntry>(k);
            for (let j = 0; j < N; j++) {
              // Skip diagonal entries.
              if (j === i) {
                continue;
              }
              // Access i * N's row at `j` column.
              // Reach row has N entries and j-th index has cosine distance
              // between i-th vs. j-th vectors.
              const cosDist = 1 - partial[i * N + j];
              if (cosDist >= 0) {
                kMin.add(cosDist, {index: j, dist: cosDist});
              }
            }
            nearest[i] = kMin.getMinKItems();
          }
        },
        KNN_MSG_ID
      )
      .then(
        () => {
          logging.setModalMessage(null!, KNN_MSG_ID);
          resolve(nearest);
        },
        (error) => {
          // GPU failed. Reverting back to CPU.
          logging.setModalMessage(null!, KNN_MSG_ID);
          let distFunc = (a, b, limit) => vector.cosDistNorm(a, b);
          findKNN(dataPoints, k, accessor, distFunc).then((nearest) => {
            resolve(nearest);
          });
        }
      );
  }
  return new Promise<NearestEntry[][]>((resolve) => step(resolve));
}
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
export function findKNN<T>(
  dataPoints: T[],
  k: number,
  accessor: (dataPoint: T) => Float32Array,
  dist: (a: vector.Vector, b: vector.Vector, limit: number) => number
): Promise<NearestEntry[][]> {
  return util.runAsyncTask<NearestEntry[][]>(
    'Finding nearest neighbors...',
    () => {
      let N = dataPoints.length;
      let nearest: NearestEntry[][] = new Array(N);
      // Find the distances from node i.
      let kMin: KMin<NearestEntry>[] = new Array(N);
      for (let i = 0; i < N; i++) {
        kMin[i] = new KMin<NearestEntry>(k);
      }
      for (let i = 0; i < N; i++) {
        let a = accessor(dataPoints[i]);
        let kMinA = kMin[i];
        for (let j = i + 1; j < N; j++) {
          let kMinB = kMin[j];
          let limitI =
            kMinA.getSize() === k
              ? kMinA.getLargestKey() || Number.MAX_VALUE
              : Number.MAX_VALUE;
          let limitJ =
            kMinB.getSize() === k
              ? kMinB.getLargestKey() || Number.MAX_VALUE
              : Number.MAX_VALUE;
          let limit = Math.max(limitI, limitJ);
          let dist2ItoJ = dist(a, accessor(dataPoints[j]), limit);
          if (dist2ItoJ >= 0) {
            kMinA.add(dist2ItoJ, {index: j, dist: dist2ItoJ});
            kMinB.add(dist2ItoJ, {index: i, dist: dist2ItoJ});
          }
        }
      }
      for (let i = 0; i < N; i++) {
        nearest[i] = kMin[i].getMinKItems();
      }
      logging.setModalMessage(null!, KNN_MSG_ID);
      return nearest;
    },
    KNN_MSG_ID
  );
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
export function findKNNofPoint<T>(
  dataPoints: T[],
  pointIndex: number,
  k: number,
  accessor: (dataPoint: T) => Float32Array,
  distance: (a: vector.Vector, b: vector.Vector) => number
) {
  let kMin = new KMin<NearestEntry>(k);
  let a = accessor(dataPoints[pointIndex]);
  for (let i = 0; i < dataPoints.length; ++i) {
    if (i === pointIndex) {
      continue;
    }
    let b = accessor(dataPoints[i]);
    let dist = distance(a, b);
    kMin.add(dist, {index: i, dist: dist});
  }
  return kMin.getMinKItems();
}
