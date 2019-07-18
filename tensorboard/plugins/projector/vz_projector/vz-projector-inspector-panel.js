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
    /** Limit the number of search results we show to the user. */
    const LIMIT_RESULTS = 100;
    // tslint:disable-next-line
    vz_projector.InspectorPanelPolymer = vz_projector.PolymerElement({
        is: 'vz-projector-inspector-panel',
        properties: {
            selectedMetadataField: String,
            metadataFields: Array,
            metadataColumn: String,
            numNN: { type: Number, value: 100 },
            updateNumNN: Object
        }
    });
    class InspectorPanel extends vz_projector.InspectorPanelPolymer {
        ready() {
            super.ready();
            this.resetFilterButton =
                this.$$('.reset-filter');
            this.setFilterButton =
                this.$$('.set-filter');
            this.clearSelectionButton =
                this.$$('.clear-selection');
            this.limitMessage = this.$$('.limit-msg');
            this.searchBox = this.$$('#search-box');
            this.displayContexts = [];
        }
        initialize(projector, projectorEventContext) {
            this.projector = projector;
            this.projectorEventContext = projectorEventContext;
            this.setupUI(projector);
            projectorEventContext.registerSelectionChangedListener((selection, neighbors) => this.updateInspectorPane(selection, neighbors));
        }
        /** Updates the nearest neighbors list in the inspector. */
        updateInspectorPane(indices, neighbors) {
            this.neighborsOfFirstPoint = neighbors;
            this.selectedPointIndices = indices;
            this.updateFilterButtons(indices.length + neighbors.length);
            this.updateNeighborsList(neighbors);
            if (neighbors.length === 0) {
                this.updateSearchResults(indices);
            }
            else {
                this.updateSearchResults([]);
            }
        }
        enableResetFilterButton(enabled) {
            this.resetFilterButton.disabled = !enabled;
        }
        restoreUIFromBookmark(bookmark) {
            this.enableResetFilterButton(bookmark.filteredPoints != null);
        }
        metadataChanged(spriteAndMetadata) {
            let labelIndex = -1;
            this.metadataFields = spriteAndMetadata.stats.map((stats, i) => {
                if (!stats.isNumeric && labelIndex === -1) {
                    labelIndex = i;
                }
                return stats.name;
            });
            if (this.selectedMetadataField == null || this.metadataFields.filter(name => name === this.selectedMetadataField).length === 0) {
                // Make the default label the first non-numeric column.
                this.selectedMetadataField = this.metadataFields[Math.max(0, labelIndex)];
            }
            this.updateInspectorPane(this.selectedPointIndices, this.neighborsOfFirstPoint);
        }
        datasetChanged() {
            this.enableResetFilterButton(false);
        }
        metadataEditorContext(enabled, metadataColumn) {
            if (!this.projector || !this.projector.dataSet) {
                return;
            }
            let stat = this.projector.dataSet.spriteAndMetadataInfo.stats.filter(s => s.name === metadataColumn);
            if (!enabled || stat.length === 0 || stat[0].tooManyUniqueValues) {
                this.removeContext('.metadata-info');
                return;
            }
            this.metadataColumn = metadataColumn;
            this.addContext('.metadata-info');
            let list = this.$$('.metadata-list');
            list.innerHTML = '';
            let entries = stat[0].uniqueEntries.sort((a, b) => a.count - b.count);
            let maxCount = entries[entries.length - 1].count;
            entries.forEach(e => {
                const metadataElement = document.createElement('div');
                metadataElement.className = 'metadata';
                const metadataElementLink = document.createElement('a');
                metadataElementLink.className = 'metadata-link';
                metadataElementLink.title = e.label;
                const labelValueElement = document.createElement('div');
                labelValueElement.className = 'label-and-value';
                const labelElement = document.createElement('div');
                labelElement.className = 'label';
                labelElement.style.color =
                    vz_projector.dist2color(this.distFunc, maxCount, e.count);
                labelElement.innerText = e.label;
                const valueElement = document.createElement('div');
                valueElement.className = 'value';
                valueElement.innerText = e.count.toString();
                labelValueElement.appendChild(labelElement);
                labelValueElement.appendChild(valueElement);
                const barElement = document.createElement('div');
                barElement.className = 'bar';
                const barFillElement = document.createElement('div');
                barFillElement.className = 'fill';
                barFillElement.style.borderTopColor =
                    vz_projector.dist2color(this.distFunc, maxCount, e.count);
                barFillElement.style.width =
                    vz_projector.normalizeDist(this.distFunc, maxCount, e.count) * 100 + '%';
                barElement.appendChild(barFillElement);
                for (let j = 1; j < 4; j++) {
                    const tickElement = document.createElement('div');
                    tickElement.className = 'tick';
                    tickElement.style.left = j * 100 / 4 + '%';
                    barElement.appendChild(tickElement);
                }
                metadataElementLink.appendChild(labelValueElement);
                metadataElementLink.appendChild(barElement);
                metadataElement.appendChild(metadataElementLink);
                list.appendChild(metadataElement);
                metadataElementLink.onclick = () => {
                    this.projector.metadataEdit(metadataColumn, e.label);
                };
            });
        }
        addContext(context) {
            if (this.displayContexts.indexOf(context) === -1) {
                this.displayContexts.push(context);
            }
            this.displayContexts.forEach(c => {
                this.$$(c).style.display = 'none';
            });
            this.$$(context).style.display = null;
        }
        removeContext(context) {
            this.displayContexts = this.displayContexts.filter(c => c !== context);
            this.$$(context).style.display = 'none';
            if (this.displayContexts.length > 0) {
                let lastContext = this.displayContexts[this.displayContexts.length - 1];
                this.$$(lastContext).style.display = null;
            }
        }
        updateSearchResults(indices) {
            const container = this.$$('.matches-list');
            const list = container.querySelector('.list');
            list.innerHTML = '';
            if (indices.length === 0) {
                this.removeContext('.matches-list');
                return;
            }
            this.addContext('.matches-list');
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
                    this.projectorEventContext.notifySelectionChanged([index]);
                };
                row.appendChild(rowLink);
                list.appendChild(row);
            }
        }
        getLabelFromIndex(pointIndex) {
            const point = this.projector.dataSet.points[pointIndex];
            return point.metadata[this.selectedMetadataField].toString();
        }
        updateNeighborsList(neighbors) {
            const nnlist = this.$$('.nn-list');
            nnlist.innerHTML = '';
            if (neighbors.length === 0) {
                this.removeContext('.nn');
                return;
            }
            this.addContext('.nn');
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
                    vz_projector.dist2color(this.distFunc, neighbor.dist, minDist);
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
                    vz_projector.dist2color(this.distFunc, neighbor.dist, minDist);
                barFillElement.style.width =
                    vz_projector.normalizeDist(this.distFunc, neighbor.dist, minDist) * 100 +
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
                    this.projectorEventContext.notifySelectionChanged([neighbor.index]);
                };
            }
        }
        updateFilterButtons(numPoints) {
            if (numPoints > 1) {
                this.setFilterButton.innerText = `Isolate ${numPoints} points`;
                this.setFilterButton.disabled = null;
                this.clearSelectionButton.disabled = null;
            }
            else {
                this.setFilterButton.disabled = true;
                this.clearSelectionButton.disabled = true;
            }
        }
        setupUI(projector) {
            this.distFunc = vz_projector.vector.cosDist;
            const eucDist = this.$$('.distance a.euclidean');
            eucDist.onclick = () => {
                const links = this.root.querySelectorAll('.distance a');
                for (let i = 0; i < links.length; i++) {
                    vz_projector.util.classed(links[i], 'selected', false);
                }
                vz_projector.util.classed(eucDist, 'selected', true);
                this.distFunc = vz_projector.vector.dist;
                this.projectorEventContext.notifyDistanceMetricChanged(this.distFunc);
                const neighbors = projector.dataSet.findNeighbors(this.selectedPointIndices[0], this.distFunc, this.numNN);
                this.updateNeighborsList(neighbors);
            };
            const cosDist = this.$$('.distance a.cosine');
            cosDist.onclick = () => {
                const links = this.root.querySelectorAll('.distance a');
                for (let i = 0; i < links.length; i++) {
                    vz_projector.util.classed(links[i], 'selected', false);
                }
                vz_projector.util.classed(cosDist, 'selected', true);
                this.distFunc = vz_projector.vector.cosDist;
                this.projectorEventContext.notifyDistanceMetricChanged(this.distFunc);
                const neighbors = projector.dataSet.findNeighbors(this.selectedPointIndices[0], this.distFunc, this.numNN);
                this.updateNeighborsList(neighbors);
            };
            // Called whenever the search text input changes.
            const updateInput = (value, inRegexMode) => {
                if (value == null || value.trim() === '') {
                    this.searchBox.message = '';
                    this.projectorEventContext.notifySelectionChanged([]);
                    return;
                }
                const indices = projector.dataSet.query(value, inRegexMode, this.selectedMetadataField);
                if (indices.length === 0) {
                    this.searchBox.message = '0 matches.';
                }
                else {
                    this.searchBox.message = `${indices.length} matches.`;
                }
                this.projectorEventContext.notifySelectionChanged(indices);
            };
            this.searchBox.registerInputChangedListener((value, inRegexMode) => {
                updateInput(value, inRegexMode);
            });
            // Filtering dataset.
            this.setFilterButton.onclick = () => {
                const indices = this.selectedPointIndices.concat(this.neighborsOfFirstPoint.map(n => n.index));
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
        updateNumNN() {
            if (this.selectedPointIndices != null) {
                this.projectorEventContext.notifySelectionChanged([this.selectedPointIndices[0]]);
            }
        }
        ;
    }
    vz_projector.InspectorPanel = InspectorPanel;
    customElements.define(InspectorPanel.prototype.is, InspectorPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
