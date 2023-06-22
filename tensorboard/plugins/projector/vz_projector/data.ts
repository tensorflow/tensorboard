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
import {UMAP} from 'umap-js';
import {numeric} from '../../../webapp/third_party/numeric';
import {TSNE} from './bh_tsne';
import {SpriteMetadata} from './data-provider';
import * as knn from './knn';
import * as logging from './logging';
import {CameraDef} from './scatterPlot';
import * as util from './util';
import * as vector from './vector';

export type DistanceFunction = (a: vector.Vector, b: vector.Vector) => number;
export type ProjectionComponents3D = [string, string, string];

export interface PointMetadata {
  [key: string]: number | string;
}

export interface DataProto {
  shape: [number, number];
  tensor: number[];
  metadata: {
    columns: Array<{
      name: string;
      stringValues: string[];
      numericValues: number[];
    }>;
    sprite: {
      imageBase64: string;
      singleImageDim: [number, number];
    };
  };
}

/** Statistics for a metadata column. */
export interface ColumnStats {
  name: string;
  isNumeric: boolean;
  tooManyUniqueValues: boolean;
  uniqueEntries?: Array<{
    label: string;
    count: number;
  }>;
  min: number;
  max: number;
}
export interface SpriteAndMetadataInfo {
  stats?: ColumnStats[];
  pointsInfo?: PointMetadata[];
  spriteImage?: HTMLImageElement;
  spriteMetadata?: SpriteMetadata;
}

/** A single collection of points which make up a sequence through space. */
export interface Sequence {
  /** Indices into the DataPoints array in the Data object. */
  pointIndices: number[];
}
export interface DataPoint {
  /** The point in the original space. */
  vector: Float32Array;
  /*
   * Metadata for each point. Each metadata is a set of key/value pairs
   * where the value can be a string or a number.
   */
  metadata: PointMetadata;
  /** index of the sequence, used for highlighting on click */
  sequenceIndex?: number;
  /** index in the original data source */
  index: number;
  /** This is where the calculated projections space are cached */
  projections: {
    [key: string]: number;
  };
}
const IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
/** Maximum sample size for each projection type. */
export const TSNE_SAMPLE_SIZE = 10000;
export const UMAP_SAMPLE_SIZE = 5000;
export const PCA_SAMPLE_SIZE = 50000;
/** Number of dimensions to sample when doing approximate PCA. */
export const PCA_SAMPLE_DIM = 200;
/** Number of pca components to compute. */
const NUM_PCA_COMPONENTS = 10;
/** Id of message box used for umap optimization progress bar. */
const UMAP_MSG_ID = 'umap-optimization';
/** Minimum KNN neighbors threshold */
const MIN_NUM_KNN_NEIGHBORS = 300;
/**
 * Reserved metadata attributes used for sequence information
 * NOTE: Use "__seq_next__" as "__next__" is deprecated.
 */
const SEQUENCE_METADATA_ATTRS = ['__next__', '__seq_next__'];
function getSequenceNextPointIndex(
  pointMetadata: PointMetadata
): number | null {
  let sequenceAttr: number | null = null;
  for (let metadataAttr of SEQUENCE_METADATA_ATTRS) {
    if (metadataAttr in pointMetadata && pointMetadata[metadataAttr] !== '') {
      sequenceAttr = pointMetadata[metadataAttr] as number;
      break;
    }
  }
  if (sequenceAttr == null) {
    return null;
  }
  return +sequenceAttr;
}
/**
 * Dataset contains a DataPoints array that should be treated as immutable. This
 * acts as a working subset of the original data, with cached properties
 * from computationally expensive operations. Because creating a subset
 * requires normalizing and shifting the vector space, we make a copy of the
 * data so we can still always create new subsets based on the original data.
 */
export class DataSet {
  points: DataPoint[];
  sequences: Sequence[];
  shuffledDataIndices: number[] = [];
  /**
   * This keeps a list of all current projections so you can easily test to see
   * if it's been calculated already.
   */
  projections: {
    [projection: string]: boolean;
  } = {};
  nearest: knn.NearestEntry[][];
  spriteAndMetadataInfo: SpriteAndMetadataInfo;
  fracVariancesExplained: number[];
  tSNEIteration: number = 0;
  tSNEShouldPause = false;
  tSNEShouldStop = true;
  superviseFactor: number;
  superviseLabels: string[];
  superviseInput: string = '';
  dim: [number, number] = [0, 0];
  hasTSNERun: boolean = false;
  private tsne: TSNE;
  hasUmapRun = false;
  private umap: UMAP;
  /** Creates a new Dataset */
  constructor(
    points: DataPoint[],
    spriteAndMetadataInfo?: SpriteAndMetadataInfo
  ) {
    this.points = points;
    this.shuffledDataIndices = util.shuffle(util.range(this.points.length));
    this.sequences = this.computeSequences(points);
    this.dim = [this.points.length, this.points[0].vector.length];
    if (spriteAndMetadataInfo)
      this.spriteAndMetadataInfo = spriteAndMetadataInfo;
  }
  private computeSequences(points: DataPoint[]) {
    // Keep a list of indices seen so we don't compute sequences for a given
    // point twice.
    let indicesSeen = new Int8Array(points.length);
    // Compute sequences.
    let indexToSequence: {
      [index: number]: Sequence;
    } = {};
    let sequences: Sequence[] = [];
    for (let i = 0; i < points.length; i++) {
      if (indicesSeen[i]) {
        continue;
      }
      indicesSeen[i] = 1;
      // Ignore points without a sequence attribute.
      let next = getSequenceNextPointIndex(points[i].metadata);
      if (next == null) {
        continue;
      }
      if (next in indexToSequence) {
        let existingSequence = indexToSequence[next];
        // Pushing at the beginning of the array.
        existingSequence.pointIndices.unshift(i);
        indexToSequence[i] = existingSequence;
        continue;
      }
      // The current point is pointing to a new/unseen sequence.
      let newSequence: Sequence = {pointIndices: []};
      indexToSequence[i] = newSequence;
      sequences.push(newSequence);
      let currentIndex = i;
      while (points[currentIndex]) {
        newSequence.pointIndices.push(currentIndex);
        let next = getSequenceNextPointIndex(points[currentIndex].metadata);
        if (next != null) {
          indicesSeen[next] = 1;
          currentIndex = next;
        } else {
          currentIndex = -1;
        }
      }
    }
    return sequences;
  }
  projectionCanBeRendered(projection: ProjectionType): boolean {
    if (projection !== 'tsne') {
      return true;
    }
    return this.tSNEIteration > 0;
  }
  /**
   * Returns a new subset dataset by copying out data. We make a copy because
   * we have to modify the vectors by normalizing them.
   *
   * @param subset Array of indices of points that we want in the subset.
   *
   * @return A subset of the original dataset.
   */
  getSubset(subset?: number[]): DataSet {
    const pointsSubset =
      subset != null && subset.length > 0
        ? subset.map((i) => this.points[i])
        : this.points;
    let points = pointsSubset.map((dp) => {
      return {
        metadata: dp.metadata,
        index: dp.index,
        vector: dp.vector.slice(),
        projections: {} as {
          [key: string]: number;
        },
      };
    });
    return new DataSet(points, this.spriteAndMetadataInfo);
  }
  /**
   * Computes the centroid, shifts all points to that centroid,
   * then makes them all unit norm.
   */
  normalize() {
    // Compute the centroid of all data points.
    let centroid = vector.centroid(this.points, (a) => a.vector);
    if (centroid == null) {
      throw Error('centroid should not be null');
    }
    // Shift all points by the centroid and make them unit norm.
    for (let id = 0; id < this.points.length; ++id) {
      let dataPoint = this.points[id];
      dataPoint.vector = vector.sub(dataPoint.vector, centroid);
      if (vector.norm2(dataPoint.vector) > 0) {
        // If we take the unit norm of a vector of all 0s, we get a vector of
        // all NaNs. We prevent that with a guard.
        vector.unit(dataPoint.vector);
      }
    }
  }
  /** Projects the dataset onto a given vector and caches the result. */
  projectLinear(dir: vector.Vector, label: string) {
    this.projections[label] = true;
    this.points.forEach((dataPoint) => {
      dataPoint.projections[label] = vector.dot(dataPoint.vector, dir);
    });
  }
  /** Projects the dataset along the top 10 principal components. */
  projectPCA(): Promise<void> {
    if (this.projections['pca-0'] != null) {
      return Promise.resolve<void>(null!);
    }
    return util.runAsyncTask('Computing PCA...', () => {
      // Approximate pca vectors by sampling the dimensions.
      let dim = this.points[0].vector.length;
      let vectors = this.shuffledDataIndices.map((i) => this.points[i].vector);
      if (dim > PCA_SAMPLE_DIM) {
        vectors = vector.projectRandom(vectors, PCA_SAMPLE_DIM);
      }
      const sampledVectors = vectors.slice(0, PCA_SAMPLE_SIZE);
      const {dot, transpose, svd: numericSvd} = numeric;
      // numeric dynamically generates `numeric.div` and Closure compiler has
      // incorrectly compiles `numeric.div` property accessor. We use below
      // signature to prevent Closure from mangling and guessing.
      const div = numeric['div'];
      const scalar = dot(transpose(sampledVectors), sampledVectors);
      const sigma = div(scalar, sampledVectors.length);
      const svd = numericSvd(sigma);
      const variances: number[] = svd.S;
      let totalVariance = 0;
      for (let i = 0; i < variances.length; ++i) {
        totalVariance += variances[i];
      }
      for (let i = 0; i < variances.length; ++i) {
        variances[i] /= totalVariance;
      }
      this.fracVariancesExplained = variances;
      let U: number[][] = svd.U;
      let pcaVectors = vectors.map((vector) => {
        let newV = new Float32Array(NUM_PCA_COMPONENTS);
        for (let newDim = 0; newDim < NUM_PCA_COMPONENTS; newDim++) {
          let dot = 0;
          for (let oldDim = 0; oldDim < vector.length; oldDim++) {
            dot += vector[oldDim] * U[oldDim][newDim];
          }
          newV[newDim] = dot;
        }
        return newV;
      });
      for (let d = 0; d < NUM_PCA_COMPONENTS; d++) {
        let label = 'pca-' + d;
        this.projections[label] = true;
        for (let i = 0; i < pcaVectors.length; i++) {
          let pointIndex = this.shuffledDataIndices[i];
          this.points[pointIndex].projections[label] = pcaVectors[i][d];
        }
      }
    });
  }
  /** Runs tsne on the data. */
  projectTSNE(
    perplexity: number,
    learningRate: number,
    tsneDim: number,
    stepCallback: (iter: number) => void
  ) {
    this.hasTSNERun = true;
    let k = Math.floor(3 * perplexity);
    let opt = {epsilon: learningRate, perplexity: perplexity, dim: tsneDim};
    this.tsne = new TSNE(opt);
    this.tsne.setSupervision(this.superviseLabels, this.superviseInput);
    this.tsne.setSuperviseFactor(this.superviseFactor);
    this.tSNEShouldPause = false;
    this.tSNEShouldStop = false;
    this.tSNEIteration = 0;
    let sampledIndices = this.shuffledDataIndices.slice(0, TSNE_SAMPLE_SIZE);
    let step = () => {
      if (!this.tsne.getSolution()) {
        this.initTsneSolutionFromCurrentProjection();
        return;
      }
      if (this.tSNEShouldStop) {
        this.projections['tsne'] = false;
        stepCallback(null!);
        this.tsne = null!;
        this.hasTSNERun = false;
        return;
      }
      if (!this.tSNEShouldPause) {
        this.tsne.step();
        let result = this.tsne.getSolution();
        const d = this.tsne.getDim();
        sampledIndices.forEach((index, i) => {
          let dataPoint = this.points[index];
          for (let j = 0; j < d; j++) {
            dataPoint.projections[`tsne-${j}`] = result[i * d + j];
          }
        });
        this.projections['tsne'] = true;
        this.tSNEIteration++;
        stepCallback(this.tSNEIteration);
      }
      requestAnimationFrame(step);
    };
    const sampledData = sampledIndices.map((i) => this.points[i]);
    const knnComputation = this.computeKnn(sampledData, k);
    knnComputation.then((nearest) => {
      util
        .runAsyncTask('Initializing T-SNE...', () => {
          this.tsne.initDataDist(nearest);
        })
        .then(step);
    });
  }
  /** Runs UMAP on the data. */
  async projectUmap(
    nComponents: number,
    nNeighbors: number,
    minDist: number,
    stepCallback: (iter: number) => void
  ) {
    this.hasUmapRun = true;
    this.umap = new UMAP({nComponents, nNeighbors, minDist});
    let currentEpoch = 0;
    const epochStepSize = 10;
    const sampledIndices = this.shuffledDataIndices.slice(0, UMAP_SAMPLE_SIZE);
    const sampledData = sampledIndices.map((i) => this.points[i]);
    // TODO: Switch to a Float32-based UMAP internal
    const X = sampledData.map((x) => Array.from(x.vector));
    const nearest = await this.computeKnn(sampledData, nNeighbors);
    const nEpochs = await util.runAsyncTask(
      'Initializing UMAP...',
      () => {
        const knnIndices = nearest.map((row) =>
          row.map((entry) => entry.index)
        );
        const knnDistances = nearest.map((row) =>
          row.map((entry) => entry.dist)
        );
        // Initialize UMAP and return the number of epochs.
        this.umap.setPrecomputedKNN(knnIndices, knnDistances);
        return this.umap.initializeFit(X);
      },
      UMAP_MSG_ID
    );
    // Now, iterate through all epoch batches of the UMAP optimization, updating
    // the modal window with the progress rather than animating each step since
    // the UMAP animation is not nearly as informative as t-SNE.
    return new Promise<void>((resolve, reject) => {
      const step = () => {
        // Compute a batch of epochs since we don't want to update the UI
        // on every epoch.
        const epochsBatch = Math.min(epochStepSize, nEpochs - currentEpoch);
        for (let i = 0; i < epochsBatch; i++) {
          currentEpoch = this.umap.step();
        }
        const progressMsg = `Optimizing UMAP (epoch ${currentEpoch} of ${nEpochs})`;
        // Wrap the logic in a util.runAsyncTask in order to correctly update
        // the modal with the progress of the optimization.
        util
          .runAsyncTask(
            progressMsg,
            () => {
              if (currentEpoch < nEpochs) {
                requestAnimationFrame(step);
              } else {
                const result = this.umap.getEmbedding();
                sampledIndices.forEach((index, i) => {
                  const dataPoint = this.points[index];
                  dataPoint.projections['umap-0'] = result[i][0];
                  dataPoint.projections['umap-1'] = result[i][1];
                  if (nComponents === 3) {
                    dataPoint.projections['umap-2'] = result[i][2];
                  }
                });
                this.projections['umap'] = true;
                logging.setModalMessage(null!, UMAP_MSG_ID);
                this.hasUmapRun = true;
                stepCallback(currentEpoch);
                resolve();
              }
            },
            UMAP_MSG_ID,
            0
          )
          .catch((error) => {
            logging.setModalMessage(null!, UMAP_MSG_ID);
            reject(error);
          });
      };
      requestAnimationFrame(step);
    });
  }
  /** Computes KNN to provide to the UMAP and t-SNE algorithms. */
  private async computeKnn(
    data: DataPoint[],
    nNeighbors: number
  ): Promise<knn.NearestEntry[][]> {
    // Handle the case where we've previously found the nearest neighbors.
    const previouslyComputedNNeighbors =
      this.nearest && this.nearest.length ? this.nearest[0].length : 0;
    if (
      this.nearest != null &&
      this.nearest.length === data.length &&
      previouslyComputedNNeighbors >= nNeighbors
    ) {
      return Promise.resolve(
        this.nearest
          // NearestEntry has list of K-nearest vector indices at given index.
          // Hence, if we already precomputed K = 100 before and later seek
          // K = 10, we just have ot take the first ten.
          .map((neighbors) => neighbors.slice(0, nNeighbors))
      );
    } else {
      const knnGpuEnabled = (await util.hasWebGLSupport()) && !IS_FIREFOX;
      const numKnnNeighborsToCompute = Math.max(
        nNeighbors,
        MIN_NUM_KNN_NEIGHBORS
      );
      const result = await (knnGpuEnabled
        ? knn.findKNNGPUCosDistNorm(
            data,
            numKnnNeighborsToCompute,
            (d) => d.vector
          )
        : knn.findKNN(
            data,
            numKnnNeighborsToCompute,
            (d) => d.vector,
            (a, b) => vector.cosDistNorm(a, b)
          ));
      this.nearest = result;
      return Promise.resolve(
        result.map((neighbors) => neighbors.slice(0, nNeighbors))
      );
    }
  }
  /* initialize the new tsne solution from current projection data */
  initTsneSolutionFromCurrentProjection() {
    const sampledIndices = this.shuffledDataIndices.slice(0, TSNE_SAMPLE_SIZE);
    const rng = this.tsne.getRng();
    const d = this.tsne.getDim();
    const solution = new Float64Array(sampledIndices.length * d);
    sampledIndices.forEach((index, i) => {
      const dataPoint = this.points[index];
      for (let j = 0; j < d; j++) {
        solution[i * d + j] = dataPoint.projections[`tsne-${j}`] ?? rng();
      }
    });
    this.tsne.setSolution(solution);
  }
  /* Perturb TSNE and update dataset point coordinates. */
  perturbTsne() {
    if (this.hasTSNERun && this.tsne) {
      this.tsne.perturb();
      let tsneDim = this.tsne.getDim();
      let result = this.tsne.getSolution();
      let sampledIndices = this.shuffledDataIndices.slice(0, TSNE_SAMPLE_SIZE);
      sampledIndices.forEach((index, i) => {
        let dataPoint = this.points[index];
        dataPoint.projections['tsne-0'] = result[i * tsneDim + 0];
        dataPoint.projections['tsne-1'] = result[i * tsneDim + 1];
        if (tsneDim === 3) {
          dataPoint.projections['tsne-2'] = result[i * tsneDim + 2];
        }
      });
    }
  }
  setTsneLearningRate(learningRate: number) {
    if (this.tsne) {
      this.tsne.setEpsilon(learningRate);
    }
  }
  setSupervision(superviseColumn: string, superviseInput?: string) {
    if (superviseColumn != null) {
      this.superviseLabels = this.shuffledDataIndices
        .slice(0, TSNE_SAMPLE_SIZE)
        .map((index) =>
          this.points[index].metadata[superviseColumn] !== undefined
            ? String(this.points[index].metadata[superviseColumn])
            : `Unknown #${index}`
        );
    }
    if (superviseInput != null) {
      this.superviseInput = superviseInput;
    }
    if (this.tsne) {
      this.tsne.setSupervision(this.superviseLabels, this.superviseInput);
    }
  }
  setSuperviseFactor(superviseFactor: number) {
    if (superviseFactor != null) {
      this.superviseFactor = superviseFactor;
      if (this.tsne) {
        this.tsne.setSuperviseFactor(superviseFactor);
      }
    }
  }
  /**
   * Merges metadata to the dataset and returns whether it succeeded.
   */
  mergeMetadata(metadata: SpriteAndMetadataInfo): boolean {
    if (metadata.pointsInfo?.length! !== this.points.length) {
      let errorMessage =
        `Number of tensors (${this.points.length}) do not` +
        ` match the number of lines in metadata` +
        ` (${metadata.pointsInfo?.length}).`;
      if (
        metadata.stats?.length === 1 &&
        this.points.length + 1 === metadata.pointsInfo?.length
      ) {
        // If there is only one column of metadata and the number of points is
        // exactly one less than the number of metadata lines, this is due to an
        // unnecessary header line in the metadata and we can show a meaningful
        // error.
        logging.setErrorMessage(
          errorMessage +
            ' Single column metadata should not have a header ' +
            'row.',
          'merging metadata'
        );
        return false;
      } else if (
        metadata.stats?.length! > 1 &&
        this.points.length - 1 === metadata.pointsInfo?.length!
      ) {
        // If there are multiple columns of metadata and the number of points is
        // exactly one greater than the number of lines in the metadata, this
        // means there is a missing metadata header.
        logging.setErrorMessage(
          errorMessage +
            ' Multi-column metadata should have a header ' +
            'row with column labels.',
          'merging metadata'
        );
        return false;
      }
      logging.setWarningMessage(errorMessage);
    }
    this.spriteAndMetadataInfo = metadata;
    metadata.pointsInfo
      ?.slice(0, this.points.length)
      .forEach((m, i) => (this.points[i].metadata = m));
    return true;
  }
  stopTSNE() {
    this.tSNEShouldStop = true;
  }
  /**
   * Finds the nearest neighbors of the query point using a
   * user-specified distance metric.
   */
  findNeighbors(
    pointIndex: number,
    distFunc: DistanceFunction,
    numNN: number
  ): knn.NearestEntry[] {
    // Find the nearest neighbors of a particular point.
    let neighbors = knn.findKNNofPoint(
      this.points,
      pointIndex,
      numNN,
      (d) => d.vector,
      distFunc
    );
    // TODO(@dsmilkov): Figure out why we slice.
    let result = neighbors.slice(0, numNN);
    return result;
  }
  /**
   * Search the dataset based on a metadata field.
   */
  query(query: string, inRegexMode: boolean, fieldName: string): number[] {
    let predicate = util.getSearchPredicate(query, inRegexMode, fieldName);
    let matches: number[] = [];
    this.points.forEach((point, id) => {
      if (predicate(point)) {
        matches.push(id);
      }
    });
    return matches;
  }
}
export type ProjectionType = 'tsne' | 'umap' | 'pca' | 'custom';
export class Projection {
  constructor(
    public projectionType: ProjectionType,
    public projectionComponents: ProjectionComponents3D,
    public dimensionality: number,
    public dataSet: DataSet
  ) {}
}
export interface ColorOption {
  name: string;
  desc?: string;
  map?: (value: string | number) => string;
  /** List of items for the color map. Defined only for categorical map. */
  items?: {
    label: string;
    count: number;
  }[];
  /** Threshold values and their colors. Defined for gradient color map. */
  thresholds?: {
    value: number;
    color: string;
  }[];
  isSeparator?: boolean;
  tooManyUniqueValues?: boolean;
}
/**
 * An interface that holds all the data for serializing the current state of
 * the world.
 */
export class State {
  /** A label identifying this state. */
  label: string = '';
  /** Whether this State is selected in the bookmarks pane. */
  isSelected: boolean = false;
  /** The selected projection tab. */
  selectedProjection: ProjectionType;
  /** Dimensions of the DataSet. */
  dataSetDimensions: [number, number];
  /** t-SNE parameters */
  tSNEIteration: number = 0;
  tSNEPerplexity: number = 0;
  tSNELearningRate: number = 0;
  tSNEis3d: boolean = true;
  /** UMAP parameters */
  umapIs3d: boolean = true;
  umapNeighbors: number = 15;
  umapMinDist: number = 0.1;
  /** PCA projection component dimensions */
  pcaComponentDimensions: number[] = [];
  /** Custom projection parameters */
  customSelectedSearchByMetadataOption: string;
  customXLeftText: string;
  customXLeftRegex: boolean;
  customXRightText: string;
  customXRightRegex: boolean;
  customYUpText: string;
  customYUpRegex: boolean;
  customYDownText: string;
  customYDownRegex: boolean;
  /** The computed projections of the tensors. */
  projections: Array<{
    [key: string]: number;
  }> = [];
  /** Filtered dataset indices. */
  filteredPoints: number[];
  /** The indices of selected points. */
  selectedPoints: number[] = [];
  /** The shuffled indices of points. */
  shuffledDataIndices: number[] = [];
  /** Camera state (2d/3d, position, target, zoom, etc). */
  cameraDef: CameraDef;
  /** Color by option. */
  selectedColorOptionName: string;
  forceCategoricalColoring: boolean;
  /** Label by option. */
  selectedLabelOption: string;
}
export function getProjectionComponents(
  projection: ProjectionType,
  components: (number | string)[]
): ProjectionComponents3D {
  if (components.length > 3) {
    throw new RangeError('components length must be <= 3');
  }
  const projectionComponents: [string | null, string | null, string | null] = [
    null,
    null,
    null,
  ];
  const prefix = projection === 'custom' ? 'linear' : projection;
  for (let i = 0; i < components.length; ++i) {
    if (components[i] == null) {
      continue;
    }
    projectionComponents[i] = prefix + '-' + components[i];
  }
  return projectionComponents as [string, string, string];
}
export function stateGetAccessorDimensions(
  state: State
): Array<number | string> {
  let dimensions: Array<number | string>;
  switch (state.selectedProjection) {
    case 'pca':
      dimensions = state.pcaComponentDimensions.slice();
      break;
    case 'tsne':
      dimensions = [0, 1];
      if (state.tSNEis3d) {
        dimensions.push(2);
      }
      break;
    case 'umap':
      dimensions = [0, 1];
      if (state.umapIs3d) {
        dimensions.push(2);
      }
      break;
    case 'custom':
      dimensions = ['x', 'y'];
      break;
    default:
      throw new Error('Unexpected fallthrough');
  }
  return dimensions;
}
