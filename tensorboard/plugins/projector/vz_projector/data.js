var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    const IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
    /** Controls whether nearest neighbors computation is done on the GPU or CPU. */
    const KNN_GPU_ENABLED = vz_projector.util.hasWebGLSupport() && !IS_FIREFOX;
    vz_projector.TSNE_SAMPLE_SIZE = 10000;
    vz_projector.UMAP_SAMPLE_SIZE = 5000;
    vz_projector.PCA_SAMPLE_SIZE = 50000;
    /** Number of dimensions to sample when doing approximate PCA. */
    vz_projector.PCA_SAMPLE_DIM = 200;
    /** Number of pca components to compute. */
    const NUM_PCA_COMPONENTS = 10;
    /** Id of message box used for umap optimization progress bar. */
    const UMAP_MSG_ID = 'umap-optimization';
    /**
     * Reserved metadata attributes used for sequence information
     * NOTE: Use "__seq_next__" as "__next__" is deprecated.
     */
    const SEQUENCE_METADATA_ATTRS = ['__next__', '__seq_next__'];
    function getSequenceNextPointIndex(pointMetadata) {
        let sequenceAttr = null;
        for (let metadataAttr of SEQUENCE_METADATA_ATTRS) {
            if (metadataAttr in pointMetadata && pointMetadata[metadataAttr] !== '') {
                sequenceAttr = pointMetadata[metadataAttr];
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
    class DataSet {
        /** Creates a new Dataset */
        constructor(points, spriteAndMetadataInfo) {
            this.shuffledDataIndices = [];
            /**
             * This keeps a list of all current projections so you can easily test to see
             * if it's been calculated already.
             */
            this.projections = {};
            this.tSNEIteration = 0;
            this.tSNEShouldPause = false;
            this.tSNEShouldStop = true;
            this.superviseInput = '';
            this.dim = [0, 0];
            this.hasTSNERun = false;
            this.hasUmapRun = false;
            this.points = points;
            this.shuffledDataIndices = vz_projector.util.shuffle(vz_projector.util.range(this.points.length));
            this.sequences = this.computeSequences(points);
            this.dim = [this.points.length, this.points[0].vector.length];
            this.spriteAndMetadataInfo = spriteAndMetadataInfo;
        }
        computeSequences(points) {
            // Keep a list of indices seen so we don't compute sequences for a given
            // point twice.
            let indicesSeen = new Int8Array(points.length);
            // Compute sequences.
            let indexToSequence = {};
            let sequences = [];
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
                let newSequence = { pointIndices: [] };
                indexToSequence[i] = newSequence;
                sequences.push(newSequence);
                let currentIndex = i;
                while (points[currentIndex]) {
                    newSequence.pointIndices.push(currentIndex);
                    let next = getSequenceNextPointIndex(points[currentIndex].metadata);
                    if (next != null) {
                        indicesSeen[next] = 1;
                        currentIndex = next;
                    }
                    else {
                        currentIndex = -1;
                    }
                }
            }
            return sequences;
        }
        projectionCanBeRendered(projection) {
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
        getSubset(subset) {
            const pointsSubset = subset != null && subset.length > 0
                ? subset.map((i) => this.points[i])
                : this.points;
            let points = pointsSubset.map((dp) => {
                return {
                    metadata: dp.metadata,
                    index: dp.index,
                    vector: dp.vector.slice(),
                    projections: {},
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
            let centroid = vz_projector.vector.centroid(this.points, (a) => a.vector);
            if (centroid == null) {
                throw Error('centroid should not be null');
            }
            // Shift all points by the centroid and make them unit norm.
            for (let id = 0; id < this.points.length; ++id) {
                let dataPoint = this.points[id];
                dataPoint.vector = vz_projector.vector.sub(dataPoint.vector, centroid);
                if (vz_projector.vector.norm2(dataPoint.vector) > 0) {
                    // If we take the unit norm of a vector of all 0s, we get a vector of
                    // all NaNs. We prevent that with a guard.
                    vz_projector.vector.unit(dataPoint.vector);
                }
            }
        }
        /** Projects the dataset onto a given vector and caches the result. */
        projectLinear(dir, label) {
            this.projections[label] = true;
            this.points.forEach((dataPoint) => {
                dataPoint.projections[label] = vz_projector.vector.dot(dataPoint.vector, dir);
            });
        }
        /** Projects the dataset along the top 10 principal components. */
        projectPCA() {
            if (this.projections['pca-0'] != null) {
                return Promise.resolve(null);
            }
            return vz_projector.util.runAsyncTask('Computing PCA...', () => {
                // Approximate pca vectors by sampling the dimensions.
                let dim = this.points[0].vector.length;
                let vectors = this.shuffledDataIndices.map((i) => this.points[i].vector);
                if (dim > vz_projector.PCA_SAMPLE_DIM) {
                    vectors = vz_projector.vector.projectRandom(vectors, vz_projector.PCA_SAMPLE_DIM);
                }
                const sampledVectors = vectors.slice(0, vz_projector.PCA_SAMPLE_SIZE);
                const { dot, transpose, svd: numericSvd } = numeric;
                // numeric dynamically generates `numeric.div` and Closure compiler has
                // incorrectly compiles `numeric.div` property accessor. We use below
                // signature to prevent Closure from mangling and guessing.
                const div = numeric['div'];
                const scalar = dot(transpose(sampledVectors), sampledVectors);
                const sigma = div(scalar, sampledVectors.length);
                const svd = numericSvd(sigma);
                const variances = svd.S;
                let totalVariance = 0;
                for (let i = 0; i < variances.length; ++i) {
                    totalVariance += variances[i];
                }
                for (let i = 0; i < variances.length; ++i) {
                    variances[i] /= totalVariance;
                }
                this.fracVariancesExplained = variances;
                let U = svd.U;
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
        projectTSNE(perplexity, learningRate, tsneDim, stepCallback) {
            this.hasTSNERun = true;
            let k = Math.floor(3 * perplexity);
            let opt = { epsilon: learningRate, perplexity: perplexity, dim: tsneDim };
            this.tsne = new vz_projector.TSNE(opt);
            this.tsne.setSupervision(this.superviseLabels, this.superviseInput);
            this.tsne.setSuperviseFactor(this.superviseFactor);
            this.tSNEShouldPause = false;
            this.tSNEShouldStop = false;
            this.tSNEIteration = 0;
            let sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.TSNE_SAMPLE_SIZE);
            let step = () => {
                if (this.tSNEShouldStop) {
                    this.projections['tsne'] = false;
                    stepCallback(null);
                    this.tsne = null;
                    this.hasTSNERun = false;
                    return;
                }
                if (!this.tSNEShouldPause) {
                    this.tsne.step();
                    let result = this.tsne.getSolution();
                    sampledIndices.forEach((index, i) => {
                        let dataPoint = this.points[index];
                        dataPoint.projections['tsne-0'] = result[i * tsneDim + 0];
                        dataPoint.projections['tsne-1'] = result[i * tsneDim + 1];
                        if (tsneDim === 3) {
                            dataPoint.projections['tsne-2'] = result[i * tsneDim + 2];
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
                vz_projector.util
                    .runAsyncTask('Initializing T-SNE...', () => {
                    this.tsne.initDataDist(nearest);
                })
                    .then(step);
            });
        }
        /** Runs UMAP on the data. */
        projectUmap(nComponents, nNeighbors, stepCallback) {
            return __awaiter(this, void 0, void 0, function* () {
                this.hasUmapRun = true;
                this.umap = new UMAP({ nComponents, nNeighbors });
                let currentEpoch = 0;
                const epochStepSize = 10;
                const sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.UMAP_SAMPLE_SIZE);
                const sampledData = sampledIndices.map((i) => this.points[i]);
                // TODO: Switch to a Float32-based UMAP internal
                const X = sampledData.map((x) => Array.from(x.vector));
                const nearest = yield this.computeKnn(sampledData, nNeighbors);
                const nEpochs = yield vz_projector.util.runAsyncTask('Initializing UMAP...', () => {
                    const knnIndices = nearest.map((row) => row.map((entry) => entry.index));
                    const knnDistances = nearest.map((row) => row.map((entry) => entry.dist));
                    // Initialize UMAP and return the number of epochs.
                    this.umap.setPrecomputedKNN(knnIndices, knnDistances);
                    return this.umap.initializeFit(X);
                }, UMAP_MSG_ID);
                // Now, iterate through all epoch batches of the UMAP optimization, updating
                // the modal window with the progress rather than animating each step since
                // the UMAP animation is not nearly as informative as t-SNE.
                return new Promise((resolve, reject) => {
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
                        vz_projector.util
                            .runAsyncTask(progressMsg, () => {
                            if (currentEpoch < nEpochs) {
                                requestAnimationFrame(step);
                            }
                            else {
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
                                vz_projector.logging.setModalMessage(null, UMAP_MSG_ID);
                                this.hasUmapRun = true;
                                stepCallback(currentEpoch);
                                resolve();
                            }
                        }, UMAP_MSG_ID, 0)
                            .catch((error) => {
                            vz_projector.logging.setModalMessage(null, UMAP_MSG_ID);
                            reject(error);
                        });
                    };
                    requestAnimationFrame(step);
                });
            });
        }
        /** Computes KNN to provide to the UMAP and t-SNE algorithms. */
        computeKnn(data, nNeighbors) {
            return __awaiter(this, void 0, void 0, function* () {
                // Handle the case where we've previously found the nearest neighbors.
                const previouslyComputedNNeighbors = this.nearest && this.nearest.length ? this.nearest[0].length : 0;
                if (this.nearest != null && previouslyComputedNNeighbors >= nNeighbors) {
                    return Promise.resolve(this.nearest.map((neighbors) => neighbors.slice(0, nNeighbors)));
                }
                else {
                    const result = yield (KNN_GPU_ENABLED
                        ? vz_projector.knn.findKNNGPUCosine(data, nNeighbors, (d) => d.vector)
                        : vz_projector.knn.findKNN(data, nNeighbors, (d) => d.vector, (a, b) => vz_projector.vector.cosDistNorm(a, b)));
                    this.nearest = result;
                    return Promise.resolve(result);
                }
            });
        }
        /* Perturb TSNE and update dataset point coordinates. */
        perturbTsne() {
            if (this.hasTSNERun && this.tsne) {
                this.tsne.perturb();
                let tsneDim = this.tsne.getDim();
                let result = this.tsne.getSolution();
                let sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.TSNE_SAMPLE_SIZE);
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
        setSupervision(superviseColumn, superviseInput) {
            if (superviseColumn != null) {
                let sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.TSNE_SAMPLE_SIZE);
                let labels = new Array(sampledIndices.length);
                sampledIndices.forEach((index, i) => (labels[i] = this.points[index].metadata[superviseColumn].toString()));
                this.superviseLabels = labels;
            }
            if (superviseInput != null) {
                this.superviseInput = superviseInput;
            }
            if (this.tsne) {
                this.tsne.setSupervision(this.superviseLabels, this.superviseInput);
            }
        }
        setSuperviseFactor(superviseFactor) {
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
        mergeMetadata(metadata) {
            if (metadata.pointsInfo.length !== this.points.length) {
                let errorMessage = `Number of tensors (${this.points.length}) do not` +
                    ` match the number of lines in metadata` +
                    ` (${metadata.pointsInfo.length}).`;
                if (metadata.stats.length === 1 &&
                    this.points.length + 1 === metadata.pointsInfo.length) {
                    // If there is only one column of metadata and the number of points is
                    // exactly one less than the number of metadata lines, this is due to an
                    // unnecessary header line in the metadata and we can show a meaningful
                    // error.
                    vz_projector.logging.setErrorMessage(errorMessage +
                        ' Single column metadata should not have a header ' +
                        'row.', 'merging metadata');
                    return false;
                }
                else if (metadata.stats.length > 1 &&
                    this.points.length - 1 === metadata.pointsInfo.length) {
                    // If there are multiple columns of metadata and the number of points is
                    // exactly one greater than the number of lines in the metadata, this
                    // means there is a missing metadata header.
                    vz_projector.logging.setErrorMessage(errorMessage +
                        ' Multi-column metadata should have a header ' +
                        'row with column labels.', 'merging metadata');
                    return false;
                }
                vz_projector.logging.setWarningMessage(errorMessage);
            }
            this.spriteAndMetadataInfo = metadata;
            metadata.pointsInfo
                .slice(0, this.points.length)
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
        findNeighbors(pointIndex, distFunc, numNN) {
            // Find the nearest neighbors of a particular point.
            let neighbors = vz_projector.knn.findKNNofPoint(this.points, pointIndex, numNN, (d) => d.vector, distFunc);
            // TODO(@dsmilkov): Figure out why we slice.
            let result = neighbors.slice(0, numNN);
            return result;
        }
        /**
         * Search the dataset based on a metadata field.
         */
        query(query, inRegexMode, fieldName) {
            let predicate = vz_projector.util.getSearchPredicate(query, inRegexMode, fieldName);
            let matches = [];
            this.points.forEach((point, id) => {
                if (predicate(point)) {
                    matches.push(id);
                }
            });
            return matches;
        }
    }
    vz_projector.DataSet = DataSet;
    class Projection {
        constructor(projectionType, projectionComponents, dimensionality, dataSet) {
            this.projectionType = projectionType;
            this.projectionComponents = projectionComponents;
            this.dimensionality = dimensionality;
            this.dataSet = dataSet;
        }
    }
    vz_projector.Projection = Projection;
    /**
     * An interface that holds all the data for serializing the current state of
     * the world.
     */
    class State {
        constructor() {
            /** A label identifying this state. */
            this.label = '';
            /** Whether this State is selected in the bookmarks pane. */
            this.isSelected = false;
            /** t-SNE parameters */
            this.tSNEIteration = 0;
            this.tSNEPerplexity = 0;
            this.tSNELearningRate = 0;
            this.tSNEis3d = true;
            /** UMAP parameters */
            this.umapIs3d = true;
            this.umapNeighbors = 15;
            /** PCA projection component dimensions */
            this.pcaComponentDimensions = [];
            /** The computed projections of the tensors. */
            this.projections = [];
            /** The indices of selected points. */
            this.selectedPoints = [];
        }
    }
    vz_projector.State = State;
    function getProjectionComponents(projection, components) {
        if (components.length > 3) {
            throw new RangeError('components length must be <= 3');
        }
        const projectionComponents = [null, null, null];
        const prefix = projection === 'custom' ? 'linear' : projection;
        for (let i = 0; i < components.length; ++i) {
            if (components[i] == null) {
                continue;
            }
            projectionComponents[i] = prefix + '-' + components[i];
        }
        return projectionComponents;
    }
    vz_projector.getProjectionComponents = getProjectionComponents;
    function stateGetAccessorDimensions(state) {
        let dimensions;
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
    vz_projector.stateGetAccessorDimensions = stateGetAccessorDimensions;
})(vz_projector || (vz_projector = {})); // namespace vz_projector
