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

/** Limit the number of search results we show to the user. */
const LIMIT_RESULTS = 100;

// tslint:disable-next-line
export let InspectorPanelPolymer = PolymerElement({
  is: 'vz-projector-inspector-panel',
  properties: {
    selectedMetadataField: String,
    metadataFields: Array,
    selectedDistance: String,
    distanceFields: Array,
    distanceChanged: Object,
    selectedNeighborhood: String,
    neighborhoodFields: Array,
    neighborhoodChanged: Object
  }
});

export class InspectorPanel extends InspectorPanelPolymer {
  distFunc: DistanceFunction;
  distSpace: DistanceSpace;
  knnFunc: knn.KNNFunction<DataPoint>;
  numNN: number;

  private projectorEventContext: ProjectorEventContext;

  private selectedMetadataField: string;
  private metadataFields: string[];
  private selectedDistance: string;
  private distanceFields: string[];
  private selectedNeighborhood: string;
  private neighborhoodFields: string[];

  private projector: Projector;
  private selectedPointIndices: number[];
  private neighborsOfFirstPoint: knn.NearestEntry[];
  private searchBox: ProjectorInput;

  private resetFilterButton: HTMLButtonElement;
  private setFilterButton: HTMLButtonElement;
  private clearSelectionButton: HTMLButtonElement;
  private limitMessage: HTMLDivElement;

  ready() {
    this.resetFilterButton =
        this.querySelector('.reset-filter') as HTMLButtonElement;
    this.setFilterButton =
        this.querySelector('.set-filter') as HTMLButtonElement;
    this.clearSelectionButton =
        this.querySelector('.clear-selection') as HTMLButtonElement;
    this.limitMessage = this.querySelector('.limit-msg') as HTMLDivElement;
    this.searchBox = this.querySelector('#search-box') as ProjectorInput;
    // https://www.polymer-project.org/1.0/docs/devguide/styling#scope-subtree
    this.scopeSubtree(this, true);
  }

  initialize(
      projector: Projector, projectorEventContext: ProjectorEventContext) {
    this.projector = projector;
    this.projectorEventContext = projectorEventContext;
    this.setupUI(projector);
    projectorEventContext.registerSelectionChangedListener(
        (selection, neighbors) =>
            this.updateInspectorPane(selection, neighbors));
  }

  /** Updates the nearest neighbors list in the inspector. */
  private updateInspectorPane(
      indices: number[], neighbors: knn.NearestEntry[]) {
    this.neighborsOfFirstPoint = neighbors;
    this.selectedPointIndices = indices;

    this.updateFilterButtons(indices.length + neighbors.length);
    this.updateNeighborsList(neighbors);
    if (neighbors.length === 0) {
      this.updateSearchResults(indices);
    } else {
      this.updateSearchResults([]);
    }
  }

  private enableResetFilterButton(enabled: boolean) {
    this.resetFilterButton.disabled = !enabled;
  }

  restoreUIFromBookmark(bookmark: State) {
    this.enableResetFilterButton(bookmark.filteredPoints != null);
  }

  metadataChanged(spriteAndMetadata: SpriteAndMetadataInfo) {
    let labelIndex = -1;
    this.metadataFields = spriteAndMetadata.stats.map((stats, i) => {
      if (!stats.isNumeric && labelIndex === -1) {
        labelIndex = i;
      }
      return stats.name;
    });

    if (this.selectedMetadataField == null || this.metadataFields.filter(name =>
        name == this.selectedMetadataField).length == 0) {
      // Make the default label the first non-numeric column.
      this.selectedMetadataField = this.metadataFields[Math.max(0, labelIndex)];
    }
    this.updateInspectorPane(this.selectedPointIndices, 
        this.neighborsOfFirstPoint);
  }

  datasetChanged() {
    this.enableResetFilterButton(false);
  }

  projectionChanged(projection?: Projection) {
    if (this.projector && this.projector.dataSet) {
      let pTypes : string[] = [];
      let projections = this.projector.dataSet.projections;
      // Find the available projections, removing dimensions, e.g. pca-1 to pca
      for (let entry in projections) {
        if (projections[entry]) {
          pTypes.push(entry.split('-')[0]);
        }
      }
      // Removing duplicate entries, needed due to multiple dimensions for pca
      pTypes = Array.from(new Set(pTypes));
      // Add new projections to distanceFields
      pTypes.forEach(pType => {
        if (this.distanceFields.indexOf(pType) == -1) {
          this.push('distanceFields', pType);
        }
      });
      // Remove unavailable projections from distanceFields
      let removeFields = [];
      this.distanceFields.forEach((field, index) => {
        if (pTypes.indexOf(field) == -1
            && field != 'cosine' && field != 'euclidean') {
          removeFields.push(index);
        }
      });
      removeFields.forEach(index => this.splice('distanceFields', index, 1));

      if (projection) {
        this.selectedDistance = projection.projectionType;
      }
      else {
        // Set selected distance to last element
        this.selectedDistance = this.distanceFields[this.distanceFields.length-1];
      }
    }
  }

  private updateSearchResults(indices: number[]) {
    const container = this.querySelector('.matches-list') as HTMLDivElement;
    container.style.display = indices.length ? null : 'none';
    const list = container.querySelector('.list') as HTMLDivElement;
    list.innerHTML = '';
    if (indices.length === 0) {
      return;
    }

    this.limitMessage.style.display =
        indices.length <= LIMIT_RESULTS ? 'none' : null;
    indices = indices.slice(0, LIMIT_RESULTS);

    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];

      const row = document.createElement('div');
      row.className = 'row';

      const label = this.getLabelFromIndex(index);
      const rowLink = document.createElement('a');
      rowLink.className = 'label';
      rowLink.title = label;
      rowLink.innerText = label;

      rowLink.onmouseenter = () => {
        this.projectorEventContext.notifyHoverOverPoint(index);
      };
      rowLink.onmouseleave = () => {
        this.projectorEventContext.notifyHoverOverPoint(null);
      };
      rowLink.onclick = () => {
        this.projectorEventContext.notifySelectionChanged([index], 'normal');
      };

      row.appendChild(rowLink);
      list.appendChild(row);
    }
  }

  private getLabelFromIndex(pointIndex: number): string {
    const point = this.projector.dataSet.points[pointIndex];
    return point.metadata[this.selectedMetadataField].toString();
  }

  private updateNeighborsList(neighbors: knn.NearestEntry[]) {
    const nnlist = this.querySelector('.nn-list') as HTMLDivElement;
    nnlist.innerHTML = '';

    (this.querySelector('.nn') as HTMLDivElement).style.display =
        neighbors.length ? null : 'none';

    if (neighbors.length === 0) {
      return;
    }

    this.searchBox.message = '';
    const minDist = neighbors.length > 0 ? neighbors[0].dist : 0;

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];

      const neighborElement = document.createElement('div');
      neighborElement.className = 'neighbor';

      const neighborElementLink = document.createElement('a');
      neighborElementLink.className = 'neighbor-link';
      neighborElementLink.title = this.getLabelFromIndex(neighbor.index);

      const labelValueElement = document.createElement('div');
      labelValueElement.className = 'label-and-value';

      const labelElement = document.createElement('div');
      labelElement.className = 'label';
      labelElement.style.color =
          dist2color(this.distFunc, neighbor.dist, minDist);
      labelElement.innerText = this.getLabelFromIndex(neighbor.index);

      const valueElement = document.createElement('div');
      valueElement.className = 'value';
      valueElement.innerText = neighbor.dist.toFixed(3);

      labelValueElement.appendChild(labelElement);
      labelValueElement.appendChild(valueElement);

      const barElement = document.createElement('div');
      barElement.className = 'bar';

      const barFillElement = document.createElement('div');
      barFillElement.className = 'fill';
      barFillElement.style.borderTopColor =
          dist2color(this.distFunc, neighbor.dist, minDist);
      barFillElement.style.width =
          normalizeDist(this.distFunc, neighbor.dist, minDist) * 100 +
          '%';
      barElement.appendChild(barFillElement);

      for (let j = 1; j < 4; j++) {
        const tickElement = document.createElement('div');
        tickElement.className = 'tick';
        tickElement.style.left = j * 100 / 4 + '%';
        barElement.appendChild(tickElement);
      }

      neighborElementLink.appendChild(labelValueElement);
      neighborElementLink.appendChild(barElement);
      neighborElement.appendChild(neighborElementLink);
      nnlist.appendChild(neighborElement);

      neighborElementLink.onmouseenter = () => {
        this.projectorEventContext.notifyHoverOverPoint(neighbor.index);
      };
      neighborElementLink.onmouseleave = () => {
        this.projectorEventContext.notifyHoverOverPoint(null);
      };
      neighborElementLink.onclick = () => {
        this.projectorEventContext.notifySelectionChanged([neighbor.index],
            'normal');
      };
    }
  }

  private updateFilterButtons(numPoints: number) {
    if (numPoints > 1) {
      this.setFilterButton.innerText = `Isolate ${numPoints} points`;
      this.setFilterButton.disabled = null;
      this.clearSelectionButton.disabled = null;
    } else {
      this.setFilterButton.disabled = true;
      this.clearSelectionButton.disabled = true;
    }
  }

  private setupUI(projector: Projector) {
    this.distFunc = vector.cosDist;
    this.distSpace = d => d.vector;
    this.knnFunc = knn.findKNNofPoint;

    this.distanceFields = ['cosine', 'euclidean', 'pca'];
    this.selectedDistance = 'pca';
    this.neighborhoodFields = ['knn', 'geodesic'];
    this.selectedNeighborhood = 'knn';

    // Called whenever the search text input changes.
    const updateInput = (value: string, inRegexMode: boolean) => {
      if (value == null || value.trim() === '') {
        this.searchBox.message = '';
        this.projectorEventContext.notifySelectionChanged([], 'normal');
        return;
      }
      const indices = projector.dataSet.query(
          value, inRegexMode, this.selectedMetadataField);
      if (indices.length === 0) {
        this.searchBox.message = '0 matches.';
      } else {
        this.searchBox.message = `${indices.length} matches.`;
      }
      this.projectorEventContext.notifySelectionChanged(indices, 'normal');
    };
    this.searchBox.registerInputChangedListener((value, inRegexMode) => {
      updateInput(value, inRegexMode);
    });

    // Nearest neighbors controls.
    const numNNInput = this.$$('#nn-slider') as HTMLInputElement;
    const updateNumNN = () => {
      this.numNN = +numNNInput.value;
      if (this.selectedPointIndices != null) {
        this.projectorEventContext.notifySelectionChanged(
            [this.selectedPointIndices[0]], 'normal');
      }
    };
    numNNInput.addEventListener('change', updateNumNN);
    updateNumNN();

    // Filtering dataset.
    this.setFilterButton.onclick = () => {
      const indices = this.selectedPointIndices.concat(
          this.neighborsOfFirstPoint.map(n => n.index));
      projector.filterDataset(indices);
      this.enableResetFilterButton(true);
      this.updateFilterButtons(0);
    };

    this.resetFilterButton.onclick = () => {
      projector.resetFilterDataset();
      this.enableResetFilterButton(false);
    };

    this.clearSelectionButton.onclick = () => {
      projector.adjustSelectionAndHover([]);
    };
    this.enableResetFilterButton(false);
  }

  private updateNeighborsDisplay() {
    if (this.projectorEventContext && this.projector
        && this.projector.dataSet) {
      this.projectorEventContext.notifyDistanceMetricChanged(this.distFunc);

      if (this.selectedPointIndices.length == 1) {
        this.projectorEventContext.notifySelectionChanged(
          this.selectedPointIndices, 'normal');
        const neighbors = this.projector.dataSet.findNeighbors(
            this.selectedPointIndices[0], this.numNN,
            this.distSpace, this.distFunc, this.knnFunc);
        this.updateNeighborsList(neighbors);
      }
    }
  }

  private distanceChanged() {
    switch (this.selectedDistance) {
      case 'cosine':
        this.distFunc = vector.cosDist;
        this.distSpace = d => d.vector;
        break;

      case 'euclidean':
        this.distFunc = vector.dist;
        this.distSpace = d => d.vector;
        break;

      case 'pca':
        this.distFunc = vector.dist;
        this.distSpace = d => new Float32Array(
          ('pca-2' in d.projections) ?
          [d.projections['pca-0'], d.projections['pca-1'],
              d.projections['pca-2']] :
          ('pca-1' in d.projections) ?
          [d.projections['pca-0'], d.projections['pca-1']] : d.vector);
        break;

      case 'tsne':
        if (this.projector.dataSet.hasTSNERun) {
          this.distFunc = vector.dist;
          this.distSpace = d => new Float32Array(
            ('tsne-2' in d.projections) ?
            [d.projections['tsne-0'], d.projections['tsne-1'],
                d.projections['tsne-2']] :
            ('tsne-1' in d.projections) ?
            [d.projections['tsne-0'], d.projections['tsne-1']] : d.vector);
        }
        break;

      case 'custom':
        this.distFunc = vector.dist;
        this.distSpace = d => new Float32Array(
            ('custom-0' in d.projections) ?
            [d.projections['custom-0'], d.projections['custom-1']] : d.vector);
    }
    this.updateNeighborsDisplay();
  }

  private neighborhoodChanged() {
    switch (this.selectedNeighborhood) {
      case 'knn':
        this.knnFunc = knn.findKNNofPoint;
        break;

      case 'geodesic':
        this.knnFunc = knn.findGeodesicKNNofPoint;
    }
    this.updateNeighborsDisplay();
  }

}

document.registerElement(InspectorPanel.prototype.is, InspectorPanel);

}  // namespace vz_projector
