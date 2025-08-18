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
/**
 * Optimal size for the height of the matrix when doing computation on the GPU
 * using WebGL. This was found experimentally.
 *
 * This also guarantees that for computing pair-wise distance for up to 10K
 * vectors, no more than 40MB will be allocated in the GPU. Without the
 * allocation limit, we can freeze the graphics of the whole OS.
 */
const OPTIMAL_GPU_BLOCK_SIZE = 256;
/** Id of message box used for knn gpu progress bar. */
const KNN_GPU_MSG_ID = 'knn-gpu';

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
export function findKNNGPUCosDist<T>(
  dataPoints: T[],
  k: number,
  accessor: (dataPoint: T) => Float32Array
): Promise<NearestEntry[][]> {
  const N = dataPoints.length;
  const dim = accessor(dataPoints[0]).length;
  // The goal is to compute a large matrix multiplication A*A.T where A is of
  // size NxD and A.T is its transpose. This results in a NxN matrix which
  // could be too big to store on the GPU memory. To avoid memory overflow, we
  // compute multiple A*partial_A.T where partial_A is of size BxD (B is much
  // smaller than N). This results in storing only NxB size matrices on the GPU
  // at a given time.
  // A*A.T will give us NxN matrix holding the cosine distance between every
  // pair of points, which we sort using KMin data structure to obtain the
  // K nearest neighbors for each point.
  const nearest: NearestEntry[][] = new Array(N);
  const dpNorm: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    dpNorm[i] = Math.sqrt(vector.norm2(accessor(dataPoints[i])));
  }
  let numPieces = Math.ceil(N / OPTIMAL_GPU_BLOCK_SIZE);
  const actualPieceSize = Math.floor(N / numPieces);
  const modulo = N % actualPieceSize;
  numPieces += modulo ? 1 : 0;
  let offset = 0;
  let progress = 0;
  let progressDiff = 1 / (2 * numPieces);
  let piece = 0;

  const typedArray = vector.toTypedArray(dataPoints, accessor);
  const bigMatrix = tf.tensor(typedArray, [N, dim]);
  const bigMatrixTransposed = tf.transpose(bigMatrix);
  // 1 - A * A^T.
  const bigMatrixSquared = tf.matMul(bigMatrix, bigMatrixTransposed);
  const cosDistMatrix = tf.sub(1, bigMatrixSquared);

  let maybePaddedCosDistMatrix = cosDistMatrix;
  if (actualPieceSize * numPieces > N) {
    // Expect the input to be rank 2 (though it is not typed that way) so we
    // want to pad the first dimension so we split very evenly (all splitted
    // tensor have exactly the same dimesion).
    const padding: Array<[number, number]> = [
      [0, actualPieceSize * numPieces - N],
      [0, 0],
    ];
    maybePaddedCosDistMatrix = tf.pad(cosDistMatrix, padding);
  }
  const splits = tf.split(
    maybePaddedCosDistMatrix,
    new Array(numPieces).fill(actualPieceSize),
    0
  );

  function step(resolve: (result: NearestEntry[][]) => void) {
    let progressMsg =
      'Finding nearest neighbors: ' + (progress * 100).toFixed() + '%';
    util
      .runAsyncTask(
        progressMsg,
        async () => {
          // `.data()` returns flattened Float32Array of B * N dimension.
          // For matrix of
          // [ 1  2 ]
          // [ 3  4 ],
          // `.data()` returns [1, 2, 3, 4].
          const partial = await splits[piece].data();
          progress += progressDiff;
          for (let i = 0; i < actualPieceSize; i++) {
            let kMin = new KMin<NearestEntry>(k);
            let iReal = offset + i;
            if (iReal >= N) break;
            for (let j = 0; j < N; j++) {
              // Skip diagonal entries.
              if (j === iReal) {
                continue;
              }
              // Access i * N's row at `j` column.
              // Reach row has N entries and j-th index has cosine distance
              // between iReal vs. j-th vectors.
              const cosDist =
                1 - (1 - partial[i * N + j]) / (dpNorm[i] * dpNorm[j]);
              kMin.add(cosDist, {index: j, dist: cosDist});
            }
            nearest[iReal] = kMin.getMinKItems();
          }
          progress += progressDiff;
          offset += actualPieceSize;
          piece++;
        },
        KNN_GPU_MSG_ID
      )
      .then(
        () => {
          if (piece < numPieces) {
            step(resolve);
          } else {
            logging.setModalMessage(null!, KNN_GPU_MSG_ID);
            // Discard all tensors and free up the memory.
            bigMatrix.dispose();
            bigMatrixTransposed.dispose();
            bigMatrixSquared.dispose();
            cosDistMatrix.dispose();
            splits.forEach((split) => split.dispose());
            resolve(nearest);
          }
        },
        (error) => {
          // GPU failed. Reverting back to CPU.
          logging.setModalMessage(null!, KNN_GPU_MSG_ID);
          let distFunc = (a, b, limit) => vector.cosDist(a, b);
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
      return nearest;
    }
  );
}
/** Calculates the minimum distance between a search point and a rectangle. */
function minDist(
  point: [number, number],
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  let x = point[0];
  let y = point[1];
  let dx1 = x - x1;
  let dx2 = x - x2;
  let dy1 = y - y1;
  let dy2 = y - y2;
  if (dx1 * dx2 <= 0) {
    // x is between x1 and x2
    if (dy1 * dy2 <= 0) {
      // (x,y) is inside the rectangle
      return 0; // return 0 as point is in rect
    }
    return Math.min(Math.abs(dy1), Math.abs(dy2));
  }
  if (dy1 * dy2 <= 0) {
    // y is between y1 and y2
    // We know it is already inside the rectangle
    return Math.min(Math.abs(dx1), Math.abs(dx2));
  }
  let corner: [number, number];
  if (x > x2) {
    // Upper-right vs lower-right.
    corner = y > y2 ? [x2, y2] : [x2, y1];
  } else {
    // Upper-left vs lower-left.
    corner = y > y2 ? [x1, y2] : [x1, y1];
  }
  return Math.sqrt(vector.dist22D([x, y], corner));
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

export const TEST_ONLY = {OPTIMAL_GPU_BLOCK_SIZE};
