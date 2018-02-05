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
    /** Limit the number of search results we show to the user. */
    var LIMIT_RESULTS = 100;
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
    var InspectorPanel = /** @class */ (function (_super) {
        __extends(InspectorPanel, _super);
        function InspectorPanel() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        InspectorPanel.prototype.ready = function () {
            this.resetFilterButton =
                this.querySelector('.reset-filter');
            this.setFilterButton =
                this.querySelector('.set-filter');
            this.clearSelectionButton =
                this.querySelector('.clear-selection');
            this.limitMessage = this.querySelector('.limit-msg');
            this.searchBox = this.querySelector('#search-box');
            this.displayContexts = [];
            // https://www.polymer-project.org/1.0/docs/devguide/styling#scope-subtree
            this.scopeSubtree(this, true);
        };
        InspectorPanel.prototype.initialize = function (projector, projectorEventContext) {
            var _this = this;
            this.projector = projector;
            this.projectorEventContext = projectorEventContext;
            this.setupUI(projector);
            projectorEventContext.registerSelectionChangedListener(function (selection, neighbors) {
                return _this.updateInspectorPane(selection, neighbors);
            });
        };
        /** Updates the nearest neighbors list in the inspector. */
        InspectorPanel.prototype.updateInspectorPane = function (indices, neighbors) {
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
        };
        InspectorPanel.prototype.enableResetFilterButton = function (enabled) {
            this.resetFilterButton.disabled = !enabled;
        };
        InspectorPanel.prototype.restoreUIFromBookmark = function (bookmark) {
            this.enableResetFilterButton(bookmark.filteredPoints != null);
        };
        InspectorPanel.prototype.metadataChanged = function (spriteAndMetadata) {
            var _this = this;
            var labelIndex = -1;
            this.metadataFields = spriteAndMetadata.stats.map(function (stats, i) {
                if (!stats.isNumeric && labelIndex === -1) {
                    labelIndex = i;
                }
                return stats.name;
            });
            if (this.selectedMetadataField == null || this.metadataFields.filter(function (name) {
                return name === _this.selectedMetadataField;
            }).length === 0) {
                // Make the default label the first non-numeric column.
                this.selectedMetadataField = this.metadataFields[Math.max(0, labelIndex)];
            }
            this.updateInspectorPane(this.selectedPointIndices, this.neighborsOfFirstPoint);
        };
        InspectorPanel.prototype.datasetChanged = function () {
            this.enableResetFilterButton(false);
        };
        InspectorPanel.prototype.metadataEditorContext = function (enabled, metadataColumn) {
            var _this = this;
            if (!this.projector || !this.projector.dataSet) {
                return;
            }
            var stat = this.projector.dataSet.spriteAndMetadataInfo.stats.filter(function (s) {
                return s.name === metadataColumn;
            });
            if (!enabled || stat.length === 0 || stat[0].tooManyUniqueValues) {
                this.removeContext('.metadata-info');
                return;
            }
            this.metadataColumn = metadataColumn;
            this.addContext('.metadata-info');
            var list = this.querySelector('.metadata-list');
            list.innerHTML = '';
            var entries = stat[0].uniqueEntries.sort(function (a, b) { return a.count - b.count; });
            var maxCount = entries[entries.length - 1].count;
            entries.forEach(function (e) {
                var metadataElement = document.createElement('div');
                metadataElement.className = 'metadata';
                var metadataElementLink = document.createElement('a');
                metadataElementLink.className = 'metadata-link';
                metadataElementLink.title = e.label;
                var labelValueElement = document.createElement('div');
                labelValueElement.className = 'label-and-value';
                var labelElement = document.createElement('div');
                labelElement.className = 'label';
                labelElement.style.color =
                    vz_projector.dist2color(_this.distFunc, maxCount, e.count);
                labelElement.innerText = e.label;
                var valueElement = document.createElement('div');
                valueElement.className = 'value';
                valueElement.innerText = e.count.toString();
                labelValueElement.appendChild(labelElement);
                labelValueElement.appendChild(valueElement);
                var barElement = document.createElement('div');
                barElement.className = 'bar';
                var barFillElement = document.createElement('div');
                barFillElement.className = 'fill';
                barFillElement.style.borderTopColor =
                    vz_projector.dist2color(_this.distFunc, maxCount, e.count);
                barFillElement.style.width =
                    vz_projector.normalizeDist(_this.distFunc, maxCount, e.count) * 100 + '%';
                barElement.appendChild(barFillElement);
                for (var j = 1; j < 4; j++) {
                    var tickElement = document.createElement('div');
                    tickElement.className = 'tick';
                    tickElement.style.left = j * 100 / 4 + '%';
                    barElement.appendChild(tickElement);
                }
                metadataElementLink.appendChild(labelValueElement);
                metadataElementLink.appendChild(barElement);
                metadataElement.appendChild(metadataElementLink);
                list.appendChild(metadataElement);
                metadataElementLink.onclick = function () {
                    _this.projector.metadataEdit(metadataColumn, e.label);
                };
            });
        };
        InspectorPanel.prototype.addContext = function (context) {
            var _this = this;
            if (this.displayContexts.indexOf(context) === -1) {
                this.displayContexts.push(context);
            }
            this.displayContexts.forEach(function (c) {
                _this.querySelector(c).style.display = 'none';
            });
            this.querySelector(context).style.display = null;
        };
        InspectorPanel.prototype.removeContext = function (context) {
            this.displayContexts = this.displayContexts.filter(function (c) { return c !== context; });
            this.querySelector(context).style.display = 'none';
            if (this.displayContexts.length > 0) {
                var lastContext = this.displayContexts[this.displayContexts.length - 1];
                this.querySelector(lastContext).style.display = null;
            }
        };
        InspectorPanel.prototype.updateSearchResults = function (indices) {
            var _this = this;
            var container = this.querySelector('.matches-list');
            var list = container.querySelector('.list');
            list.innerHTML = '';
            if (indices.length === 0) {
                this.removeContext('.matches-list');
                return;
            }
            this.addContext('.matches-list');
            this.limitMessage.style.display =
                indices.length <= LIMIT_RESULTS ? 'none' : null;
            indices = indices.slice(0, LIMIT_RESULTS);
            var _loop_1 = function (i) {
                var index = indices[i];
                var row = document.createElement('div');
                row.className = 'row';
                var label = this_1.getLabelFromIndex(index);
                var rowLink = document.createElement('a');
                rowLink.className = 'label';
                rowLink.title = label;
                rowLink.innerText = label;
                rowLink.onmouseenter = function () {
                    _this.projectorEventContext.notifyHoverOverPoint(index);
                };
                rowLink.onmouseleave = function () {
                    _this.projectorEventContext.notifyHoverOverPoint(null);
                };
                rowLink.onclick = function () {
                    _this.projectorEventContext.notifySelectionChanged([index]);
                };
                row.appendChild(rowLink);
                list.appendChild(row);
            };
            var this_1 = this;
            for (var i = 0; i < indices.length; i++) {
                _loop_1(i);
            }
        };
        InspectorPanel.prototype.getLabelFromIndex = function (pointIndex) {
            var point = this.projector.dataSet.points[pointIndex];
            return point.metadata[this.selectedMetadataField].toString();
        };
        InspectorPanel.prototype.updateNeighborsList = function (neighbors) {
            var _this = this;
            var nnlist = this.querySelector('.nn-list');
            nnlist.innerHTML = '';
            if (neighbors.length === 0) {
                this.removeContext('.nn');
                return;
            }
            this.addContext('.nn');
            this.searchBox.message = '';
            var minDist = neighbors.length > 0 ? neighbors[0].dist : 0;
            var _loop_2 = function (i) {
                var neighbor = neighbors[i];
                var neighborElement = document.createElement('div');
                neighborElement.className = 'neighbor';
                var neighborElementLink = document.createElement('a');
                neighborElementLink.className = 'neighbor-link';
                neighborElementLink.title = this_2.getLabelFromIndex(neighbor.index);
                var labelValueElement = document.createElement('div');
                labelValueElement.className = 'label-and-value';
                var labelElement = document.createElement('div');
                labelElement.className = 'label';
                labelElement.style.color =
                    vz_projector.dist2color(this_2.distFunc, neighbor.dist, minDist);
                labelElement.innerText = this_2.getLabelFromIndex(neighbor.index);
                var valueElement = document.createElement('div');
                valueElement.className = 'value';
                valueElement.innerText = neighbor.dist.toFixed(3);
                labelValueElement.appendChild(labelElement);
                labelValueElement.appendChild(valueElement);
                var barElement = document.createElement('div');
                barElement.className = 'bar';
                var barFillElement = document.createElement('div');
                barFillElement.className = 'fill';
                barFillElement.style.borderTopColor =
                    vz_projector.dist2color(this_2.distFunc, neighbor.dist, minDist);
                barFillElement.style.width =
                    vz_projector.normalizeDist(this_2.distFunc, neighbor.dist, minDist) * 100 +
                        '%';
                barElement.appendChild(barFillElement);
                for (var j = 1; j < 4; j++) {
                    var tickElement = document.createElement('div');
                    tickElement.className = 'tick';
                    tickElement.style.left = j * 100 / 4 + '%';
                    barElement.appendChild(tickElement);
                }
                neighborElementLink.appendChild(labelValueElement);
                neighborElementLink.appendChild(barElement);
                neighborElement.appendChild(neighborElementLink);
                nnlist.appendChild(neighborElement);
                neighborElementLink.onmouseenter = function () {
                    _this.projectorEventContext.notifyHoverOverPoint(neighbor.index);
                };
                neighborElementLink.onmouseleave = function () {
                    _this.projectorEventContext.notifyHoverOverPoint(null);
                };
                neighborElementLink.onclick = function () {
                    _this.projectorEventContext.notifySelectionChanged([neighbor.index]);
                };
            };
            var this_2 = this;
            for (var i = 0; i < neighbors.length; i++) {
                _loop_2(i);
            }
        };
        InspectorPanel.prototype.updateFilterButtons = function (numPoints) {
            if (numPoints > 1) {
                this.setFilterButton.innerText = "Isolate " + numPoints + " points";
                this.setFilterButton.disabled = null;
                this.clearSelectionButton.disabled = null;
            }
            else {
                this.setFilterButton.disabled = true;
                this.clearSelectionButton.disabled = true;
            }
        };
        InspectorPanel.prototype.setupUI = function (projector) {
            var _this = this;
            this.distFunc = vz_projector.vector.cosDist;
            var eucDist = this.querySelector('.distance a.euclidean');
            eucDist.onclick = function () {
                var links = _this.querySelectorAll('.distance a');
                for (var i = 0; i < links.length; i++) {
                    vz_projector.util.classed(links[i], 'selected', false);
                }
                vz_projector.util.classed(eucDist, 'selected', true);
                _this.distFunc = vz_projector.vector.dist;
                _this.projectorEventContext.notifyDistanceMetricChanged(_this.distFunc);
                var neighbors = projector.dataSet.findNeighbors(_this.selectedPointIndices[0], _this.distFunc, _this.numNN);
                _this.updateNeighborsList(neighbors);
            };
            var cosDist = this.querySelector('.distance a.cosine');
            cosDist.onclick = function () {
                var links = _this.querySelectorAll('.distance a');
                for (var i = 0; i < links.length; i++) {
                    vz_projector.util.classed(links[i], 'selected', false);
                }
                vz_projector.util.classed(cosDist, 'selected', true);
                _this.distFunc = vz_projector.vector.cosDist;
                _this.projectorEventContext.notifyDistanceMetricChanged(_this.distFunc);
                var neighbors = projector.dataSet.findNeighbors(_this.selectedPointIndices[0], _this.distFunc, _this.numNN);
                _this.updateNeighborsList(neighbors);
            };
            // Called whenever the search text input changes.
            var updateInput = function (value, inRegexMode) {
                if (value == null || value.trim() === '') {
                    _this.searchBox.message = '';
                    _this.projectorEventContext.notifySelectionChanged([]);
                    return;
                }
                var indices = projector.dataSet.query(value, inRegexMode, _this.selectedMetadataField);
                if (indices.length === 0) {
                    _this.searchBox.message = '0 matches.';
                }
                else {
                    _this.searchBox.message = indices.length + " matches.";
                }
                _this.projectorEventContext.notifySelectionChanged(indices);
            };
            this.searchBox.registerInputChangedListener(function (value, inRegexMode) {
                updateInput(value, inRegexMode);
            });
            // Filtering dataset.
            this.setFilterButton.onclick = function () {
                var indices = _this.selectedPointIndices.concat(_this.neighborsOfFirstPoint.map(function (n) { return n.index; }));
                projector.filterDataset(indices);
                _this.enableResetFilterButton(true);
                _this.updateFilterButtons(0);
            };
            this.resetFilterButton.onclick = function () {
                projector.resetFilterDataset();
                _this.enableResetFilterButton(false);
            };
            this.clearSelectionButton.onclick = function () {
                projector.adjustSelectionAndHover([]);
            };
            this.enableResetFilterButton(false);
        };
        InspectorPanel.prototype.updateNumNN = function () {
            if (this.selectedPointIndices != null) {
                this.projectorEventContext.notifySelectionChanged([this.selectedPointIndices[0]]);
            }
        };
        ;
        return InspectorPanel;
    }(vz_projector.InspectorPanelPolymer));
    vz_projector.InspectorPanel = InspectorPanel;
    document.registerElement(InspectorPanel.prototype.is, InspectorPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
