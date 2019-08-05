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
    const NUM_PCA_COMPONENTS = 10;
    // tslint:disable-next-line
    vz_projector.ProjectionsPanelPolymer = vz_projector.PolymerElement({
        is: 'vz-projector-projections-panel',
        properties: {
            pcaIs3d: {
                type: Boolean,
                value: true,
                observer: '_pcaDimensionToggleObserver',
            },
            tSNEis3d: {
                type: Boolean,
                value: true,
                observer: '_tsneDimensionToggleObserver',
            },
            superviseFactor: { type: Number, value: 0 },
            // UMAP parameters
            umapIs3d: {
                type: Boolean,
                value: true,
                observer: '_umapDimensionToggleObserver',
            },
            umapNeighbors: { type: Number, value: 15 },
            // PCA projection.
            pcaComponents: Array,
            pcaX: { type: Number, value: 0, observer: 'showPCAIfEnabled' },
            pcaY: { type: Number, value: 1, observer: 'showPCAIfEnabled' },
            pcaZ: { type: Number, value: 2, observer: 'showPCAIfEnabled' },
            // Custom projection.
            customSelectedSearchByMetadataOption: {
                type: String,
                observer: '_customSelectedSearchByMetadataOptionChanged',
            },
        },
    });
    /**
     * A polymer component which handles the projection tabs in the projector.
     */
    class ProjectionsPanel extends vz_projector.ProjectionsPanelPolymer {
        initialize(projector) {
            this.polymerChangesTriggerReprojection = true;
            this.projector = projector;
            // Set up TSNE projections.
            this.perplexity = 30;
            this.learningRate = 10;
            // Setup Custom projections.
            this.centroidValues = { xLeft: null, xRight: null, yUp: null, yDown: null };
            this.clearCentroids();
            this.setupUIControls();
        }
        ready() {
            super.ready();
            this.zDropdown = this.$$('#z-dropdown');
            this.runTsneButton = this.$$('.run-tsne');
            this.pauseTsneButton = this.$$('.pause-tsne');
            this.perturbTsneButton = this.$$('.perturb-tsne');
            this.perplexitySlider = this.$$('#perplexity-slider');
            this.learningRateInput = this.$$('#learning-rate-slider');
            this.superviseFactorInput = this.$$('#supervise-factor-slider');
            this.iterationLabelTsne = this.$$('.run-tsne-iter');
            this.runUmapButton = this.$$('#run-umap');
        }
        disablePolymerChangesTriggerReprojection() {
            this.polymerChangesTriggerReprojection = false;
        }
        enablePolymerChangesTriggerReprojection() {
            this.polymerChangesTriggerReprojection = true;
        }
        updateTSNEPerplexityFromSliderChange() {
            if (this.perplexitySlider) {
                this.perplexity = +this.perplexitySlider.value;
            }
            this.$$('.tsne-perplexity span').innerText =
                '' + this.perplexity;
        }
        updateTSNELearningRateFromUIChange() {
            if (this.learningRateInput) {
                this.learningRate = Math.pow(10, +this.learningRateInput.value);
            }
            this.$$('.tsne-learning-rate span').innerText =
                '' + this.learningRate;
        }
        updateTSNESuperviseFactorFromUIChange() {
            this.$$('.tsne-supervise-factor span').innerText =
                '' + this.superviseFactor;
            if (this.dataSet) {
                this.dataSet.setSuperviseFactor(this.superviseFactor);
            }
        }
        setupUIControls() {
            {
                const self = this;
                const inkTabs = this.root.querySelectorAll('.ink-tab');
                for (let i = 0; i < inkTabs.length; i++) {
                    inkTabs[i].addEventListener('click', function () {
                        let id = this.getAttribute('data-tab');
                        self.showTab(id);
                    });
                }
            }
            this.runTsneButton.addEventListener('click', () => {
                if (this.dataSet.hasTSNERun) {
                    this.dataSet.stopTSNE();
                }
                else {
                    this.runTSNE();
                }
            });
            this.pauseTsneButton.addEventListener('click', () => {
                if (this.dataSet.tSNEShouldPause) {
                    this.dataSet.tSNEShouldPause = false;
                    this.pauseTsneButton.innerText = 'Pause';
                }
                else {
                    this.dataSet.tSNEShouldPause = true;
                    this.pauseTsneButton.innerText = 'Resume';
                }
            });
            this.perturbTsneButton.addEventListener('mousedown', () => {
                if (this.dataSet && this.projector) {
                    this.dataSet.perturbTsne();
                    this.projector.notifyProjectionPositionsUpdated();
                    this.perturbInterval = setInterval(() => {
                        this.dataSet.perturbTsne();
                        this.projector.notifyProjectionPositionsUpdated();
                    }, 100);
                }
            });
            this.perturbTsneButton.addEventListener('mouseup', () => {
                clearInterval(this.perturbInterval);
            });
            this.perplexitySlider.value = this.perplexity.toString();
            this.perplexitySlider.addEventListener('change', () => this.updateTSNEPerplexityFromSliderChange());
            this.updateTSNEPerplexityFromSliderChange();
            this.learningRateInput.addEventListener('change', () => this.updateTSNELearningRateFromUIChange());
            this.updateTSNELearningRateFromUIChange();
            this.superviseFactorInput.addEventListener('change', () => this.updateTSNESuperviseFactorFromUIChange());
            this.updateTSNESuperviseFactorFromUIChange();
            this.setupCustomProjectionInputFields();
            // TODO: figure out why `--paper-input-container-input` css mixin didn't
            // work.
            const inputs = this.root.querySelectorAll('paper-dropdown-menu paper-input input');
            for (let i = 0; i < inputs.length; i++) {
                inputs[i].style.fontSize = '14px';
            }
        }
        restoreUIFromBookmark(bookmark) {
            this.disablePolymerChangesTriggerReprojection();
            // PCA
            this.pcaX = bookmark.pcaComponentDimensions[0];
            this.pcaY = bookmark.pcaComponentDimensions[1];
            if (bookmark.pcaComponentDimensions.length === 3) {
                this.pcaZ = bookmark.pcaComponentDimensions[2];
            }
            this.pcaIs3d = bookmark.pcaComponentDimensions.length === 3;
            // t-SNE
            if (this.perplexitySlider) {
                this.perplexitySlider.value = bookmark.tSNEPerplexity.toString();
            }
            if (this.learningRateInput) {
                this.learningRateInput.value = bookmark.tSNELearningRate.toString();
            }
            this.tSNEis3d = bookmark.tSNEis3d;
            // UMAP
            this.umapIs3d = bookmark.umapIs3d;
            this.umapNeighbors = bookmark.umapNeighbors;
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
            if (this.iterationLabelTsne) {
                this.iterationLabelTsne.innerText = bookmark.tSNEIteration.toString();
            }
            if (bookmark.selectedProjection != null) {
                this.showTab(bookmark.selectedProjection);
            }
            this.enablePolymerChangesTriggerReprojection();
        }
        populateBookmarkFromUI(bookmark) {
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
            // UMAP
            bookmark.umapIs3d = this.umapIs3d;
            // custom
            bookmark.customSelectedSearchByMetadataOption = this.customSelectedSearchByMetadataOption;
            if (this.customProjectionXLeftInput != null) {
                bookmark.customXLeftText = this.customProjectionXLeftInput.getValue();
                bookmark.customXLeftRegex = this.customProjectionXLeftInput.getInRegexMode();
            }
            if (this.customProjectionXRightInput != null) {
                bookmark.customXRightText = this.customProjectionXRightInput.getValue();
                bookmark.customXRightRegex = this.customProjectionXRightInput.getInRegexMode();
            }
            if (this.customProjectionYUpInput != null) {
                bookmark.customYUpText = this.customProjectionYUpInput.getValue();
                bookmark.customYUpRegex = this.customProjectionYUpInput.getInRegexMode();
            }
            if (this.customProjectionYDownInput != null) {
                bookmark.customYDownText = this.customProjectionYDownInput.getValue();
                bookmark.customYDownRegex = this.customProjectionYDownInput.getInRegexMode();
            }
            this.enablePolymerChangesTriggerReprojection();
        }
        // This method is marked as public as it is used as the view method that
        // abstracts DOM manipulation so we can stub it in a test.
        // TODO(nsthorat): Move this to its own class as the glue between this class
        // and the DOM.
        setZDropdownEnabled(enabled) {
            if (this.zDropdown) {
                if (enabled) {
                    this.zDropdown.removeAttribute('disabled');
                }
                else {
                    this.zDropdown.setAttribute('disabled', 'true');
                }
            }
        }
        dataSetUpdated(dataSet, originalDataSet, dim) {
            this.dataSet = dataSet;
            this.originalDataSet = originalDataSet;
            this.dim = dim;
            const pointCount = dataSet == null ? 0 : dataSet.points.length;
            const perplexity = Math.max(5, Math.ceil(Math.sqrt(pointCount) / 4));
            this.perplexitySlider.value = perplexity.toString();
            this.updateTSNEPerplexityFromSliderChange();
            this.clearCentroids();
            this.$$('#tsne-sampling').style.display =
                pointCount > vz_projector.TSNE_SAMPLE_SIZE ? null : 'none';
            const wasSampled = dataSet == null
                ? false
                : dataSet.dim[0] > vz_projector.PCA_SAMPLE_DIM || dataSet.dim[1] > vz_projector.PCA_SAMPLE_DIM;
            this.$$('#pca-sampling').style.display = wasSampled
                ? null
                : 'none';
            this.showTab('pca');
        }
        _pcaDimensionToggleObserver() {
            this.setZDropdownEnabled(this.pcaIs3d);
            this.beginProjection(this.currentProjection);
        }
        _tsneDimensionToggleObserver() {
            this.beginProjection(this.currentProjection);
        }
        _umapDimensionToggleObserver() {
            this.beginProjection(this.currentProjection);
        }
        metadataChanged(spriteAndMetadata) {
            // Project by options for custom projections.
            let searchByMetadataIndex = -1;
            this.searchByMetadataOptions = spriteAndMetadata.stats.map((stats, i) => {
                // Make the default label by the first non-numeric column.
                if (!stats.isNumeric && searchByMetadataIndex === -1) {
                    searchByMetadataIndex = i;
                }
                return stats.name;
            });
            this.customSelectedSearchByMetadataOption = this.searchByMetadataOptions[Math.max(0, searchByMetadataIndex)];
        }
        showTab(id) {
            this.currentProjection = id;
            const tab = this.$$('.ink-tab[data-tab="' + id + '"]');
            const allTabs = this.root.querySelectorAll('.ink-tab');
            for (let i = 0; i < allTabs.length; i++) {
                vz_projector.util.classed(allTabs[i], 'active', false);
            }
            vz_projector.util.classed(tab, 'active', true);
            const allTabContent = this.root.querySelectorAll('.ink-panel-content');
            for (let i = 0; i < allTabContent.length; i++) {
                vz_projector.util.classed(allTabContent[i], 'active', false);
            }
            vz_projector.util.classed(this.$$('.ink-panel-content[data-panel="' + id + '"]'), 'active', true);
            // guard for unit tests, where polymer isn't attached and $ doesn't exist.
            if (this.$ != null) {
                const main = this.$['main'];
                // In order for the projections panel to animate its height, we need to
                // set it explicitly.
                requestAnimationFrame(() => {
                    this.style.height = main.clientHeight + 'px';
                });
            }
            this.beginProjection(id);
        }
        beginProjection(projection) {
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
            else if (projection === 'umap') {
                this.showUmap();
            }
            else if (projection === 'custom') {
                if (this.dataSet != null) {
                    this.dataSet.stopTSNE();
                }
                this.computeAllCentroids();
                this.reprojectCustom();
            }
        }
        showTSNE() {
            const dataSet = this.dataSet;
            if (dataSet == null) {
                return;
            }
            const accessors = vz_projector.getProjectionComponents('tsne', [
                0,
                1,
                this.tSNEis3d ? 2 : null,
            ]);
            const dimensionality = this.tSNEis3d ? 3 : 2;
            const projection = new vz_projector.Projection('tsne', accessors, dimensionality, dataSet);
            this.projector.setProjection(projection);
            if (!this.dataSet.hasTSNERun) {
                this.runTSNE();
            }
            else {
                this.projector.notifyProjectionPositionsUpdated();
            }
        }
        runTSNE() {
            let projectionChangeNotified = false;
            this.runTsneButton.innerText = 'Stop';
            this.runTsneButton.disabled = true;
            this.pauseTsneButton.innerText = 'Pause';
            this.pauseTsneButton.disabled = true;
            this.perturbTsneButton.disabled = false;
            this.dataSet.projectTSNE(this.perplexity, this.learningRate, this.tSNEis3d ? 3 : 2, (iteration) => {
                if (iteration != null) {
                    this.runTsneButton.disabled = false;
                    this.pauseTsneButton.disabled = false;
                    this.iterationLabelTsne.innerText = '' + iteration;
                    this.projector.notifyProjectionPositionsUpdated();
                    if (!projectionChangeNotified && this.dataSet.projections['tsne']) {
                        this.projector.onProjectionChanged();
                        projectionChangeNotified = true;
                    }
                }
                else {
                    this.runTsneButton.innerText = 'Re-run';
                    this.runTsneButton.disabled = false;
                    this.pauseTsneButton.innerText = 'Pause';
                    this.pauseTsneButton.disabled = true;
                    this.perturbTsneButton.disabled = true;
                    this.projector.onProjectionChanged();
                }
            });
        }
        showUmap() {
            const dataSet = this.dataSet;
            if (dataSet == null) {
                return;
            }
            const accessors = vz_projector.getProjectionComponents('umap', [
                0,
                1,
                this.umapIs3d ? 2 : null,
            ]);
            const dimensionality = this.umapIs3d ? 3 : 2;
            const projection = new vz_projector.Projection('umap', accessors, dimensionality, dataSet);
            this.projector.setProjection(projection);
            if (!this.dataSet.hasUmapRun) {
                this.runUmap();
            }
            else {
                this.projector.notifyProjectionPositionsUpdated();
            }
        }
        runUmap() {
            let projectionChangeNotified = false;
            this.runUmapButton.disabled = true;
            const nComponents = this.umapIs3d ? 3 : 2;
            const nNeighbors = this.umapNeighbors;
            this.dataSet.projectUmap(nComponents, nNeighbors, (iteration) => {
                if (iteration != null) {
                    this.runUmapButton.disabled = false;
                    this.projector.notifyProjectionPositionsUpdated();
                    if (!projectionChangeNotified && this.dataSet.projections['umap']) {
                        this.projector.onProjectionChanged();
                        projectionChangeNotified = true;
                    }
                }
                else {
                    this.runUmapButton.innerText = 'Re-run';
                    this.runUmapButton.disabled = false;
                    this.projector.onProjectionChanged();
                }
            });
        }
        // tslint:disable-next-line:no-unused-variable
        showPCAIfEnabled() {
            if (this.polymerChangesTriggerReprojection) {
                this.showPCA();
            }
        }
        updateTotalVarianceMessage() {
            let variances = this.dataSet.fracVariancesExplained;
            let totalVariance = variances[this.pcaX] + variances[this.pcaY];
            let msg = 'Total variance described: ';
            if (this.pcaIs3d) {
                totalVariance += variances[this.pcaZ];
            }
            msg += (totalVariance * 100).toFixed(1) + '%.';
            this.$$('#total-variance').innerHTML = msg;
        }
        showPCA() {
            if (this.dataSet == null) {
                return;
            }
            this.dataSet.projectPCA().then(() => {
                // Polymer properties are 1-based.
                const accessors = vz_projector.getProjectionComponents('pca', [
                    this.pcaX,
                    this.pcaY,
                    this.pcaZ,
                ]);
                const dimensionality = this.pcaIs3d ? 3 : 2;
                const projection = new vz_projector.Projection('pca', accessors, dimensionality, this.dataSet);
                this.projector.setProjection(projection);
                let numComponents = Math.min(NUM_PCA_COMPONENTS, this.dataSet.dim[1]);
                this.updateTotalVarianceMessage();
                this.pcaComponents = vz_projector.util.range(numComponents).map((i) => {
                    let fracVariance = this.dataSet.fracVariancesExplained[i];
                    return {
                        id: i,
                        componentNumber: i + 1,
                        percVariance: (fracVariance * 100).toFixed(1),
                    };
                });
            });
        }
        reprojectCustom() {
            if (this.centroids == null ||
                this.centroids.xLeft == null ||
                this.centroids.xRight == null ||
                this.centroids.yUp == null ||
                this.centroids.yDown == null) {
                return;
            }
            const xDir = vz_projector.vector.sub(this.centroids.xRight, this.centroids.xLeft);
            this.dataSet.projectLinear(xDir, 'linear-x');
            const yDir = vz_projector.vector.sub(this.centroids.yUp, this.centroids.yDown);
            this.dataSet.projectLinear(yDir, 'linear-y');
            const accessors = vz_projector.getProjectionComponents('custom', ['x', 'y']);
            const projection = new vz_projector.Projection('custom', accessors, 2, this.dataSet);
            this.projector.setProjection(projection);
        }
        clearCentroids() {
            this.centroids = { xLeft: null, xRight: null, yUp: null, yDown: null };
            this.allCentroid = null;
        }
        _customSelectedSearchByMetadataOptionChanged(newVal, oldVal) {
            if (this.polymerChangesTriggerReprojection === false) {
                return;
            }
            if (this.currentProjection === 'custom') {
                this.computeAllCentroids();
                this.reprojectCustom();
            }
        }
        setupCustomProjectionInputFields() {
            this.customProjectionXLeftInput = this.setupCustomProjectionInputField('xLeft');
            this.customProjectionXRightInput = this.setupCustomProjectionInputField('xRight');
            this.customProjectionYUpInput = this.setupCustomProjectionInputField('yUp');
            this.customProjectionYDownInput = this.setupCustomProjectionInputField('yDown');
        }
        computeAllCentroids() {
            this.computeCentroid('xLeft');
            this.computeCentroid('xRight');
            this.computeCentroid('yUp');
            this.computeCentroid('yDown');
        }
        computeCentroid(name) {
            const input = this.$$('#' + name);
            if (input == null) {
                return;
            }
            const value = input.getValue();
            if (value == null) {
                return;
            }
            let inRegexMode = input.getInRegexMode();
            let result = this.getCentroid(value, inRegexMode);
            if (result.numMatches === 0) {
                input.message = '0 matches. Using a random vector.';
                result.centroid = vz_projector.vector.rn(this.dim);
            }
            else {
                input.message = `${result.numMatches} matches.`;
            }
            this.centroids[name] = result.centroid;
            this.centroidValues[name] = value;
        }
        setupCustomProjectionInputField(name) {
            let input = this.$$('#' + name);
            input.registerInputChangedListener((input, inRegexMode) => {
                if (this.polymerChangesTriggerReprojection) {
                    this.computeCentroid(name);
                    this.reprojectCustom();
                }
            });
            return input;
        }
        getCentroid(pattern, inRegexMode) {
            if (pattern == null || pattern === '') {
                return { numMatches: 0 };
            }
            // Search by the original dataset since we often want to filter and project
            // only the nearest neighbors of A onto B-C where B and C are not nearest
            // neighbors of A.
            let accessor = (i) => this.originalDataSet.points[i].vector;
            let r = this.originalDataSet.query(pattern, inRegexMode, this.customSelectedSearchByMetadataOption);
            return { centroid: vz_projector.vector.centroid(r, accessor), numMatches: r.length };
        }
        getPcaSampledDimText() {
            return vz_projector.PCA_SAMPLE_DIM.toLocaleString();
        }
        getPcaSampleSizeText() {
            return vz_projector.PCA_SAMPLE_SIZE.toLocaleString();
        }
        getTsneSampleSizeText() {
            return vz_projector.TSNE_SAMPLE_SIZE.toLocaleString();
        }
        getUmapSampleSizeText() {
            return vz_projector.UMAP_SAMPLE_SIZE.toLocaleString();
        }
    }
    vz_projector.ProjectionsPanel = ProjectionsPanel;
    customElements.define(ProjectionsPanel.prototype.is, ProjectionsPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
