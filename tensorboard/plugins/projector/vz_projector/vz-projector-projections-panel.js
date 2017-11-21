var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
    var NUM_PCA_COMPONENTS = 10;
    // tslint:disable-next-line
    vz_projector.ProjectionsPanelPolymer = vz_projector.PolymerElement({
        is: 'vz-projector-projections-panel',
        properties: {
            pcaIs3d: { type: Boolean, value: true, observer: '_pcaDimensionToggleObserver' },
            tSNEis3d: { type: Boolean, value: true, observer: '_tsneDimensionToggleObserver' },
            // PCA projection.
            pcaComponents: Array,
            pcaX: { type: Number, value: 0, observer: 'showPCAIfEnabled' },
            pcaY: { type: Number, value: 1, observer: 'showPCAIfEnabled' },
            pcaZ: { type: Number, value: 2, observer: 'showPCAIfEnabled' },
            // Custom projection.
            customSelectedSearchByMetadataOption: {
                type: String,
                observer: '_customSelectedSearchByMetadataOptionChanged'
            },
        }
    });
    /**
     * A polymer component which handles the projection tabs in the projector.
     */
    var ProjectionsPanel = /** @class */ (function (_super) {
        __extends(ProjectionsPanel, _super);
        function ProjectionsPanel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ProjectionsPanel.prototype.initialize = function (projector) {
            this.polymerChangesTriggerReprojection = true;
            this.projector = projector;
            // Set up TSNE projections.
            this.perplexity = 30;
            this.learningRate = 10;
            // Setup Custom projections.
            this.centroidValues = { xLeft: null, xRight: null, yUp: null, yDown: null };
            this.clearCentroids();
            this.setupUIControls();
        };
        ProjectionsPanel.prototype.ready = function () {
            this.zDropdown = this.querySelector('#z-dropdown');
            this.runTsneButton = this.querySelector('.run-tsne');
            this.pauseTsneButton = this.querySelector('.pause-tsne');
            this.perturbTsneButton = this.querySelector('.perturb-tsne');
            this.perplexitySlider =
                this.querySelector('#perplexity-slider');
            this.learningRateInput =
                this.querySelector('#learning-rate-slider');
            this.perturbFactorInput =
                this.querySelector('#perturb-factor-slider');
            this.iterationLabel = this.querySelector('.run-tsne-iter');
        };
        ProjectionsPanel.prototype.disablePolymerChangesTriggerReprojection = function () {
            this.polymerChangesTriggerReprojection = false;
        };
        ProjectionsPanel.prototype.enablePolymerChangesTriggerReprojection = function () {
            this.polymerChangesTriggerReprojection = true;
        };
        ProjectionsPanel.prototype.updateTSNEPerplexityFromSliderChange = function () {
            if (this.perplexitySlider) {
                this.perplexity = +this.perplexitySlider.value;
            }
            this.querySelector('.tsne-perplexity span').innerText =
                '' + this.perplexity;
        };
        ProjectionsPanel.prototype.updateTSNELearningRateFromUIChange = function () {
            if (this.learningRateInput) {
                this.learningRate = Math.pow(10, +this.learningRateInput.value);
            }
            this.querySelector('.tsne-learning-rate span')
                .innerText = '' + this.learningRate;
        };
        ProjectionsPanel.prototype.updateTSNEPerturbFactorFromUIChange = function () {
            if (this.perturbFactorInput && this.dataSet) {
                this.dataSet.perturbFactor = +this.perturbFactorInput.value;
            }
            this.querySelector('.tsne-perturb-factor span')
                .innerText = '' + this.perturbFactorInput.value;
        };
        ProjectionsPanel.prototype.setupUIControls = function () {
            var _this = this;
            {
                var self_1 = this;
                var inkTabs = this.querySelectorAll('.ink-tab');
                for (var i = 0; i < inkTabs.length; i++) {
                    inkTabs[i].addEventListener('click', function () {
                        var id = this.getAttribute('data-tab');
                        self_1.showTab(id);
                    });
                }
            }
            this.runTsneButton.addEventListener('click', function () {
                if (_this.dataSet.hasTSNERun) {
                    _this.dataSet.stopTSNE();
                }
                else {
                    _this.runTSNE();
                }
            });
            this.pauseTsneButton.addEventListener('click', function () {
                if (_this.dataSet.tSNEShouldPause) {
                    _this.dataSet.tSNEShouldPause = false;
                    _this.perturbTsneButton.disabled = false;
                    _this.pauseTsneButton.innerText = 'Pause';
                }
                else {
                    _this.dataSet.tSNEShouldPause = true;
                    _this.perturbTsneButton.disabled = true;
                    _this.pauseTsneButton.innerText = 'Resume';
                }
            });
            this.perturbTsneButton.addEventListener('click', function () {
                _this.dataSet.tSNEShouldPerturb = !_this.dataSet.tSNEShouldPerturb;
            });
            this.perplexitySlider.value = this.perplexity.toString();
            this.perplexitySlider.addEventListener('change', function () { return _this.updateTSNEPerplexityFromSliderChange(); });
            this.updateTSNEPerplexityFromSliderChange();
            this.learningRateInput.addEventListener('change', function () { return _this.updateTSNELearningRateFromUIChange(); });
            this.updateTSNELearningRateFromUIChange();
            this.perturbFactorInput.addEventListener('change', function () { return _this.updateTSNEPerturbFactorFromUIChange(); });
            this.updateTSNEPerturbFactorFromUIChange();
            this.setupCustomProjectionInputFields();
            // TODO: figure out why `--paper-input-container-input` css mixin didn't
            // work.
            var inputs = this.querySelectorAll('paper-dropdown-menu paper-input input');
            for (var i = 0; i < inputs.length; i++) {
                inputs[i].style.fontSize = '14px';
            }
        };
        ProjectionsPanel.prototype.restoreUIFromBookmark = function (bookmark) {
            this.disablePolymerChangesTriggerReprojection();
            // PCA
            this.pcaX = bookmark.pcaComponentDimensions[0];
            this.pcaY = bookmark.pcaComponentDimensions[1];
            if (bookmark.pcaComponentDimensions.length === 3) {
                this.pcaZ = bookmark.pcaComponentDimensions[2];
            }
            this.pcaIs3d = (bookmark.pcaComponentDimensions.length === 3);
            // t-SNE
            if (this.perplexitySlider) {
                this.perplexitySlider.value = bookmark.tSNEPerplexity.toString();
            }
            if (this.learningRateInput) {
                this.learningRateInput.value = bookmark.tSNELearningRate.toString();
            }
            this.tSNEis3d = bookmark.tSNEis3d;
            // custom
            this.customSelectedSearchByMetadataOption =
                bookmark.customSelectedSearchByMetadataOption;
            if (this.customProjectionXLeftInput) {
                this.customProjectionXLeftInput.set(bookmark.customXLeftText, bookmark.customXLeftRegex);
            }
            if (this.customProjectionXRightInput) {
                this.customProjectionXRightInput.set(bookmark.customXRightText, bookmark.customXRightRegex);
            }
            if (this.customProjectionYUpInput) {
                this.customProjectionYUpInput.set(bookmark.customYUpText, bookmark.customYUpRegex);
            }
            if (this.customProjectionYDownInput) {
                this.customProjectionYDownInput.set(bookmark.customYDownText, bookmark.customYDownRegex);
            }
            this.computeAllCentroids();
            this.setZDropdownEnabled(this.pcaIs3d);
            this.updateTSNEPerplexityFromSliderChange();
            this.updateTSNELearningRateFromUIChange();
            this.updateTSNEPerturbFactorFromUIChange();
            if (this.iterationLabel) {
                this.iterationLabel.innerText = bookmark.tSNEIteration.toString();
            }
            if (bookmark.selectedProjection != null) {
                this.showTab(bookmark.selectedProjection);
            }
            this.enablePolymerChangesTriggerReprojection();
        };
        ProjectionsPanel.prototype.populateBookmarkFromUI = function (bookmark) {
            this.disablePolymerChangesTriggerReprojection();
            // PCA
            bookmark.pcaComponentDimensions = [this.pcaX, this.pcaY];
            if (this.pcaIs3d) {
                bookmark.pcaComponentDimensions.push(this.pcaZ);
            }
            // t-SNE
            if (this.perplexitySlider != null) {
                bookmark.tSNEPerplexity = +this.perplexitySlider.value;
            }
            if (this.learningRateInput != null) {
                bookmark.tSNELearningRate = +this.learningRateInput.value;
            }
            bookmark.tSNEis3d = this.tSNEis3d;
            // custom
            bookmark.customSelectedSearchByMetadataOption =
                this.customSelectedSearchByMetadataOption;
            if (this.customProjectionXLeftInput != null) {
                bookmark.customXLeftText = this.customProjectionXLeftInput.getValue();
                bookmark.customXLeftRegex =
                    this.customProjectionXLeftInput.getInRegexMode();
            }
            if (this.customProjectionXRightInput != null) {
                bookmark.customXRightText = this.customProjectionXRightInput.getValue();
                bookmark.customXRightRegex =
                    this.customProjectionXRightInput.getInRegexMode();
            }
            if (this.customProjectionYUpInput != null) {
                bookmark.customYUpText = this.customProjectionYUpInput.getValue();
                bookmark.customYUpRegex = this.customProjectionYUpInput.getInRegexMode();
            }
            if (this.customProjectionYDownInput != null) {
                bookmark.customYDownText = this.customProjectionYDownInput.getValue();
                bookmark.customYDownRegex =
                    this.customProjectionYDownInput.getInRegexMode();
            }
            this.enablePolymerChangesTriggerReprojection();
        };
        // This method is marked as public as it is used as the view method that
        // abstracts DOM manipulation so we can stub it in a test.
        // TODO(nsthorat): Move this to its own class as the glue between this class
        // and the DOM.
        ProjectionsPanel.prototype.setZDropdownEnabled = function (enabled) {
            if (this.zDropdown) {
                if (enabled) {
                    this.zDropdown.removeAttribute('disabled');
                }
                else {
                    this.zDropdown.setAttribute('disabled', 'true');
                }
            }
        };
        ProjectionsPanel.prototype.dataSetUpdated = function (dataSet, originalDataSet, dim) {
            this.dataSet = dataSet;
            this.originalDataSet = originalDataSet;
            this.dim = dim;
            var pointCount = (dataSet == null) ? 0 : dataSet.points.length;
            var perplexity = Math.max(5, Math.ceil(Math.sqrt(pointCount) / 4));
            this.perplexitySlider.value = perplexity.toString();
            this.updateTSNEPerplexityFromSliderChange();
            this.clearCentroids();
            this.querySelector('#tsne-sampling').style.display =
                pointCount > vz_projector.TSNE_SAMPLE_SIZE ? null : 'none';
            var wasSampled = (dataSet == null) ? false : (dataSet.dim[0] > vz_projector.PCA_SAMPLE_DIM ||
                dataSet.dim[1] > vz_projector.PCA_SAMPLE_DIM);
            this.querySelector('#pca-sampling').style.display =
                wasSampled ? null : 'none';
            this.showTab('pca');
        };
        ProjectionsPanel.prototype._pcaDimensionToggleObserver = function () {
            this.setZDropdownEnabled(this.pcaIs3d);
            this.beginProjection(this.currentProjection);
        };
        ProjectionsPanel.prototype._tsneDimensionToggleObserver = function () {
            this.beginProjection(this.currentProjection);
        };
        ProjectionsPanel.prototype.metadataChanged = function (spriteAndMetadata) {
            // Project by options for custom projections.
            var searchByMetadataIndex = -1;
            this.searchByMetadataOptions = spriteAndMetadata.stats.map(function (stats, i) {
                // Make the default label by the first non-numeric column.
                if (!stats.isNumeric && searchByMetadataIndex === -1) {
                    searchByMetadataIndex = i;
                }
                return stats.name;
            });
            this.customSelectedSearchByMetadataOption =
                this.searchByMetadataOptions[Math.max(0, searchByMetadataIndex)];
        };
        ProjectionsPanel.prototype.showTab = function (id) {
            var _this = this;
            this.currentProjection = id;
            var tab = this.querySelector('.ink-tab[data-tab="' + id + '"]');
            var allTabs = this.querySelectorAll('.ink-tab');
            for (var i = 0; i < allTabs.length; i++) {
                vz_projector.util.classed(allTabs[i], 'active', false);
            }
            vz_projector.util.classed(tab, 'active', true);
            var allTabContent = this.querySelectorAll('.ink-panel-content');
            for (var i = 0; i < allTabContent.length; i++) {
                vz_projector.util.classed(allTabContent[i], 'active', false);
            }
            vz_projector.util.classed(this.querySelector('.ink-panel-content[data-panel="' + id + '"]'), 'active', true);
            // guard for unit tests, where polymer isn't attached and $ doesn't exist.
            if (this.$ != null) {
                var main_1 = this.$['main'];
                // In order for the projections panel to animate its height, we need to
                // set it explicitly.
                requestAnimationFrame(function () {
                    _this.style.height = main_1.clientHeight + 'px';
                });
            }
            this.beginProjection(id);
        };
        ProjectionsPanel.prototype.beginProjection = function (projection) {
            if (this.polymerChangesTriggerReprojection === false) {
                return;
            }
            if (projection === 'pca') {
                if (this.dataSet != null) {
                    this.dataSet.stopTSNE();
                }
                this.showPCA();
            }
            else if (projection === 'tsne') {
                this.showTSNE();
            }
            else if (projection === 'custom') {
                if (this.dataSet != null) {
                    this.dataSet.stopTSNE();
                }
                this.computeAllCentroids();
                this.reprojectCustom();
            }
        };
        ProjectionsPanel.prototype.showTSNE = function () {
            var dataSet = this.dataSet;
            if (dataSet == null) {
                return;
            }
            var accessors = vz_projector.getProjectionComponents('tsne', [0, 1, this.tSNEis3d ? 2 : null]);
            var dimensionality = this.tSNEis3d ? 3 : 2;
            var projection = new vz_projector.Projection('tsne', accessors, dimensionality, dataSet);
            this.projector.setProjection(projection);
            if (!this.dataSet.hasTSNERun) {
                this.runTSNE();
            }
            else {
                this.projector.notifyProjectionPositionsUpdated();
            }
        };
        ProjectionsPanel.prototype.runTSNE = function () {
            var _this = this;
            this.runTsneButton.innerText = 'Stop';
            this.runTsneButton.disabled = true;
            this.pauseTsneButton.innerText = 'Pause';
            this.pauseTsneButton.disabled = true;
            this.perturbTsneButton.disabled = true;
            this.dataSet.projectTSNE(this.perplexity, this.learningRate, this.tSNEis3d ? 3 : 2, function (iteration) {
                if (iteration != null) {
                    _this.runTsneButton.disabled = false;
                    _this.pauseTsneButton.disabled = false;
                    _this.perturbTsneButton.disabled = false;
                    _this.iterationLabel.innerText = '' + iteration;
                    _this.projector.notifyProjectionPositionsUpdated();
                }
                else {
                    _this.runTsneButton.innerText = 'Re-run';
                    _this.runTsneButton.disabled = false;
                    _this.pauseTsneButton.innerText = 'Pause';
                    _this.pauseTsneButton.disabled = true;
                    _this.perturbTsneButton.disabled = true;
                }
            });
        };
        // tslint:disable-next-line:no-unused-variable
        ProjectionsPanel.prototype.showPCAIfEnabled = function () {
            if (this.polymerChangesTriggerReprojection) {
                this.showPCA();
            }
        };
        ProjectionsPanel.prototype.updateTotalVarianceMessage = function () {
            var variances = this.dataSet.fracVariancesExplained;
            var totalVariance = variances[this.pcaX] + variances[this.pcaY];
            var msg = 'Total variance described: ';
            if (this.pcaIs3d) {
                totalVariance += variances[this.pcaZ];
            }
            msg += (totalVariance * 100).toFixed(1) + '%.';
            this.querySelector('#total-variance').innerHTML = msg;
        };
        ProjectionsPanel.prototype.showPCA = function () {
            var _this = this;
            if (this.dataSet == null) {
                return;
            }
            this.dataSet.projectPCA().then(function () {
                // Polymer properties are 1-based.
                var accessors = vz_projector.getProjectionComponents('pca', [_this.pcaX, _this.pcaY, _this.pcaZ]);
                var dimensionality = _this.pcaIs3d ? 3 : 2;
                var projection = new vz_projector.Projection('pca', accessors, dimensionality, _this.dataSet);
                _this.projector.setProjection(projection);
                var numComponents = Math.min(NUM_PCA_COMPONENTS, _this.dataSet.dim[1]);
                _this.updateTotalVarianceMessage();
                _this.pcaComponents = vz_projector.util.range(numComponents).map(function (i) {
                    var fracVariance = _this.dataSet.fracVariancesExplained[i];
                    return {
                        id: i,
                        componentNumber: i + 1,
                        percVariance: (fracVariance * 100).toFixed(1)
                    };
                });
            });
        };
        ProjectionsPanel.prototype.reprojectCustom = function () {
            if (this.centroids == null || this.centroids.xLeft == null ||
                this.centroids.xRight == null || this.centroids.yUp == null ||
                this.centroids.yDown == null) {
                return;
            }
            var xDir = vz_projector.vector.sub(this.centroids.xRight, this.centroids.xLeft);
            this.dataSet.projectLinear(xDir, 'linear-x');
            var yDir = vz_projector.vector.sub(this.centroids.yUp, this.centroids.yDown);
            this.dataSet.projectLinear(yDir, 'linear-y');
            var accessors = vz_projector.getProjectionComponents('custom', ['x', 'y']);
            var projection = new vz_projector.Projection('custom', accessors, 2, this.dataSet);
            this.projector.setProjection(projection);
        };
        ProjectionsPanel.prototype.clearCentroids = function () {
            this.centroids = { xLeft: null, xRight: null, yUp: null, yDown: null };
            this.allCentroid = null;
        };
        ProjectionsPanel.prototype._customSelectedSearchByMetadataOptionChanged = function (newVal, oldVal) {
            if (this.polymerChangesTriggerReprojection === false) {
                return;
            }
            if (this.currentProjection === 'custom') {
                this.computeAllCentroids();
                this.reprojectCustom();
            }
        };
        ProjectionsPanel.prototype.setupCustomProjectionInputFields = function () {
            this.customProjectionXLeftInput =
                this.setupCustomProjectionInputField('xLeft');
            this.customProjectionXRightInput =
                this.setupCustomProjectionInputField('xRight');
            this.customProjectionYUpInput = this.setupCustomProjectionInputField('yUp');
            this.customProjectionYDownInput =
                this.setupCustomProjectionInputField('yDown');
        };
        ProjectionsPanel.prototype.computeAllCentroids = function () {
            this.computeCentroid('xLeft');
            this.computeCentroid('xRight');
            this.computeCentroid('yUp');
            this.computeCentroid('yDown');
        };
        ProjectionsPanel.prototype.computeCentroid = function (name) {
            var input = this.querySelector('#' + name);
            if (input == null) {
                return;
            }
            var value = input.getValue();
            if (value == null) {
                return;
            }
            var inRegexMode = input.getInRegexMode();
            var result = this.getCentroid(value, inRegexMode);
            if (result.numMatches === 0) {
                input.message = '0 matches. Using a random vector.';
                result.centroid = vz_projector.vector.rn(this.dim);
            }
            else {
                input.message = result.numMatches + " matches.";
            }
            this.centroids[name] = result.centroid;
            this.centroidValues[name] = value;
        };
        ProjectionsPanel.prototype.setupCustomProjectionInputField = function (name) {
            var _this = this;
            var input = this.querySelector('#' + name);
            input.registerInputChangedListener(function (input, inRegexMode) {
                if (_this.polymerChangesTriggerReprojection) {
                    _this.computeCentroid(name);
                    _this.reprojectCustom();
                }
            });
            return input;
        };
        ProjectionsPanel.prototype.getCentroid = function (pattern, inRegexMode) {
            var _this = this;
            if (pattern == null || pattern === '') {
                return { numMatches: 0 };
            }
            // Search by the original dataset since we often want to filter and project
            // only the nearest neighbors of A onto B-C where B and C are not nearest
            // neighbors of A.
            var accessor = function (i) { return _this.originalDataSet.points[i].vector; };
            var r = this.originalDataSet.query(pattern, inRegexMode, this.customSelectedSearchByMetadataOption);
            return { centroid: vz_projector.vector.centroid(r, accessor), numMatches: r.length };
        };
        ProjectionsPanel.prototype.getPcaSampledDimText = function () {
            return vz_projector.PCA_SAMPLE_DIM.toLocaleString();
        };
        ProjectionsPanel.prototype.getPcaSampleSizeText = function () {
            return vz_projector.PCA_SAMPLE_SIZE.toLocaleString();
        };
        ProjectionsPanel.prototype.getTsneSampleSizeText = function () {
            return vz_projector.TSNE_SAMPLE_SIZE.toLocaleString();
        };
        return ProjectionsPanel;
    }(vz_projector.ProjectionsPanelPolymer));
    vz_projector.ProjectionsPanel = ProjectionsPanel;
    document.registerElement(ProjectionsPanel.prototype.is, ProjectionsPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
