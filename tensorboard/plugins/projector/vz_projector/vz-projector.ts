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
namespace vz_projector {

/**
 * The minimum number of dimensions the data should have to automatically
 * decide to normalize the data.
 */
const THRESHOLD_DIM_NORMALIZE = 50;
const POINT_COLOR_MISSING = 'black';

export let ProjectorPolymer = PolymerElement({
  is: 'vz-projector',
  properties: {
    routePrefix: String,
    dataProto: {type: String, observer: '_dataProtoChanged'},
    servingMode: String,
    projectorConfigJsonPath: String,
    pageViewLogging: Boolean,
    eventLogging: Boolean
  }
});

const INDEX_METADATA_FIELD = '__index__';

export class Projector extends ProjectorPolymer implements
    ProjectorEventContext {
  // The working subset of the data source's original data set.
  dataSet: DataSet;
  servingMode: ServingMode;
  // The path to the projector config JSON file for demo mode.
  projectorConfigJsonPath: string;

  private selectionChangedListeners: SelectionChangedListener[];
  private hoverListeners: HoverListener[];
  private projectionChangedListeners: ProjectionChangedListener[];
  private distanceMetricChangedListeners: DistanceMetricChangedListener[];

  private originalDataSet: DataSet;
  private dataSetBeforeFilter: DataSet;
  private projectorScatterPlotAdapter: ProjectorScatterPlotAdapter;
  private dim: number;

  private dataSetFilterIndices: number[];
  private selectedPointIndices: number[];
  private neighborsOfFirstPoint: knn.NearestEntry[];
  private hoverPointIndex: number;
  private editMode: boolean;

  private dataProvider: DataProvider;
  private inspectorPanel: InspectorPanel;

  private selectedColorOption: ColorOption;
  private selectedLabelOption: string;
  private routePrefix: string;
  private normalizeData: boolean;
  private projection: Projection;

  /** Polymer component panels */
  private dataPanel: DataPanel;
  private bookmarkPanel: BookmarkPanel;
  private projectionsPanel: ProjectionsPanel;
  private metadataCard: MetadataCard;

  private statusBar: HTMLDivElement;
  private analyticsLogger: AnalyticsLogger;
  private eventLogging: boolean;
  private pageViewLogging: boolean;

  ready() {
    logging.setDomContainer(this);

    this.analyticsLogger =
        new AnalyticsLogger(this.pageViewLogging, this.eventLogging);
    this.analyticsLogger.logPageView('embeddings');

    if (!util.hasWebGLSupport()) {
      this.analyticsLogger.logWebGLDisabled();
      logging.setErrorMessage(
          'Your browser or device does not have WebGL enabled. Please enable ' +
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

    this.dataPanel = this.$['data-panel'] as DataPanel;
    this.inspectorPanel = this.$['inspector-panel'] as InspectorPanel;
    this.inspectorPanel.initialize(this, this as ProjectorEventContext);
    this.projectionsPanel = this.$['projections-panel'] as ProjectionsPanel;
    this.projectionsPanel.initialize(this);
    this.bookmarkPanel = this.$['bookmark-panel'] as BookmarkPanel;
    this.bookmarkPanel.initialize(this, this as ProjectorEventContext);
    this.metadataCard = this.$['metadata-card'] as MetadataCard;
    this.statusBar = this.querySelector('#status-bar') as HTMLDivElement;
    this.scopeSubtree(this.$$('#notification-dialog'), true);
    this.setupUIControls();
    this.initializeDataProvider();
  }

  setSelectedLabelOption(labelOption: string) {
    this.selectedLabelOption = labelOption;
    this.metadataCard.setLabelOption(this.selectedLabelOption);
    this.projectorScatterPlotAdapter.setLabelPointAccessor(labelOption);
    this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
    this.projectorScatterPlotAdapter.render();
  }

  setSelectedColorOption(colorOption: ColorOption) {
    this.selectedColorOption = colorOption;
    this.projectorScatterPlotAdapter.setLegendPointColorer(
        this.getLegendPointColorer(colorOption));
    this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
    this.projectorScatterPlotAdapter.render();
  }

  setNormalizeData(normalizeData: boolean) {
    this.normalizeData = normalizeData;
    this.setCurrentDataSet(this.originalDataSet.getSubset());
  }

  updateDataSet(
      ds: DataSet, spriteAndMetadata?: SpriteAndMetadataInfo,
      metadataFile?: string) {
    this.dataSetFilterIndices = null;
    this.originalDataSet = ds;
    if (ds != null) {
      this.normalizeData =
          this.originalDataSet.dim[1] >= THRESHOLD_DIM_NORMALIZE;
      spriteAndMetadata = spriteAndMetadata || {};
      if (spriteAndMetadata.pointsInfo == null) {
        let [pointsInfo, stats] = this.makeDefaultPointsInfoAndStats(ds.points);
        spriteAndMetadata.pointsInfo = pointsInfo;
        spriteAndMetadata.stats = stats;
      }
      let metadataMergeSucceeded = ds.mergeMetadata(spriteAndMetadata);
      if (!metadataMergeSucceeded) {
        return;
      }
    }
    if (this.projectorScatterPlotAdapter != null) {
      if (ds == null) {
        this.projectorScatterPlotAdapter.setLabelPointAccessor(null);
        this.setProjection(null);
      } else {
        this.projectorScatterPlotAdapter.updateScatterPlotPositions();
        this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
        this.projectorScatterPlotAdapter.resize();
        this.projectorScatterPlotAdapter.render();
      }
    }
    if (ds != null) {
      this.dataPanel.setNormalizeData(this.normalizeData);
      this.setCurrentDataSet(ds.getSubset());
      this.projectorScatterPlotAdapter.setLabelPointAccessor(
          this.selectedLabelOption);
      this.inspectorPanel.datasetChanged();

      this.inspectorPanel.metadataChanged(spriteAndMetadata);
      this.projectionsPanel.metadataChanged(spriteAndMetadata);
      this.dataPanel.metadataChanged(spriteAndMetadata, metadataFile);
    } else {
      this.setCurrentDataSet(null);
    }
  }

  metadataEdit(metadataColumn: string, metadataLabel: string) {
    this.selectedPointIndices.forEach(i =>
        this.dataSet.points[i].metadata[metadataColumn] = metadataLabel);
    
    this.neighborsOfFirstPoint.forEach(p =>
        this.dataSet.points[p.index].metadata[metadataColumn] = metadataLabel);
    
    this.dataSet.spriteAndMetadataInfo.stats = analyzeMetadata(
        this.dataSet.spriteAndMetadataInfo.stats.map(s => s.name),
        this.dataSet.points.map(p => p.metadata));
    this.metadataChanged(this.dataSet.spriteAndMetadataInfo);
    this.metadataEditorContext(true, metadataColumn);
  }

  metadataChanged(spriteAndMetadata: SpriteAndMetadataInfo,
      metadataFile?: string) {
    if (metadataFile != null) {
      this.metadataFile = metadataFile;
    }
    this.dataSet.spriteAndMetadataInfo = spriteAndMetadata;
    this.projectionsPanel.metadataChanged(spriteAndMetadata);
    this.inspectorPanel.metadataChanged(spriteAndMetadata);
    this.dataPanel.metadataChanged(spriteAndMetadata, this.metadataFile);
    
    if (this.selectedPointIndices.length > 0) {  // at least one selected point
      this.metadataCard.updateMetadata(  // show metadata for first selected point
          this.dataSet.points[this.selectedPointIndices[0]].metadata);
    }
    else {  // no points selected
      this.metadataCard.updateMetadata(null);  // clear metadata
    }
    this.setSelectedLabelOption(this.selectedLabelOption);
  }

  metadataEditorContext(enabled: boolean, metadataColumn: string) {
    if (this.inspectorPanel) {
      this.inspectorPanel.metadataEditorContext(enabled, metadataColumn);
    }
  }

  setSelectedTensor(run: string, tensorInfo: EmbeddingInfo) {
    this.bookmarkPanel.setSelectedTensor(run, tensorInfo, this.dataProvider);
  }

  /**
   * Registers a listener to be called any time the selected point set changes.
   */
  registerSelectionChangedListener(listener: SelectionChangedListener) {
    this.selectionChangedListeners.push(listener);
  }

  filterDataset(pointIndices: number[]) {
    const selectionSize = this.selectedPointIndices.length;
    if (this.dataSetBeforeFilter == null) {
      this.dataSetBeforeFilter = this.dataSet;
    }
    this.setCurrentDataSet(this.dataSet.getSubset(pointIndices));
    this.dataSetFilterIndices = pointIndices;
    this.projectorScatterPlotAdapter.updateScatterPlotPositions();
    this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
    this.adjustSelectionAndHover(util.range(selectionSize));
  }

  resetFilterDataset() {
    const originalPointIndices = this.selectedPointIndices.map(
        filteredIndex => this.dataSet.points[filteredIndex].index);
    this.setCurrentDataSet(this.dataSetBeforeFilter);
    if (this.projection != null) {
      this.projection.dataSet = this.dataSetBeforeFilter;
    }
    this.dataSetBeforeFilter = null;
    this.projectorScatterPlotAdapter.updateScatterPlotPositions();
    this.projectorScatterPlotAdapter.updateScatterPlotAttributes();
    this.dataSetFilterIndices = [];
    this.adjustSelectionAndHover(originalPointIndices);
  }

  /**
   * Used by clients to indicate that a selection has occurred.
   */
  notifySelectionChanged(newSelectedPointIndices: number[]) {
    let neighbors: knn.NearestEntry[] = [];

    if (this.editMode  // point selection toggle in existing selection
        && newSelectedPointIndices.length > 0) {  // selection required
      if (this.selectedPointIndices.length === 1) {  // main point with neighbors
        let main_point_vector = this.dataSet.points[
            this.selectedPointIndices[0]].vector;
        neighbors = this.neighborsOfFirstPoint.filter(n =>  // deselect
            newSelectedPointIndices.filter(p => p == n.index).length == 0);
        newSelectedPointIndices.forEach(p => {  // add additional neighbors
          if (p != this.selectedPointIndices[0]  // not main point
              && this.neighborsOfFirstPoint.filter(n => n.index == p).length == 0) {
            let p_vector = this.dataSet.points[p].vector;
            let n_dist = this.inspectorPanel.distFunc(main_point_vector, p_vector);
            let pos = 0;  // insertion position into dist ordered neighbors
            while (pos < neighbors.length && neighbors[pos].dist < n_dist)  // find pos
              pos = pos + 1;  // move up the sorted neighbors list according to dist
            neighbors.splice(pos, 0, {index: p, dist: n_dist});  // add new neighbor
          }
        });
      }
      else {  // multiple selections
        let updatedSelectedPointIndices = this.selectedPointIndices.filter(n =>
            newSelectedPointIndices.filter(p => p == n).length == 0);  // deselect
        newSelectedPointIndices.forEach(p => {  // add additional selections
          if (this.selectedPointIndices.filter(s => s == p).length == 0)  // unselected
            updatedSelectedPointIndices.push(p);
        });
        this.selectedPointIndices = updatedSelectedPointIndices;  // update selection

        if (this.selectedPointIndices.length > 0) {  // at least one selected point
          this.metadataCard.updateMetadata(  // show metadata for first selected point
              this.dataSet.points[this.selectedPointIndices[0]].metadata);
        } else {  // no points selected
          this.metadataCard.updateMetadata(null);  // clear metadata
        }
      }
    }
    else {  // normal selection mode
      this.selectedPointIndices = newSelectedPointIndices;

      if (newSelectedPointIndices.length === 1) {
        neighbors = this.dataSet.findNeighbors(
            newSelectedPointIndices[0], this.inspectorPanel.distFunc,
            this.inspectorPanel.numNN);
        this.metadataCard.updateMetadata(
            this.dataSet.points[newSelectedPointIndices[0]].metadata);
      } else {
        this.metadataCard.updateMetadata(null);
      }
    }
    
    this.selectionChangedListeners.forEach(
        l => l(this.selectedPointIndices, neighbors));
  }

  /**
   * Registers a listener to be called any time the mouse hovers over a point.
   */
  registerHoverListener(listener: HoverListener) {
    this.hoverListeners.push(listener);
  }

  /**
   * Used by clients to indicate that a hover is occurring.
   */
  notifyHoverOverPoint(pointIndex: number) {
    this.hoverListeners.forEach(l => l(pointIndex));
  }

  registerProjectionChangedListener(listener: ProjectionChangedListener) {
    this.projectionChangedListeners.push(listener);
  }

  notifyProjectionChanged(projection: Projection) {
    this.projectionChangedListeners.forEach(l => l(projection));
  }

  registerDistanceMetricChangedListener(l: DistanceMetricChangedListener) {
    this.distanceMetricChangedListeners.push(l);
  }

  notifyDistanceMetricChanged(distMetric: DistanceFunction) {
    this.distanceMetricChangedListeners.forEach(l => l(distMetric));
  }

  _dataProtoChanged(dataProtoString: string) {
    let dataProto =
        dataProtoString ? JSON.parse(dataProtoString) as DataProto : null;
    this.initializeDataProvider(dataProto);
  }

  private makeDefaultPointsInfoAndStats(points: DataPoint[]):
      [PointMetadata[], ColumnStats[]] {
    let pointsInfo: PointMetadata[] = [];
    points.forEach(p => {
      let pointInfo: PointMetadata = {};
      pointInfo[INDEX_METADATA_FIELD] = p.index;
      pointsInfo.push(pointInfo);
    });
    let stats: ColumnStats[] = [{
      name: INDEX_METADATA_FIELD,
      isNumeric: false,
      tooManyUniqueValues: true,
      min: 0,
      max: pointsInfo.length - 1
    }];
    return [pointsInfo, stats];
  }

  private initializeDataProvider(dataProto?: DataProto) {
    if (this.servingMode === 'demo') {
      let projectorConfigUrl: string;

      // Only in demo mode do we allow the config being passed via URL.
      let urlParams = util.getURLParams(window.location.search);
      if ('config' in urlParams) {
        projectorConfigUrl = urlParams['config'];
      } else {
        projectorConfigUrl = this.projectorConfigJsonPath;
      }
      this.dataProvider = new DemoDataProvider(projectorConfigUrl);
    } else if (this.servingMode === 'server') {
      if (!this.routePrefix) {
        throw 'route-prefix is a required parameter';
      }
      this.dataProvider = new ServerDataProvider(this.routePrefix);
    } else if (this.servingMode === 'proto' && dataProto != null) {
      this.dataProvider = new ProtoDataProvider(dataProto);
    } else {
      // The component is not ready yet - waiting for the dataProto field.
      return;
    }

    this.dataPanel.initialize(this, this.dataProvider);
  }

  private getLegendPointColorer(colorOption: ColorOption):
      (ds: DataSet, index: number) => string {
    if ((colorOption == null) || (colorOption.map == null)) {
      return null;
    }
    const colorer = (ds: DataSet, i: number) => {
      let value = ds.points[i].metadata[this.selectedColorOption.name];
      if (value == null) {
        return POINT_COLOR_MISSING;
      }
      return colorOption.map(value);
    };
    return colorer;
  }

  private get3DLabelModeButton(): any {
    return this.querySelector('#labels3DMode');
  }

  private get3DLabelMode(): boolean {
    const label3DModeButton = this.get3DLabelModeButton();
    return (label3DModeButton as any).active;
  }

  adjustSelectionAndHover(selectedPointIndices: number[], hoverIndex?: number) {
    this.notifySelectionChanged(selectedPointIndices);
    this.notifyHoverOverPoint(hoverIndex);
    this.setMouseMode(MouseMode.CAMERA_AND_CLICK_SELECT);
  }

  private setMouseMode(mouseMode: MouseMode) {
    let selectModeButton = this.querySelector('#selectMode');
    (selectModeButton as any).active = (mouseMode === MouseMode.AREA_SELECT);
    this.projectorScatterPlotAdapter.scatterPlot.setMouseMode(mouseMode);
  }

  private setCurrentDataSet(ds: DataSet) {
    this.adjustSelectionAndHover([]);
    if (this.dataSet != null) {
      this.dataSet.stopTSNE();
    }
    if ((ds != null) && this.normalizeData) {
      ds.normalize();
    }
    this.dim = (ds == null) ? 0 : ds.dim[1];
    (this.querySelector('span.numDataPoints') as HTMLSpanElement).innerText =
        (ds == null) ? '0' : '' + ds.dim[0];
    (this.querySelector('span.dim') as HTMLSpanElement).innerText =
        (ds == null) ? '0' : '' + ds.dim[1];

    this.dataSet = ds;

    this.projectionsPanel.dataSetUpdated(
        this.dataSet, this.originalDataSet, this.dim);

    this.projectorScatterPlotAdapter.setDataSet(this.dataSet);
    this.projectorScatterPlotAdapter.scatterPlot
        .setCameraParametersForNextCameraCreation(null, true);
  }

  private setupUIControls() {
    // View controls
    this.querySelector('#reset-zoom').addEventListener('click', () => {
      this.projectorScatterPlotAdapter.scatterPlot.resetZoom();
      this.projectorScatterPlotAdapter.scatterPlot.startOrbitAnimation();
    });

    let selectModeButton = this.querySelector('#selectMode');
    selectModeButton.addEventListener('click', (event) => {
      this.setMouseMode(
          (selectModeButton as any).active ? MouseMode.AREA_SELECT :
                                             MouseMode.CAMERA_AND_CLICK_SELECT);
    });
    let nightModeButton = this.querySelector('#nightDayMode');
    nightModeButton.addEventListener('click', () => {
      this.projectorScatterPlotAdapter.scatterPlot.setDayNightMode(
          (nightModeButton as any).active);
    });

    let editModeButton = this.querySelector('#editMode');
      editModeButton.addEventListener('click', (event) => {
        this.editMode = (editModeButton as any).active;
    });

    const labels3DModeButton = this.get3DLabelModeButton();
    labels3DModeButton.addEventListener('click', () => {
      this.projectorScatterPlotAdapter.set3DLabelMode(this.get3DLabelMode());
    });

    window.addEventListener('resize', () => {
      const container = this.parentNode as HTMLDivElement;
      container.style.height = document.body.clientHeight + 'px';
      this.projectorScatterPlotAdapter.resize();
    });

    {
      this.projectorScatterPlotAdapter = new ProjectorScatterPlotAdapter(
          this.getScatterContainer(), this as ProjectorEventContext);
      this.projectorScatterPlotAdapter.setLabelPointAccessor(
          this.selectedLabelOption);
    }

    this.projectorScatterPlotAdapter.scatterPlot.onCameraMove(
        (cameraPosition: THREE.Vector3, cameraTarget: THREE.Vector3) =>
            this.bookmarkPanel.clearStateSelection());

    this.registerHoverListener(
        (hoverIndex: number) => this.onHover(hoverIndex));

    this.registerProjectionChangedListener((projection: Projection) =>
        this.onProjectionChanged(projection));

    this.registerSelectionChangedListener(
        (selectedPointIndices: number[],
         neighborsOfFirstPoint: knn.NearestEntry[]) =>
            this.onSelectionChanged(
                selectedPointIndices, neighborsOfFirstPoint));
  }

  private onHover(hoverIndex: number) {
    this.hoverPointIndex = hoverIndex;
    let hoverText = null;
    if (hoverIndex != null) {
      const point = this.dataSet.points[hoverIndex];
      if (point.metadata[this.selectedLabelOption]) {
        hoverText = point.metadata[this.selectedLabelOption].toString();
      }
    }
    if (this.selectedPointIndices.length === 0) {
      this.statusBar.style.display = hoverText ? null : 'none';
      this.statusBar.innerText = hoverText;
    }
  }

  private getScatterContainer(): HTMLDivElement {
    return this.querySelector('#scatter') as HTMLDivElement;
  }

  private onSelectionChanged(
      selectedPointIndices: number[],
      neighborsOfFirstPoint: knn.NearestEntry[]) {
    this.selectedPointIndices = selectedPointIndices;
    this.neighborsOfFirstPoint = neighborsOfFirstPoint;
    this.dataPanel.onProjectorSelectionChanged(selectedPointIndices, 
        neighborsOfFirstPoint);
    let totalNumPoints =
        this.selectedPointIndices.length + neighborsOfFirstPoint.length;
    this.statusBar.innerText = `Selected ${totalNumPoints} points`;
    this.statusBar.style.display = totalNumPoints > 0 ? null : 'none';
  }

  onProjectionChanged(projection?: Projection) {
    this.dataPanel.projectionChanged(projection);
  }

  setProjection(projection: Projection) {
    this.projection = projection;
    if (projection != null) {
      this.analyticsLogger.logProjectionChanged(projection.projectionType);
    }
    this.notifyProjectionChanged(projection);
  }

  notifyProjectionPositionsUpdated() {
    this.projectorScatterPlotAdapter.notifyProjectionPositionsUpdated();
  }

  /**
   * Gets the current view of the embedding and saves it as a State object.
   */
  getCurrentState(): State {
    const state = new State();

    // Save the individual datapoint projections.
    state.projections = [];
    for (let i = 0; i < this.dataSet.points.length; i++) {
      const point = this.dataSet.points[i];
      const projections: {[key: string]: number} = {};
      const keys = Object.keys(point.projections);
      for (let j = 0; j < keys.length; ++j) {
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
  }

  /** Loads a State object into the world. */
  loadState(state: State) {
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
    for (let i = 0; i < state.projections.length; i++) {
      const point = this.dataSet.points[i];
      const projection = state.projections[i];
      const keys = Object.keys(projection);
      for (let j = 0; j < keys.length; ++j) {
        point.projections[keys[j]] = projection[keys[j]];
      }
    }
    this.dataSet.hasTSNERun = (state.selectedProjection === 'tsne');
    this.dataSet.tSNEIteration = state.tSNEIteration;
    this.projectionsPanel.restoreUIFromBookmark(state);
    this.inspectorPanel.restoreUIFromBookmark(state);
    this.dataPanel.selectedColorOptionName = state.selectedColorOptionName;
    this.dataPanel.setForceCategoricalColoring(
        !!state.forceCategoricalColoring);
    this.selectedLabelOption = state.selectedLabelOption;
    this.projectorScatterPlotAdapter.restoreUIFromBookmark(state);
    {
      const dimensions = stateGetAccessorDimensions(state);
      const components =
          getProjectionComponents(state.selectedProjection, dimensions);
      const projection = new Projection(
          state.selectedProjection, components, dimensions.length,
          this.dataSet);
      this.setProjection(projection);
    }
    this.notifySelectionChanged(state.selectedPoints);
  }
}

document.registerElement(Projector.prototype.is, Projector);

}  // namespace vz_projector
