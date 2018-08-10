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
    /**
     * The minimum number of dimensions the data should have to automatically
     * decide to normalize the data.
     */
    var THRESHOLD_DIM_NORMALIZE = 50;
    var POINT_COLOR_MISSING = 'black';
    vz_projector.ProjectorPolymer = vz_projector.PolymerElement({
        is: 'vz-projector',
        properties: {
            routePrefix: String,
            dataProto: { type: String, observer: '_dataProtoChanged' },
            servingMode: String,
            projectorConfigJsonPath: String,
            pageViewLogging: Boolean,
            eventLogging: Boolean
        }
    });
    var INDEX_METADATA_FIELD = '__index__';
    var Projector = /** @class */ (function (_super) {
        __extends(Projector, _super);
        function Projector() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Projector.prototype.ready = function () {
            vz_projector.logging.setDomContainer(this);
            this.analyticsLogger =
                new vz_projector.AnalyticsLogger(this.pageViewLogging, this.eventLogging);
            this.analyticsLogger.logPageView('embeddings');
            if (!vz_projector.util.hasWebGLSupport()) {
                this.analyticsLogger.logWebGLDisabled();
                vz_projector.logging.setErrorMessage('Your browser or device does not have WebGL enabled. Please enable ' +
                    'hardware acceleration, or use a browser that supports WebGL.');
                return;
            }
            this.selectionChangedListeners = [];
            this.hoverListeners = [];
            this.projectionChangedListeners = [];
            this.distanceMetricChangedListeners = [];
            this.selectedPointIndices = [];
            this.neighborsOfFirstPoint = [];
            this.editMode = false;
            this.dataPanel = this.$['data-panel'];
            this.inspectorPanel = this.$['inspector-panel'];
            this.inspectorPanel.initialize(this, this);
            this.projectionsPanel = this.$['projections-panel'];
            this.projectionsPanel.initialize(this);
            this.bookmarkPanel = this.$['bookmark-panel'];
            this.bookmarkPanel.initialize(this, this);
            this.metadataCard = this.$['metadata-card'];
            this.statusBar = this.querySelector('#status-bar');
            this.scopeSubtree(this.$$('#notification-dialog'), true);
            this.setupUIControls();
            this.initializeDataProvider();
        };
        Projector.prototype.setSelectedLabelOption = function (labelOption) {
            this.selectedLabelOption = labelOption;
            this.metadataCard.setLabelOption(this.selectedLabelOption);
            this.projectorScatterPlotAdapter.setLabelPointAccessor(labelOption);
            this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
            this.projectorScatterPlotAdapter.render();
        };
        Projector.prototype.setSelectedColorOption = function (colorOption) {
            this.selectedColorOption = colorOption;
            this.projectorScatterPlotAdapter.setLegendPointColorer(this.getLegendPointColorer(colorOption));
            this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
            this.projectorScatterPlotAdapter.render();
        };
        Projector.prototype.setNormalizeData = function (normalizeData) {
            this.normalizeData = normalizeData;
            this.setCurrentDataSet(this.originalDataSet.getSubset());
        };
        Projector.prototype.updateDataSet = function (ds, spriteAndMetadata, metadataFile) {
            this.dataSetFilterIndices = null;
            this.originalDataSet = ds;
            if (ds != null) {
                this.normalizeData =
                    this.originalDataSet.dim[1] >= THRESHOLD_DIM_NORMALIZE;
                spriteAndMetadata = spriteAndMetadata || {};
                if (spriteAndMetadata.pointsInfo == null) {
                    var _a = this.makeDefaultPointsInfoAndStats(ds.points), pointsInfo = _a[0], stats = _a[1];
                    spriteAndMetadata.pointsInfo = pointsInfo;
                    spriteAndMetadata.stats = stats;
                }
                var metadataMergeSucceeded = ds.mergeMetadata(spriteAndMetadata);
                if (!metadataMergeSucceeded) {
                    return;
                }
            }
            if (this.projectorScatterPlotAdapter != null) {
                if (ds == null) {
                    this.projectorScatterPlotAdapter.setLabelPointAccessor(null);
                    this.setProjection(null);
                }
                else {
                    this.projectorScatterPlotAdapter.updateScatterPlotPositions();
                    this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
                    this.projectorScatterPlotAdapter.resize();
                    this.projectorScatterPlotAdapter.render();
                }
            }
            if (ds != null) {
                this.dataPanel.setNormalizeData(this.normalizeData);
                this.setCurrentDataSet(ds.getSubset());
                this.projectorScatterPlotAdapter.setLabelPointAccessor(this.selectedLabelOption);
                this.inspectorPanel.datasetChanged();
                this.inspectorPanel.metadataChanged(spriteAndMetadata);
                this.projectionsPanel.metadataChanged(spriteAndMetadata);
                this.dataPanel.metadataChanged(spriteAndMetadata, metadataFile);
            }
            else {
                this.setCurrentDataSet(null);
            }
        };
        Projector.prototype.metadataEdit = function (metadataColumn, metadataLabel) {
            var _this = this;
            this.selectedPointIndices.forEach(function (i) {
                return _this.dataSet.points[i].metadata[metadataColumn] = metadataLabel;
            });
            this.neighborsOfFirstPoint.forEach(function (p) {
                return _this.dataSet.points[p.index].metadata[metadataColumn] = metadataLabel;
            });
            this.dataSet.spriteAndMetadataInfo.stats = vz_projector.analyzeMetadata(this.dataSet.spriteAndMetadataInfo.stats.map(function (s) { return s.name; }), this.dataSet.points.map(function (p) { return p.metadata; }));
            this.metadataChanged(this.dataSet.spriteAndMetadataInfo);
            this.metadataEditorContext(true, metadataColumn);
        };
        Projector.prototype.metadataChanged = function (spriteAndMetadata, metadataFile) {
            if (metadataFile != null) {
                this.metadataFile = metadataFile;
            }
            this.dataSet.spriteAndMetadataInfo = spriteAndMetadata;
            this.projectionsPanel.metadataChanged(spriteAndMetadata);
            this.inspectorPanel.metadataChanged(spriteAndMetadata);
            this.dataPanel.metadataChanged(spriteAndMetadata, this.metadataFile);
            if (this.selectedPointIndices.length > 0) { // at least one selected point
                this.metadataCard.updateMetadata(// show metadata for first selected point
                this.dataSet.points[this.selectedPointIndices[0]].metadata);
            }
            else { // no points selected
                this.metadataCard.updateMetadata(null); // clear metadata
            }
            this.setSelectedLabelOption(this.selectedLabelOption);
        };
        Projector.prototype.metadataEditorContext = function (enabled, metadataColumn) {
            if (this.inspectorPanel) {
                this.inspectorPanel.metadataEditorContext(enabled, metadataColumn);
            }
        };
        Projector.prototype.setSelectedTensor = function (run, tensorInfo) {
            this.bookmarkPanel.setSelectedTensor(run, tensorInfo, this.dataProvider);
        };
        /**
         * Registers a listener to be called any time the selected point set changes.
         */
        Projector.prototype.registerSelectionChangedListener = function (listener) {
            this.selectionChangedListeners.push(listener);
        };
        Projector.prototype.filterDataset = function (pointIndices) {
            var selectionSize = this.selectedPointIndices.length;
            if (this.dataSetBeforeFilter == null) {
                this.dataSetBeforeFilter = this.dataSet;
            }
            this.setCurrentDataSet(this.dataSet.getSubset(pointIndices));
            this.dataSetFilterIndices = pointIndices;
            this.projectorScatterPlotAdapter.updateScatterPlotPositions();
            this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
            this.adjustSelectionAndHover(vz_projector.util.range(selectionSize));
        };
        Projector.prototype.resetFilterDataset = function () {
            var _this = this;
            var originalPointIndices = this.selectedPointIndices.map(function (filteredIndex) { return _this.dataSet.points[filteredIndex].index; });
            this.setCurrentDataSet(this.dataSetBeforeFilter);
            if (this.projection != null) {
                this.projection.dataSet = this.dataSetBeforeFilter;
            }
            this.dataSetBeforeFilter = null;
            this.projectorScatterPlotAdapter.updateScatterPlotPositions();
            this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
            this.dataSetFilterIndices = [];
            this.adjustSelectionAndHover(originalPointIndices);
        };
        /**
         * Used by clients to indicate that a selection has occurred.
         */
        Projector.prototype.notifySelectionChanged = function (newSelectedPointIndices) {
            var _this = this;
            var neighbors = [];
            if (this.editMode // point selection toggle in existing selection
                && newSelectedPointIndices.length > 0) { // selection required
                if (this.selectedPointIndices.length === 1) { // main point with neighbors
                    var main_point_vector_1 = this.dataSet.points[this.selectedPointIndices[0]].vector;
                    neighbors = this.neighborsOfFirstPoint.filter(function (n) {
                        return newSelectedPointIndices.filter(function (p) { return p == n.index; }).length == 0;
                    });
                    newSelectedPointIndices.forEach(function (p) {
                        if (p != _this.selectedPointIndices[0] // not main point
                            && _this.neighborsOfFirstPoint.filter(function (n) { return n.index == p; }).length == 0) {
                            var p_vector = _this.dataSet.points[p].vector;
                            var n_dist = _this.inspectorPanel.distFunc(main_point_vector_1, p_vector);
                            var pos = 0; // insertion position into dist ordered neighbors
                            while (pos < neighbors.length && neighbors[pos].dist < n_dist) // find pos
                                pos = pos + 1; // move up the sorted neighbors list according to dist
                            neighbors.splice(pos, 0, { index: p, dist: n_dist }); // add new neighbor
                        }
                    });
                }
                else { // multiple selections
                    var updatedSelectedPointIndices_1 = this.selectedPointIndices.filter(function (n) {
                        return newSelectedPointIndices.filter(function (p) { return p == n; }).length == 0;
                    }); // deselect
                    newSelectedPointIndices.forEach(function (p) {
                        if (_this.selectedPointIndices.filter(function (s) { return s == p; }).length == 0) // unselected
                            updatedSelectedPointIndices_1.push(p);
                    });
                    this.selectedPointIndices = updatedSelectedPointIndices_1; // update selection
                    if (this.selectedPointIndices.length > 0) { // at least one selected point
                        this.metadataCard.updateMetadata(// show metadata for first selected point
                        this.dataSet.points[this.selectedPointIndices[0]].metadata);
                    }
                    else { // no points selected
                        this.metadataCard.updateMetadata(null); // clear metadata
                    }
                }
            }
            else { // normal selection mode
                this.selectedPointIndices = newSelectedPointIndices;
                if (newSelectedPointIndices.length === 1) {
                    neighbors = this.dataSet.findNeighbors(newSelectedPointIndices[0], this.inspectorPanel.distFunc, this.inspectorPanel.numNN);
                    this.metadataCard.updateMetadata(this.dataSet.points[newSelectedPointIndices[0]].metadata);
                }
                else {
                    this.metadataCard.updateMetadata(null);
                }
            }
            this.selectionChangedListeners.forEach(function (l) { return l(_this.selectedPointIndices, neighbors); });
        };
        /**
         * Registers a listener to be called any time the mouse hovers over a point.
         */
        Projector.prototype.registerHoverListener = function (listener) {
            this.hoverListeners.push(listener);
        };
        /**
         * Used by clients to indicate that a hover is occurring.
         */
        Projector.prototype.notifyHoverOverPoint = function (pointIndex) {
            this.hoverListeners.forEach(function (l) { return l(pointIndex); });
        };
        Projector.prototype.registerProjectionChangedListener = function (listener) {
            this.projectionChangedListeners.push(listener);
        };
        Projector.prototype.notifyProjectionChanged = function (projection) {
            this.projectionChangedListeners.forEach(function (l) { return l(projection); });
        };
        Projector.prototype.registerDistanceMetricChangedListener = function (l) {
            this.distanceMetricChangedListeners.push(l);
        };
        Projector.prototype.notifyDistanceMetricChanged = function (distMetric) {
            this.distanceMetricChangedListeners.forEach(function (l) { return l(distMetric); });
        };
        Projector.prototype._dataProtoChanged = function (dataProtoString) {
            var dataProto = dataProtoString ? JSON.parse(dataProtoString) : null;
            this.initializeDataProvider(dataProto);
        };
        Projector.prototype.makeDefaultPointsInfoAndStats = function (points) {
            var pointsInfo = [];
            points.forEach(function (p) {
                var pointInfo = {};
                pointInfo[INDEX_METADATA_FIELD] = p.index;
                pointsInfo.push(pointInfo);
            });
            var stats = [{
                    name: INDEX_METADATA_FIELD,
                    isNumeric: false,
                    tooManyUniqueValues: true,
                    min: 0,
                    max: pointsInfo.length - 1
                }];
            return [pointsInfo, stats];
        };
        Projector.prototype.initializeDataProvider = function (dataProto) {
            if (this.servingMode === 'demo') {
                var projectorConfigUrl = void 0;
                // Only in demo mode do we allow the config being passed via URL.
                var urlParams = vz_projector.util.getURLParams(window.location.search);
                if ('config' in urlParams) {
                    projectorConfigUrl = urlParams['config'];
                }
                else {
                    projectorConfigUrl = this.projectorConfigJsonPath;
                }
                this.dataProvider = new vz_projector.DemoDataProvider(projectorConfigUrl);
            }
            else if (this.servingMode === 'server') {
                if (!this.routePrefix) {
                    throw 'route-prefix is a required parameter';
                }
                this.dataProvider = new vz_projector.ServerDataProvider(this.routePrefix);
            }
            else if (this.servingMode === 'proto' && dataProto != null) {
                this.dataProvider = new vz_projector.ProtoDataProvider(dataProto);
            }
            else {
                // The component is not ready yet - waiting for the dataProto field.
                return;
            }
            this.dataPanel.initialize(this, this.dataProvider);
        };
        Projector.prototype.getLegendPointColorer = function (colorOption) {
            var _this = this;
            if ((colorOption == null) || (colorOption.map == null)) {
                return null;
            }
            var colorer = function (ds, i) {
                var value = ds.points[i].metadata[_this.selectedColorOption.name];
                if (value == null) {
                    return POINT_COLOR_MISSING;
                }
                return colorOption.map(value);
            };
            return colorer;
        };
        Projector.prototype.get3DLabelModeButton = function () {
            return this.querySelector('#labels3DMode');
        };
        Projector.prototype.get3DLabelMode = function () {
            var label3DModeButton = this.get3DLabelModeButton();
            return label3DModeButton.active;
        };
        Projector.prototype.adjustSelectionAndHover = function (selectedPointIndices, hoverIndex) {
            this.notifySelectionChanged(selectedPointIndices);
            this.notifyHoverOverPoint(hoverIndex);
            this.setMouseMode(vz_projector.MouseMode.CAMERA_AND_CLICK_SELECT);
        };
        Projector.prototype.setMouseMode = function (mouseMode) {
            var selectModeButton = this.querySelector('#selectMode');
            selectModeButton.active = (mouseMode === vz_projector.MouseMode.AREA_SELECT);
            this.projectorScatterPlotAdapter.scatterPlot.setMouseMode(mouseMode);
        };
        Projector.prototype.setCurrentDataSet = function (ds) {
            this.adjustSelectionAndHover([]);
            if (this.dataSet != null) {
                this.dataSet.stopTSNE();
            }
            if ((ds != null) && this.normalizeData) {
                ds.normalize();
            }
            this.dim = (ds == null) ? 0 : ds.dim[1];
            this.querySelector('span.numDataPoints').innerText =
                (ds == null) ? '0' : '' + ds.dim[0];
            this.querySelector('span.dim').innerText =
                (ds == null) ? '0' : '' + ds.dim[1];
            this.dataSet = ds;
            this.projectionsPanel.dataSetUpdated(this.dataSet, this.originalDataSet, this.dim);
            this.projectorScatterPlotAdapter.setDataSet(this.dataSet);
            this.projectorScatterPlotAdapter.scatterPlot
                .setCameraParametersForNextCameraCreation(null, true);
        };
        Projector.prototype.setupUIControls = function () {
            var _this = this;
            // View controls
            this.querySelector('#reset-zoom').addEventListener('click', function () {
                _this.projectorScatterPlotAdapter.scatterPlot.resetZoom();
                _this.projectorScatterPlotAdapter.scatterPlot.startOrbitAnimation();
            });
            var selectModeButton = this.querySelector('#selectMode');
            selectModeButton.addEventListener('click', function (event) {
                _this.setMouseMode(selectModeButton.active ? vz_projector.MouseMode.AREA_SELECT :
                    vz_projector.MouseMode.CAMERA_AND_CLICK_SELECT);
            });
            var nightModeButton = this.querySelector('#nightDayMode');
            nightModeButton.addEventListener('click', function () {
                _this.projectorScatterPlotAdapter.scatterPlot.setDayNightMode(nightModeButton.active);
            });
            var editModeButton = this.querySelector('#editMode');
            editModeButton.addEventListener('click', function (event) {
                _this.editMode = editModeButton.active;
            });
            var labels3DModeButton = this.get3DLabelModeButton();
            labels3DModeButton.addEventListener('click', function () {
                _this.projectorScatterPlotAdapter.set3DLabelMode(_this.get3DLabelMode());
            });
            window.addEventListener('resize', function () {
                var container = _this.parentNode;
                container.style.height = document.body.clientHeight + 'px';
                _this.projectorScatterPlotAdapter.resize();
            });
            {
                this.projectorScatterPlotAdapter = new vz_projector.ProjectorScatterPlotAdapter(this.getScatterContainer(), this);
                this.projectorScatterPlotAdapter.setLabelPointAccessor(this.selectedLabelOption);
            }
            this.projectorScatterPlotAdapter.scatterPlot.onCameraMove(function (cameraPosition, cameraTarget) {
                return _this.bookmarkPanel.clearStateSelection();
            });
            this.registerHoverListener(function (hoverIndex) { return _this.onHover(hoverIndex); });
            this.registerProjectionChangedListener(function (projection) {
                return _this.onProjectionChanged(projection);
            });
            this.registerSelectionChangedListener(function (selectedPointIndices, neighborsOfFirstPoint) {
                return _this.onSelectionChanged(selectedPointIndices, neighborsOfFirstPoint);
            });
        };
        Projector.prototype.onHover = function (hoverIndex) {
            this.hoverPointIndex = hoverIndex;
            var hoverText = null;
            if (hoverIndex != null) {
                var point = this.dataSet.points[hoverIndex];
                if (point.metadata[this.selectedLabelOption]) {
                    hoverText = point.metadata[this.selectedLabelOption].toString();
                }
            }
            if (this.selectedPointIndices.length === 0) {
                this.statusBar.style.display = hoverText ? null : 'none';
                this.statusBar.innerText = hoverText;
            }
        };
        Projector.prototype.getScatterContainer = function () {
            return this.querySelector('#scatter');
        };
        Projector.prototype.onSelectionChanged = function (selectedPointIndices, neighborsOfFirstPoint) {
            this.selectedPointIndices = selectedPointIndices;
            this.neighborsOfFirstPoint = neighborsOfFirstPoint;
            this.dataPanel.onProjectorSelectionChanged(selectedPointIndices, neighborsOfFirstPoint);
            var totalNumPoints = this.selectedPointIndices.length + neighborsOfFirstPoint.length;
            this.statusBar.innerText = "Selected " + totalNumPoints + " points";
            this.statusBar.style.display = totalNumPoints > 0 ? null : 'none';
        };
        Projector.prototype.onProjectionChanged = function (projection) {
            this.dataPanel.projectionChanged(projection);
        };
        Projector.prototype.setProjection = function (projection) {
            this.projection = projection;
            if (projection != null) {
                this.analyticsLogger.logProjectionChanged(projection.projectionType);
            }
            this.notifyProjectionChanged(projection);
        };
        Projector.prototype.notifyProjectionPositionsUpdated = function () {
            this.projectorScatterPlotAdapter.notifyProjectionPositionsUpdated();
        };
        /**
         * Gets the current view of the embedding and saves it as a State object.
         */
        Projector.prototype.getCurrentState = function () {
            var state = new vz_projector.State();
            // Save the individual datapoint projections.
            state.projections = [];
            for (var i = 0; i < this.dataSet.points.length; i++) {
                var point = this.dataSet.points[i];
                var projections = {};
                var keys = Object.keys(point.projections);
                for (var j = 0; j < keys.length; ++j) {
                    projections[keys[j]] = point.projections[keys[j]];
                }
                state.projections.push(projections);
            }
            state.selectedProjection = this.projection.projectionType;
            state.dataSetDimensions = this.dataSet.dim;
            state.tSNEIteration = this.dataSet.tSNEIteration;
            state.selectedPoints = this.selectedPointIndices;
            state.filteredPoints = this.dataSetFilterIndices;
            this.projectorScatterPlotAdapter.populateBookmarkFromUI(state);
            state.selectedColorOptionName = this.dataPanel.selectedColorOptionName;
            state.forceCategoricalColoring = this.dataPanel.forceCategoricalColoring;
            state.selectedLabelOption = this.selectedLabelOption;
            this.projectionsPanel.populateBookmarkFromUI(state);
            return state;
        };
        /** Loads a State object into the world. */
        Projector.prototype.loadState = function (state) {
            this.setProjection(null);
            {
                this.projectionsPanel.disablePolymerChangesTriggerReprojection();
                if (this.dataSetBeforeFilter != null) {
                    this.resetFilterDataset();
                }
                if (state.filteredPoints != null) {
                    this.filterDataset(state.filteredPoints);
                }
                this.projectionsPanel.enablePolymerChangesTriggerReprojection();
            }
            for (var i = 0; i < state.projections.length; i++) {
                var point = this.dataSet.points[i];
                var projection = state.projections[i];
                var keys = Object.keys(projection);
                for (var j = 0; j < keys.length; ++j) {
                    point.projections[keys[j]] = projection[keys[j]];
                }
            }
            this.dataSet.hasTSNERun = (state.selectedProjection === 'tsne');
            this.dataSet.tSNEIteration = state.tSNEIteration;
            this.projectionsPanel.restoreUIFromBookmark(state);
            this.inspectorPanel.restoreUIFromBookmark(state);
            this.dataPanel.selectedColorOptionName = state.selectedColorOptionName;
            this.dataPanel.setForceCategoricalColoring(!!state.forceCategoricalColoring);
            this.selectedLabelOption = state.selectedLabelOption;
            this.projectorScatterPlotAdapter.restoreUIFromBookmark(state);
            {
                var dimensions = vz_projector.stateGetAccessorDimensions(state);
                var components = vz_projector.getProjectionComponents(state.selectedProjection, dimensions);
                var projection = new vz_projector.Projection(state.selectedProjection, components, dimensions.length, this.dataSet);
                this.setProjection(projection);
            }
            this.notifySelectionChanged(state.selectedPoints);
        };
        return Projector;
    }(vz_projector.ProjectorPolymer));
    vz_projector.Projector = Projector;
    document.registerElement(Projector.prototype.is, Projector);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
