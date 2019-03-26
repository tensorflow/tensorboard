var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
    var IS_FIREFOX = navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
    /** Controls whether nearest neighbors computation is done on the GPU or CPU. */
    var KNN_GPU_ENABLED = vz_projector.util.hasWebGLSupport() && !IS_FIREFOX;
    vz_projector.TSNE_SAMPLE_SIZE = 10000;
    vz_projector.UMAP_SAMPLE_SIZE = 5000;
    vz_projector.PCA_SAMPLE_SIZE = 50000;
    /** Number of dimensions to sample when doing approximate PCA. */
    vz_projector.PCA_SAMPLE_DIM = 200;
    /** Number of pca components to compute. */
    var NUM_PCA_COMPONENTS = 10;
    /** Id of message box used for umap optimization progress bar. */
    var UMAP_MSG_ID = 'umap-optimization';
    /**
     * Reserved metadata attributes used for sequence information
     * NOTE: Use "__seq_next__" as "__next__" is deprecated.
     */
    var SEQUENCE_METADATA_ATTRS = ['__next__', '__seq_next__'];
    function getSequenceNextPointIndex(pointMetadata) {
        var sequenceAttr = null;
        for (var _i = 0, SEQUENCE_METADATA_ATTRS_1 = SEQUENCE_METADATA_ATTRS; _i < SEQUENCE_METADATA_ATTRS_1.length; _i++) {
            var metadataAttr = SEQUENCE_METADATA_ATTRS_1[_i];
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
    var DataSet = /** @class */ (function () {
        /** Creates a new Dataset */
        function DataSet(points, spriteAndMetadataInfo) {
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
        DataSet.prototype.computeSequences = function (points) {
            // Keep a list of indices seen so we don't compute sequences for a given
            // point twice.
            var indicesSeen = new Int8Array(points.length);
            // Compute sequences.
            var indexToSequence = {};
            var sequences = [];
            for (var i = 0; i < points.length; i++) {
                if (indicesSeen[i]) {
                    continue;
                }
                indicesSeen[i] = 1;
                // Ignore points without a sequence attribute.
                var next = getSequenceNextPointIndex(points[i].metadata);
                if (next == null) {
                    continue;
                }
                if (next in indexToSequence) {
                    var existingSequence = indexToSequence[next];
                    // Pushing at the beginning of the array.
                    existingSequence.pointIndices.unshift(i);
                    indexToSequence[i] = existingSequence;
                    continue;
                }
                // The current point is pointing to a new/unseen sequence.
                var newSequence = { pointIndices: [] };
                indexToSequence[i] = newSequence;
                sequences.push(newSequence);
                var currentIndex = i;
                while (points[currentIndex]) {
                    newSequence.pointIndices.push(currentIndex);
                    var next_1 = getSequenceNextPointIndex(points[currentIndex].metadata);
                    if (next_1 != null) {
                        indicesSeen[next_1] = 1;
                        currentIndex = next_1;
                    }
                    else {
                        currentIndex = -1;
                    }
                }
            }
            return sequences;
        };
        DataSet.prototype.projectionCanBeRendered = function (projection) {
            if (projection !== 'tsne') {
                return true;
            }
            return this.tSNEIteration > 0;
        };
        /**
         * Returns a new subset dataset by copying out data. We make a copy because
         * we have to modify the vectors by normalizing them.
         *
         * @param subset Array of indices of points that we want in the subset.
         *
         * @return A subset of the original dataset.
         */
        DataSet.prototype.getSubset = function (subset) {
            var _this = this;
            var pointsSubset = ((subset != null) && (subset.length > 0)) ?
                subset.map(function (i) { return _this.points[i]; }) :
                this.points;
            var points = pointsSubset.map(function (dp) {
                return {
                    metadata: dp.metadata,
                    index: dp.index,
                    vector: dp.vector.slice(),
                    projections: {}
                };
            });
            return new DataSet(points, this.spriteAndMetadataInfo);
        };
        /**
         * Computes the centroid, shifts all points to that centroid,
         * then makes them all unit norm.
         */
        DataSet.prototype.normalize = function () {
            // Compute the centroid of all data points.
            var centroid = vz_projector.vector.centroid(this.points, function (a) { return a.vector; });
            if (centroid == null) {
                throw Error('centroid should not be null');
            }
            // Shift all points by the centroid and make them unit norm.
            for (var id = 0; id < this.points.length; ++id) {
                var dataPoint = this.points[id];
                dataPoint.vector = vz_projector.vector.sub(dataPoint.vector, centroid);
                if (vz_projector.vector.norm2(dataPoint.vector) > 0) {
                    // If we take the unit norm of a vector of all 0s, we get a vector of
                    // all NaNs. We prevent that with a guard.
                    vz_projector.vector.unit(dataPoint.vector);
                }
            }
        };
        /** Projects the dataset onto a given vector and caches the result. */
        DataSet.prototype.projectLinear = function (dir, label) {
            this.projections[label] = true;
            this.points.forEach(function (dataPoint) {
                dataPoint.projections[label] = vz_projector.vector.dot(dataPoint.vector, dir);
            });
        };
        /** Projects the dataset along the top 10 principal components. */
        DataSet.prototype.projectPCA = function () {
            var _this = this;
            if (this.projections['pca-0'] != null) {
                return Promise.resolve(null);
            }
            return vz_projector.util.runAsyncTask('Computing PCA...', function () {
                // Approximate pca vectors by sampling the dimensions.
                var dim = _this.points[0].vector.length;
                var vectors = _this.shuffledDataIndices.map(function (i) { return _this.points[i].vector; });
                if (dim > vz_projector.PCA_SAMPLE_DIM) {
                    vectors = vz_projector.vector.projectRandom(vectors, vz_projector.PCA_SAMPLE_DIM);
                }
                var sampledVectors = vectors.slice(0, vz_projector.PCA_SAMPLE_SIZE);
                var dot = numeric.dot, transpose = numeric.transpose, numericSvd = numeric.svd;
                // numeric dynamically generates `numeric.div` and Closure compiler has
                // incorrectly compiles `numeric.div` property accessor. We use below
                // signature to prevent Closure from mangling and guessing.
                var div = numeric['div'];
                var scalar = dot(transpose(sampledVectors), sampledVectors);
                var sigma = div(scalar, sampledVectors.length);
                var svd = numericSvd(sigma);
                var variances = svd.S;
                var totalVariance = 0;
                for (var i = 0; i < variances.length; ++i) {
                    totalVariance += variances[i];
                }
                for (var i = 0; i < variances.length; ++i) {
                    variances[i] /= totalVariance;
                }
                _this.fracVariancesExplained = variances;
                var U = svd.U;
                var pcaVectors = vectors.map(function (vector) {
                    var newV = new Float32Array(NUM_PCA_COMPONENTS);
                    for (var newDim = 0; newDim < NUM_PCA_COMPONENTS; newDim++) {
                        var dot_1 = 0;
                        for (var oldDim = 0; oldDim < vector.length; oldDim++) {
                            dot_1 += vector[oldDim] * U[oldDim][newDim];
                        }
                        newV[newDim] = dot_1;
                    }
                    return newV;
                });
                for (var d = 0; d < NUM_PCA_COMPONENTS; d++) {
                    var label = 'pca-' + d;
                    _this.projections[label] = true;
                    for (var i = 0; i < pcaVectors.length; i++) {
                        var pointIndex = _this.shuffledDataIndices[i];
                        _this.points[pointIndex].projections[label] = pcaVectors[i][d];
                    }
                }
            });
        };
        /** Runs tsne on the data. */
        DataSet.prototype.projectTSNE = function (perplexity, learningRate, tsneDim, stepCallback) {
            var _this = this;
            this.hasTSNERun = true;
            var k = Math.floor(3 * perplexity);
            var opt = { epsilon: learningRate, perplexity: perplexity, dim: tsneDim };
            this.tsne = new vz_projector.TSNE(opt);
            this.tsne.setSupervision(this.superviseLabels, this.superviseInput);
            this.tsne.setSuperviseFactor(this.superviseFactor);
            this.tSNEShouldPause = false;
            this.tSNEShouldStop = false;
            this.tSNEIteration = 0;
            var sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.TSNE_SAMPLE_SIZE);
            var step = function () {
                if (_this.tSNEShouldStop) {
                    _this.projections['tsne'] = false;
                    stepCallback(null);
                    _this.tsne = null;
                    _this.hasTSNERun = false;
                    return;
                }
                if (!_this.tSNEShouldPause) {
                    _this.tsne.step();
                    var result_1 = _this.tsne.getSolution();
                    sampledIndices.forEach(function (index, i) {
                        var dataPoint = _this.points[index];
                        dataPoint.projections['tsne-0'] = result_1[i * tsneDim + 0];
                        dataPoint.projections['tsne-1'] = result_1[i * tsneDim + 1];
                        if (tsneDim === 3) {
                            dataPoint.projections['tsne-2'] = result_1[i * tsneDim + 2];
                        }
                    });
                    _this.projections['tsne'] = true;
                    _this.tSNEIteration++;
                    stepCallback(_this.tSNEIteration);
                }
                requestAnimationFrame(step);
            };
            var sampledData = sampledIndices.map(function (i) { return _this.points[i]; });
            var knnComputation = this.computeKnn(sampledData, k);
            knnComputation.then(function (nearest) {
                _this.nearest = nearest;
                vz_projector.util.runAsyncTask('Initializing T-SNE...', function () {
                    _this.tsne.initDataDist(_this.nearest);
                }).then(step);
            });
        };
        /** Runs UMAP on the data. */
        DataSet.prototype.projectUmap = function (nComponents, nNeighbors, stepCallback) {
            return __awaiter(this, void 0, void 0, function () {
                var currentEpoch, epochStepSize, sampledIndices, sampledData, X, _a, nEpochs;
                var _this = this;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.hasUmapRun = true;
                            this.umap = new UMAP({ nComponents: nComponents, nNeighbors: nNeighbors });
                            currentEpoch = 0;
                            epochStepSize = 10;
                            sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.UMAP_SAMPLE_SIZE);
                            sampledData = sampledIndices.map(function (i) { return _this.points[i]; });
                            X = sampledData.map(function (x) { return Array.from(x.vector); });
                            _a = this;
                            return [4 /*yield*/, this.computeKnn(sampledData, nNeighbors)];
                        case 1:
                            _a.nearest = _b.sent();
                            return [4 /*yield*/, vz_projector.util.runAsyncTask('Initializing UMAP...', function () {
                                    var knnIndices = _this.nearest.map(function (row) { return row.map(function (entry) { return entry.index; }); });
                                    var knnDistances = _this.nearest.map(function (row) {
                                        return row.map(function (entry) { return entry.dist; });
                                    });
                                    // Initialize UMAP and return the number of epochs.
                                    return _this.umap.initializeFit(X, knnIndices, knnDistances);
                                }, UMAP_MSG_ID)];
                        case 2:
                            nEpochs = _b.sent();
                            // Now, iterate through all epoch batches of the UMAP optimization, updating
                            // the modal window with the progress rather than animating each step since
                            // the UMAP animation is not nearly as informative as t-SNE.
                            return [2 /*return*/, new Promise(function (resolve, reject) {
                                    var step = function () {
                                        // Compute a batch of epochs since we don't want to update the UI
                                        // on every epoch.
                                        var epochsBatch = Math.min(epochStepSize, nEpochs - currentEpoch);
                                        for (var i = 0; i < epochsBatch; i++) {
                                            currentEpoch = _this.umap.step();
                                        }
                                        var progressMsg = "Optimizing UMAP (epoch " + currentEpoch + " of " + nEpochs + ")";
                                        // Wrap the logic in a util.runAsyncTask in order to correctly update
                                        // the modal with the progress of the optimization.
                                        vz_projector.util.runAsyncTask(progressMsg, function () {
                                            if (currentEpoch < nEpochs) {
                                                requestAnimationFrame(step);
                                            }
                                            else {
                                                var result_2 = _this.umap.getEmbedding();
                                                sampledIndices.forEach(function (index, i) {
                                                    var dataPoint = _this.points[index];
                                                    dataPoint.projections['umap-0'] = result_2[i][0];
                                                    dataPoint.projections['umap-1'] = result_2[i][1];
                                                    if (nComponents === 3) {
                                                        dataPoint.projections['umap-2'] = result_2[i][2];
                                                    }
                                                });
                                                _this.projections['umap'] = true;
                                                vz_projector.logging.setModalMessage(null, UMAP_MSG_ID);
                                                _this.hasUmapRun = true;
                                                stepCallback(currentEpoch);
                                                resolve();
                                            }
                                        }, UMAP_MSG_ID, 0).catch(function (error) {
                                            vz_projector.logging.setModalMessage(null, UMAP_MSG_ID);
                                            reject(error);
                                        });
                                    };
                                    requestAnimationFrame(step);
                                })];
                    }
                });
            });
        };
        /** Computes KNN to provide to the UMAP and t-SNE algorithms. */
        DataSet.prototype.computeKnn = function (data, nNeighbors) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(this.nearest != null && nNeighbors <= this.nearest.length)) return [3 /*break*/, 1];
                            // We found the nearest neighbors before and will reuse them.
                            return [2 /*return*/, Promise.resolve(this.nearest)];
                        case 1: return [4 /*yield*/, (KNN_GPU_ENABLED ?
                                vz_projector.knn.findKNNGPUCosine(data, nNeighbors, (function (d) { return d.vector; })) :
                                vz_projector.knn.findKNN(data, nNeighbors, (function (d) { return d.vector; }), function (a, b) { return vz_projector.vector.cosDistNorm(a, b); }))];
                        case 2:
                            result = _a.sent();
                            this.nearest = result;
                            return [2 /*return*/, Promise.resolve(result)];
                    }
                });
            });
        };
        /* Perturb TSNE and update dataset point coordinates. */
        DataSet.prototype.perturbTsne = function () {
            var _this = this;
            if (this.hasTSNERun && this.tsne) {
                this.tsne.perturb();
                var tsneDim_1 = this.tsne.getDim();
                var result_3 = this.tsne.getSolution();
                var sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.TSNE_SAMPLE_SIZE);
                sampledIndices.forEach(function (index, i) {
                    var dataPoint = _this.points[index];
                    dataPoint.projections['tsne-0'] = result_3[i * tsneDim_1 + 0];
                    dataPoint.projections['tsne-1'] = result_3[i * tsneDim_1 + 1];
                    if (tsneDim_1 === 3) {
                        dataPoint.projections['tsne-2'] = result_3[i * tsneDim_1 + 2];
                    }
                });
            }
        };
        DataSet.prototype.setSupervision = function (superviseColumn, superviseInput) {
            var _this = this;
            if (superviseColumn != null) {
                var sampledIndices = this.shuffledDataIndices.slice(0, vz_projector.TSNE_SAMPLE_SIZE);
                var labels_1 = new Array(sampledIndices.length);
                sampledIndices.forEach(function (index, i) {
                    return labels_1[i] = _this.points[index].metadata[superviseColumn].toString();
                });
                this.superviseLabels = labels_1;
            }
            if (superviseInput != null) {
                this.superviseInput = superviseInput;
            }
            if (this.tsne) {
                this.tsne.setSupervision(this.superviseLabels, this.superviseInput);
            }
        };
        DataSet.prototype.setSuperviseFactor = function (superviseFactor) {
            if (superviseFactor != null) {
                this.superviseFactor = superviseFactor;
                if (this.tsne) {
                    this.tsne.setSuperviseFactor(superviseFactor);
                }
            }
        };
        /**
         * Merges metadata to the dataset and returns whether it succeeded.
         */
        DataSet.prototype.mergeMetadata = function (metadata) {
            var _this = this;
            if (metadata.pointsInfo.length !== this.points.length) {
                var errorMessage = "Number of tensors (" + this.points.length + ") do not" +
                    " match the number of lines in metadata" +
                    (" (" + metadata.pointsInfo.length + ").");
                if (metadata.stats.length === 1 &&
                    this.points.length + 1 === metadata.pointsInfo.length) {
                    // If there is only one column of metadata and the number of points is
                    // exactly one less than the number of metadata lines, this is due to an
                    // unnecessary header line in the metadata and we can show a meaningful
                    // error.
                    vz_projector.logging.setErrorMessage(errorMessage + ' Single column metadata should not have a header ' +
                        'row.', 'merging metadata');
                    return false;
                }
                else if (metadata.stats.length > 1 &&
                    this.points.length - 1 === metadata.pointsInfo.length) {
                    // If there are multiple columns of metadata and the number of points is
                    // exactly one greater than the number of lines in the metadata, this
                    // means there is a missing metadata header.
                    vz_projector.logging.setErrorMessage(errorMessage + ' Multi-column metadata should have a header ' +
                        'row with column labels.', 'merging metadata');
                    return false;
                }
                vz_projector.logging.setWarningMessage(errorMessage);
            }
            this.spriteAndMetadataInfo = metadata;
            metadata.pointsInfo.slice(0, this.points.length)
                .forEach(function (m, i) { return _this.points[i].metadata = m; });
            return true;
        };
        DataSet.prototype.stopTSNE = function () {
            this.tSNEShouldStop = true;
        };
        /**
         * Finds the nearest neighbors of the query point using a
         * user-specified distance metric.
         */
        DataSet.prototype.findNeighbors = function (pointIndex, distFunc, numNN) {
            // Find the nearest neighbors of a particular point.
            var neighbors = vz_projector.knn.findKNNofPoint(this.points, pointIndex, numNN, (function (d) { return d.vector; }), distFunc);
            // TODO(@dsmilkov): Figure out why we slice.
            var result = neighbors.slice(0, numNN);
            return result;
        };
        /**
         * Search the dataset based on a metadata field.
         */
        DataSet.prototype.query = function (query, inRegexMode, fieldName) {
            var predicate = vz_projector.util.getSearchPredicate(query, inRegexMode, fieldName);
            var matches = [];
            this.points.forEach(function (point, id) {
                if (predicate(point)) {
                    matches.push(id);
                }
            });
            return matches;
        };
        return DataSet;
    }());
    vz_projector.DataSet = DataSet;
    var Projection = /** @class */ (function () {
        function Projection(projectionType, projectionComponents, dimensionality, dataSet) {
            this.projectionType = projectionType;
            this.projectionComponents = projectionComponents;
            this.dimensionality = dimensionality;
            this.dataSet = dataSet;
        }
        return Projection;
    }());
    vz_projector.Projection = Projection;
    /**
     * An interface that holds all the data for serializing the current state of
     * the world.
     */
    var State = /** @class */ (function () {
        function State() {
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
        return State;
    }());
    vz_projector.State = State;
    function getProjectionComponents(projection, components) {
        if (components.length > 3) {
            throw new RangeError('components length must be <= 3');
        }
        var projectionComponents = [null, null, null];
        var prefix = (projection === 'custom') ? 'linear' : projection;
        for (var i = 0; i < components.length; ++i) {
            if (components[i] == null) {
                continue;
            }
            projectionComponents[i] = prefix + '-' + components[i];
        }
        return projectionComponents;
    }
    vz_projector.getProjectionComponents = getProjectionComponents;
    function stateGetAccessorDimensions(state) {
        var dimensions;
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
