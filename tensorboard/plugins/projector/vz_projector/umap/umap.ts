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
namespace vz_projector.umap {

export type DistanceFn = (x: Point, y: Point) => number;
export type Point = number[];
export type Points = Point[];

const SMOOTH_K_TOLERANCE = 1e-5;
const MIN_K_DIST_SCALE = 1e-3;

export interface UMAPParamaters {
  nNeighbors?: number;
  nComponents?: number;
}

function euclidean(x: Point, y: Point) {
  let result = 0;
  for (let i = 0; i < x.length; i++) {
    result += (x[i] - y[i]) ** 2;
  }
  return Math.sqrt(result);
}

export class UMAP {
  nNeighbors = 15;
  nComponents = 2;
  distanceFn: DistanceFn = euclidean;
  spectralInitialization: false;

  constructor(params: UMAPParamaters = {}) {
    this.nNeighbors = params.nNeighbors || this.nNeighbors;
    this.nComponents = params.nComponents || this.nComponents;
  }

  fit(X: Points) {
    const { distanceFn, nComponents, nNeighbors } = this;

    const { knnIndices, knnDists } = nearestNeighbors(
      X,
      nNeighbors,
      distanceFn
    );

    const graph = fuzzySimplicialSet(X, nNeighbors, knnIndices, knnDists);
    const embedding = simplicialSetEmbedding(X, graph, nComponents);

    return embedding;
  }
}

/**
 * Compute the ``nNeighbors`` nearest points for each data point in ``X``. This 
 * may be exact, but more likely is approximated via nearest neighbor descent.
 */
function nearestNeighbors(
  X: Points,
  nNeighbors: number,
  distanceFn: DistanceFn
) {
  const log2 = (n: number) => Math.log(n) / Math.log(2);
  const metricNNDescent = nn_descent.makeNNDescent(distanceFn);

  // Handle python3 rounding down from 0.5 discrpancy
  const round = (n: number) => {
    return n === 0.5 ? 0 : Math.round(n);
  };

  const nTrees = 5 + Math.floor(round(X.length ** 0.5 / 20.0));
  const nIters = Math.max(5, Math.floor(Math.round(log2(X.length))));

  const rpForest = tree.makeForest(X, nNeighbors, nTrees);
  const leafArray = tree.makeLeafArray(rpForest);
  const { indices, weights } = metricNNDescent(
    X,
    leafArray,
    nNeighbors,
    nIters
  );
  return { knnIndices: indices, knnDists: weights, rpForest };
}

/**
 * Given a set of data X, a neighborhood size, and a measure of distance
 * compute the fuzzy simplicial set (here represented as a fuzzy graph in
 * the form of a sparse matrix) associated to the data. This is done by
 * locally approximating geodesic distance at each point, creating a fuzzy
 * simplicial set for each such point, and then combining all the local
 * fuzzy simplicial sets into a global one via a fuzzy union.
 */
function fuzzySimplicialSet(
  X: Points,
  nNeighbors: number,
  knnIndices: Points,
  knnDistances: Points,
  localConnectivity = 1.0,
  setOpMixRatio = 1.0
) {
  const { sigmas, rhos } = smoothKNNDistance(
    knnDistances,
    nNeighbors,
    localConnectivity
  );

  const { rows, cols, vals } = computeMembershipStrengths(
    knnIndices,
    knnDistances,
    sigmas,
    rhos
  );

  const size = [X.length, X.length];
  const sparseMatrix = new matrix.SparseMatrix(rows, cols, vals, size);

  const transpose = matrix.transpose(sparseMatrix);
  const prodMatrix = matrix.dotMultiply(sparseMatrix, transpose);

  const a = matrix.subtract(matrix.add(sparseMatrix, transpose), prodMatrix);
  const b = matrix.multiplyScalar(a, setOpMixRatio);
  const c = matrix.multiplyScalar(prodMatrix, 1.0 - setOpMixRatio);
  const result = matrix.add(b, c);

  return result;
}

/**
 * Compute a continuous version of the distance to the kth nearest
 * neighbor. That is, this is similar to knn-distance but allows continuous
 * k values rather than requiring an integral k. In esscence we are simply
 * computing the distance such that the cardinality of fuzzy set we generate
 * is k.
 */
function smoothKNNDistance(
  distances: Points,
  k: number,
  localConnectivity = 1.0,
  nIter = 64,
  bandwidth = 1.0
) {
  const target = (Math.log(k) / Math.log(2)) * bandwidth;
  const rho = utils.zeros(distances.length);
  const result = utils.zeros(distances.length);

  for (let i = 0; i < distances.length; i++) {
    let lo = 0.0;
    let hi = Infinity;
    let mid = 1.0;

    // TODO: This is very inefficient, but will do for now. FIXME
    const ithDistances = distances[i];
    const nonZeroDists = ithDistances.filter(d => d > 0.0);

    if (nonZeroDists.length >= localConnectivity) {
      let index = Math.floor(localConnectivity);
      let interpolation = localConnectivity - index;
      if (index > 0) {
        rho[i] = nonZeroDists[index - 1];
        if (interpolation > SMOOTH_K_TOLERANCE) {
          rho[i] +=
            interpolation * (nonZeroDists[index] - nonZeroDists[index - 1]);
        }
      } else {
        rho[i] = interpolation * nonZeroDists[0];
      }
    } else if (nonZeroDists.length > 0) {
      rho[i] = utils.max(nonZeroDists);
    }

    for (let n = 0; n < nIter; n++) {
      let psum = 0.0;
      for (let j = 1; j < distances[i].length; j++) {
        const d = distances[i][j] - rho[i];
        if (d > 0) {
          psum += Math.exp(-(d / mid));
        } else {
          psum += 1.0;
        }
      }

      if (Math.abs(psum - target) < SMOOTH_K_TOLERANCE) {
        break;
      }

      if (psum > target) {
        hi = mid;
        mid = (lo + hi) / 2.0;
      } else {
        lo = mid;
        if (hi === Infinity) {
          mid *= 2;
        } else {
          mid = (lo + hi) / 2.0;
        }
      }
    }

    result[i] = mid;

    // TODO: This is very inefficient, but will do for now. FIXME
    if (rho[i] > 0.0) {
      const meanIthDistances = utils.mean(ithDistances);
      if (result[i] < MIN_K_DIST_SCALE * meanIthDistances) {
        result[i] = MIN_K_DIST_SCALE * meanIthDistances;
      }
    } else {
      const meanDistances = utils.mean(distances.map(utils.mean));
      if (result[i] < MIN_K_DIST_SCALE * meanDistances) {
        result[i] = MIN_K_DIST_SCALE * meanDistances;
      }
    }
  }

  return { sigmas: result, rhos: rho };
}

/**
 * Construct the membership strength data for the 1-skeleton of each local
 * fuzzy simplicial set -- this is formed as a sparse matrix where each row is
 * a local fuzzy simplicial set, with a membership strength for the
 * 1-simplex to each other data point.
 */
function computeMembershipStrengths(
  knnIndices: Points,
  knnDistances: Points,
  sigmas: number[],
  rhos: number[]
): { rows: number[]; cols: number[]; vals: number[] } {
  const nSamples = knnIndices.length;
  const nNeighbors = knnIndices[0].length;

  const rows = utils.zeros(nSamples * nNeighbors);
  const cols = utils.zeros(nSamples * nNeighbors);
  const vals = utils.zeros(nSamples * nNeighbors);

  for (let i = 0; i < nSamples; i++) {
    for (let j = 0; j < nNeighbors; j++) {
      let val = 0;
      if (knnIndices[i][j] === -1) {
        continue; // We didn't get the full knn for i
      }
      if (knnIndices[i][j] === i) {
        val = 0.0;
      } else if (knnDistances[i][j] - rhos[i] <= 0.0) {
        val = 1.0;
      } else {
        val = Math.exp(-((knnDistances[i][j] - rhos[i]) / sigmas[i]));
      }

      rows[i * nNeighbors + j] = i;
      cols[i * nNeighbors + j] = knnIndices[i][j];
      vals[i * nNeighbors + j] = val;
    }
  }

  return { rows, cols, vals };
}

/**
 * Perform a fuzzy simplicial set embedding, using a specified
 * initialisation method and then minimizing the fuzzy set cross entropy
 * between the 1-skeletons of the high and low dimensional fuzzy simplicial
 *  sets.
 */
function simplicialSetEmbedding(
  data: Points,
  graph: matrix.SparseMatrix,
  nComponents,
  nEpochs = 0
) {
  const nVertices = graph.nCols;

  if (nEpochs <= 0) {
    const length = graph.nRows;
    // NOTE: This heuristic differs from the python version
    if (length <= 2500) {
      nEpochs = 500;
    } else if (length <= 5000) {
      nEpochs = 400;
    } else if (length <= 7500) {
      nEpochs = 300;
    } else {
      nEpochs = 200;
    }
  }

  const graphValues = graph.getValues();
  let graphMax = 0;
  for (let i = 0; i < graphValues.length; i++) {
    const value = graphValues[i];
    if (graphMax < graphValues[i]) {
      graphMax = value;
    }
  }

  graph = graph.map(value => {
    if (value < graphMax / nEpochs) {
      return 0;
    } else {
      return value;
    }
  });

  // We're not computing the spectral initialization in this implementation
  // until we determine a better eigenvalue/eigenvector computation
  // approach
  const embedding = utils.zeros(graph.nRows).map(() => {
    return utils.zeros(nComponents).map(() => {
      return utils.tauRand() * 20 + -10; // Random from -10 to 10
    });
  });

  // Get graph data in ordered way...
  const weights = [];
  const head = [];
  const tail = [];
  for (let i = 0; i < graph.nRows; i++) {
    for (let j = 0; j < graph.nCols; j++) {
      const value = graph.get(i, j);
      if (value) {
        weights.push(value);
        tail.push(i);
        head.push(j);
      }
    }
  }
  const epochsPerSample = makeEpochsPerSample(weights, nEpochs);

  const result = optimizeLayout(
    embedding,
    embedding,
    head,
    tail,
    nEpochs,
    nVertices,
    epochsPerSample
  );

  return result;
}

/**
 * Given a set of weights and number of epochs generate the number of
 * epochs per sample for each weight.
 */
function makeEpochsPerSample(weights: number[], nEpochs: number) {
  const result = utils.filled(weights.length, -1.0);
  const max = utils.max(weights);
  const nSamples = weights.map(w => (w / max) * nEpochs);
  nSamples.forEach((n, i) => {
    if (n > 0) result[i] = nEpochs / nSamples[i];
  });
  return result;
}

/**
 * Standard clamping of a value into a fixed range (in this case -4.0 to 4.0)
 */
function clip(x: number) {
  if (x > 4.0) return 4.0;
  else if (x < -4.0) return -4.0;
  else return x;
}

/**
 * Reduced Euclidean distance.
 */
function rDist(x: number[], y: number[]) {
  let result = 0.0;
  for (let i = 0; i < x.length; i++) {
    result += Math.pow(x[i] - y[i], 2);
  }
  return result;
}

/**
 * Improve an embedding using stochastic gradient descent to minimize the
 * fuzzy set cross entropy between the 1-skeletons of the high dimensional
 * and low dimensional fuzzy simplicial sets. In practice this is done by
 * sampling edges based on their membership strength (with the (1-p) terms
 * coming from negative sampling similar to word2vec).
 */
function optimizeLayout(
  headEmbedding: number[][],
  tailEmbedding: number[][],
  head: number[],
  tail: number[],
  nEpochs: number,
  nVertices: number,
  epochsPerSample: number[],
  gamma = 1.0,
  initialAlpha = 1.0,
  negativeSampleRate = 5
) {
  // TODO -> Compute these!!!!
  const a = 1.5769434603113077;
  const b = 0.8950608779109733;

  const dim = headEmbedding[0].length;
  const moveOther = headEmbedding.length === tailEmbedding.length;
  let alpha = initialAlpha;

  const epochsPerNegativeSample = epochsPerSample.map(
    e => e / negativeSampleRate
  );
  const epochOfNextNegativeSample = [...epochsPerNegativeSample];
  const epochOfNextSample = [...epochsPerSample];

  for (let n = 0; n < nEpochs; n++) {
    for (let i = 0; i < epochsPerSample.length; i++) {
      if (epochOfNextSample[i] > n) {
        continue;
      }

      const j = head[i];
      const k = tail[i];

      const current = headEmbedding[j];
      const other = tailEmbedding[k];

      const distSquared = rDist(current, other);

      let gradCoeff = 0;
      if (distSquared > 0) {
        gradCoeff = -2.0 * a * b * Math.pow(distSquared, b - 1.0);
        gradCoeff /= a * Math.pow(distSquared, b) + 1.0;
      }

      for (let d = 0; d < dim; d++) {
        const gradD = clip(gradCoeff * (current[d] - other[d]));
        current[d] += gradD * alpha;
        if (moveOther) {
          other[d] += -gradD * alpha;
        }
      }

      epochOfNextSample[i] += epochsPerSample[i];

      const nNegSamples = Math.floor(
        (n - epochOfNextNegativeSample[i]) / epochsPerNegativeSample[i]
      );

      for (let p = 0; p < nNegSamples; p++) {
        const k = utils.tauRandInt(nVertices);
        const other = tailEmbedding[k];

        const distSquared = rDist(current, other);

        let gradCoeff = 0.0;
        if (distSquared > 0.0) {
          gradCoeff = 2.0 * gamma * b;
          gradCoeff /=
            (0.001 + distSquared) * (a * Math.pow(distSquared, b) + 1);
        } else if (j === k) {
          continue;
        }

        for (let d = 0; d < dim; d++) {
          let gradD = 4.0;
          if (gradCoeff > 0.0) {
            gradD = clip(gradCoeff * (current[d] - other[d]));
          }
          current[d] += gradD * alpha;
        }
      }
      epochOfNextNegativeSample[i] += nNegSamples * epochsPerNegativeSample[i];
    }
    alpha = initialAlpha * (1.0 - n / nEpochs);
  }
  return headEmbedding;
} 

}  // namespace vz_projector.umap