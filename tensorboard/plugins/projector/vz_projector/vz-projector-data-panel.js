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
    vz_projector.DataPanelPolymer = vz_projector.PolymerElement({
        is: 'vz-projector-data-panel',
        properties: {
            selectedTensor: { type: String, observer: '_selectedTensorChanged' },
            selectedRun: String,
            selectedColorOptionName: {
                type: String,
                notify: true,
                observer: '_selectedColorOptionNameChanged'
            },
            selectedLabelOption: { type: String, notify: true, observer: '_selectedLabelOptionChanged' },
            normalizeData: Boolean,
            showForceCategoricalColorsCheckbox: Boolean
        },
        observers: [
            '_generateUiForNewCheckpointForRun(selectedRun)',
        ],
    });
    var DataPanel = /** @class */ (function (_super) {
        __extends(DataPanel, _super);
        function DataPanel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.forceCategoricalColoring = false;
            return _this;
        }
        DataPanel.prototype.ready = function () {
            this.normalizeData = true;
        };
        DataPanel.prototype.initialize = function (projector, dp) {
            var _this = this;
            this.projector = projector;
            this.dataProvider = dp;
            this.setupUploadButtons();
            // Tell the projector whenever the data normalization changes.
            // Unknown why, but the polymer checkbox button stops working as soon as
            // you do d3.select() on it.
            this.querySelector('#normalize-data-checkbox')
                .addEventListener('change', function () {
                _this.projector.setNormalizeData(_this.normalizeData);
            });
            var forceCategoricalColoringCheckbox = this.querySelector('#force-categorical-checkbox');
            forceCategoricalColoringCheckbox.addEventListener('change', function () {
                _this.setForceCategoricalColoring(forceCategoricalColoringCheckbox.checked);
            });
            // Get all the runs.
            this.dataProvider.retrieveRuns(function (runs) {
                _this.runNames = runs;
                // Choose the first run by default.
                if (_this.runNames.length > 0) {
                    if (_this.selectedRun != runs[0]) {
                        // This set operation will automatically trigger the observer.
                        _this.selectedRun = runs[0];
                    }
                    else {
                        // Explicitly load the projector config. We explicitly load because
                        // the run name stays the same, which means that the observer won't
                        // actually be triggered by setting the selected run.
                        _this._generateUiForNewCheckpointForRun(_this.selectedRun);
                    }
                }
            });
        };
        DataPanel.prototype.setForceCategoricalColoring = function (forceCategoricalColoring) {
            this.forceCategoricalColoring = forceCategoricalColoring;
            this.querySelector('#force-categorical-checkbox')
                .checked = this.forceCategoricalColoring;
            this.updateMetadataUI(this.spriteAndMetadata.stats, this.metadataFile);
            // The selected color option name doesn't change when we switch to using
            // categorical coloring for stats with too many unique values, so we
            // manually call this polymer observer so that we update the UI.
            this._selectedColorOptionNameChanged();
        };
        DataPanel.prototype.getSeparatorClass = function (isSeparator) {
            return isSeparator ? 'separator' : null;
        };
        DataPanel.prototype.metadataChanged = function (spriteAndMetadata, metadataFile) {
            this.spriteAndMetadata = spriteAndMetadata;
            this.metadataFile = metadataFile;
            this.updateMetadataUI(this.spriteAndMetadata.stats, this.metadataFile);
            this.selectedColorOptionName = this.colorOptions[0].name;
        };
        DataPanel.prototype.addWordBreaks = function (longString) {
            if (longString == null) {
                return '';
            }
            return longString.replace(/([\/=-_,])/g, '$1<wbr>');
        };
        DataPanel.prototype.updateMetadataUI = function (columnStats, metadataFile) {
            var _this = this;
            var metadataFileElement = this.querySelector('#metadata-file');
            metadataFileElement.innerHTML = this.addWordBreaks(metadataFile);
            metadataFileElement.title = metadataFile;
            // Label by options.
            var labelIndex = -1;
            this.labelOptions = columnStats.map(function (stats, i) {
                // Make the default label by the first non-numeric column.
                if (!stats.isNumeric && labelIndex === -1) {
                    labelIndex = i;
                }
                return stats.name;
            });
            this.selectedLabelOption = this.labelOptions[Math.max(0, labelIndex)];
            // Color by options.
            var standardColorOption = [
                { name: 'No color map' },
            ];
            var metadataColorOption = columnStats
                .filter(function (stats) {
                return !stats.tooManyUniqueValues || stats.isNumeric;
            })
                .map(function (stats) {
                var map;
                var items;
                var thresholds;
                var isCategorical = _this.forceCategoricalColoring || !stats.tooManyUniqueValues;
                if (isCategorical) {
                    var scale = d3.scaleOrdinal(d3.schemeCategory20);
                    var range_1 = scale.range();
                    // Re-order the range.
                    var newRange = range_1.map(function (color, i) {
                        var index = (i * 3) % range_1.length;
                        return range_1[index];
                    });
                    items = stats.uniqueEntries;
                    scale.range(newRange).domain(items.map(function (x) { return x.label; }));
                    map = scale;
                }
                else {
                    thresholds = [
                        { color: '#ffffdd', value: stats.min },
                        { color: '#1f2d86', value: stats.max }
                    ];
                    map = d3.scaleLinear()
                        .domain(thresholds.map(function (t) { return t.value; }))
                        .range(thresholds.map(function (t) { return t.color; }));
                }
                var desc = !isCategorical ? 'gradient' :
                    stats.uniqueEntries.length +
                        ((stats.uniqueEntries.length > 20) ? ' non-unique' : '') +
                        ' colors';
                return {
                    name: stats.name,
                    desc: desc,
                    map: map,
                    items: items,
                    thresholds: thresholds,
                    tooManyUniqueValues: stats.tooManyUniqueValues
                };
            });
            if (metadataColorOption.length > 0) {
                // Add a separator line between built-in color maps
                // and those based on metadata columns.
                standardColorOption.push({ name: 'Metadata', isSeparator: true });
            }
            this.colorOptions = standardColorOption.concat(metadataColorOption);
        };
        DataPanel.prototype.setNormalizeData = function (normalizeData) {
            this.normalizeData = normalizeData;
        };
        DataPanel.prototype._selectedTensorChanged = function () {
            var _this = this;
            this.projector.updateDataSet(null, null, null);
            if (this.selectedTensor == null) {
                return;
            }
            this.dataProvider.retrieveTensor(this.selectedRun, this.selectedTensor, function (ds) {
                var metadataFile = _this.getEmbeddingInfoByName(_this.selectedTensor).metadataPath;
                _this.dataProvider.retrieveSpriteAndMetadata(_this.selectedRun, _this.selectedTensor, function (metadata) {
                    _this.projector.updateDataSet(ds, metadata, metadataFile);
                });
            });
            this.projector.setSelectedTensor(this.selectedRun, this.getEmbeddingInfoByName(this.selectedTensor));
        };
        DataPanel.prototype._generateUiForNewCheckpointForRun = function (selectedRun) {
            var _this = this;
            this.dataProvider.retrieveProjectorConfig(selectedRun, function (info) {
                _this.projectorConfig = info;
                var names = _this.projectorConfig.embeddings.map(function (e) { return e.tensorName; })
                    .filter(function (name) {
                    var shape = _this.getEmbeddingInfoByName(name).tensorShape;
                    return shape.length === 2 && shape[0] > 1 && shape[1] > 1;
                })
                    .sort(function (a, b) {
                    var embA = _this.getEmbeddingInfoByName(a);
                    var embB = _this.getEmbeddingInfoByName(b);
                    // Prefer tensors with metadata.
                    if (vz_projector.util.xor(!!embA.metadataPath, !!embB.metadataPath)) {
                        return embA.metadataPath ? -1 : 1;
                    }
                    // Prefer non-generated tensors.
                    var isGenA = vz_projector.util.tensorIsGenerated(a);
                    var isGenB = vz_projector.util.tensorIsGenerated(b);
                    if (vz_projector.util.xor(isGenA, isGenB)) {
                        return isGenB ? -1 : 1;
                    }
                    // Prefer bigger tensors.
                    var sizeA = embA.tensorShape[0];
                    var sizeB = embB.tensorShape[0];
                    if (sizeA !== sizeB) {
                        return sizeB - sizeA;
                    }
                    // Sort alphabetically by tensor name.
                    return a <= b ? -1 : 1;
                });
                _this.tensorNames = names.map(function (name) {
                    return { name: name, shape: _this.getEmbeddingInfoByName(name).tensorShape };
                });
                var wordBreakablePath = _this.addWordBreaks(_this.projectorConfig.modelCheckpointPath);
                var checkpointFile = _this.querySelector('#checkpoint-file');
                checkpointFile.innerHTML = wordBreakablePath;
                checkpointFile.title = _this.projectorConfig.modelCheckpointPath;
                // If in demo mode, let the order decide which tensor to load by default.
                var defaultTensor = _this.projector.servingMode === 'demo' ?
                    _this.projectorConfig.embeddings[0].tensorName :
                    names[0];
                if (_this.selectedTensor === defaultTensor) {
                    // Explicitly call the observer. Polymer won't call it if the previous
                    // string matches the current string.
                    _this._selectedTensorChanged();
                }
                else {
                    _this.selectedTensor = defaultTensor;
                }
            });
        };
        DataPanel.prototype._selectedLabelOptionChanged = function () {
            this.projector.setSelectedLabelOption(this.selectedLabelOption);
        };
        DataPanel.prototype._selectedColorOptionNameChanged = function () {
            var colorOption;
            for (var i = 0; i < this.colorOptions.length; i++) {
                if (this.colorOptions[i].name === this.selectedColorOptionName) {
                    colorOption = this.colorOptions[i];
                    break;
                }
            }
            if (!colorOption) {
                return;
            }
            this.showForceCategoricalColorsCheckbox = !!colorOption.tooManyUniqueValues;
            if (colorOption.map == null) {
                this.colorLegendRenderInfo = null;
            }
            else if (colorOption.items) {
                var items = colorOption.items.map(function (item) {
                    return {
                        color: colorOption.map(item.label),
                        label: item.label,
                        count: item.count
                    };
                });
                this.colorLegendRenderInfo = { items: items, thresholds: null };
            }
            else {
                this.colorLegendRenderInfo = {
                    items: null,
                    thresholds: colorOption.thresholds
                };
            }
            this.projector.setSelectedColorOption(colorOption);
        };
        DataPanel.prototype.tensorWasReadFromFile = function (rawContents, fileName) {
            var _this = this;
            vz_projector.parseRawTensors(rawContents, function (ds) {
                var checkpointFile = _this.querySelector('#checkpoint-file');
                checkpointFile.innerText = fileName;
                checkpointFile.title = fileName;
                _this.projector.updateDataSet(ds);
            });
        };
        DataPanel.prototype.metadataWasReadFromFile = function (rawContents, fileName) {
            var _this = this;
            vz_projector.parseRawMetadata(rawContents, function (metadata) {
                _this.projector.updateDataSet(_this.projector.dataSet, metadata, fileName);
            });
        };
        DataPanel.prototype.getEmbeddingInfoByName = function (tensorName) {
            for (var i = 0; i < this.projectorConfig.embeddings.length; i++) {
                var e = this.projectorConfig.embeddings[i];
                if (e.tensorName === tensorName) {
                    return e;
                }
            }
        };
        DataPanel.prototype.setupUploadButtons = function () {
            var _this = this;
            // Show and setup the upload button.
            var fileInput = this.querySelector('#file');
            fileInput.onchange = function () {
                var file = fileInput.files[0];
                // Clear out the value of the file chooser. This ensures that if the user
                // selects the same file, we'll re-read it.
                fileInput.value = '';
                var fileReader = new FileReader();
                fileReader.onload = function (evt) {
                    var content = fileReader.result;
                    _this.tensorWasReadFromFile(content, file.name);
                };
                fileReader.readAsArrayBuffer(file);
            };
            var uploadButton = this.querySelector('#upload-tensors');
            uploadButton.onclick = function () {
                fileInput.click();
            };
            // Show and setup the upload metadata button.
            var fileMetadataInput = this.querySelector('#file-metadata');
            fileMetadataInput.onchange = function () {
                var file = fileMetadataInput.files[0];
                // Clear out the value of the file chooser. This ensures that if the user
                // selects the same file, we'll re-read it.
                fileMetadataInput.value = '';
                var fileReader = new FileReader();
                fileReader.onload = function (evt) {
                    var contents = fileReader.result;
                    _this.metadataWasReadFromFile(contents, file.name);
                };
                fileReader.readAsArrayBuffer(file);
            };
            var uploadMetadataButton = this.querySelector('#upload-metadata');
            uploadMetadataButton.onclick = function () {
                fileMetadataInput.click();
            };
            if (this.projector.servingMode !== 'demo') {
                this.$$('#publish-container').style.display = 'none';
                this.$$('#upload-tensors-step-container').style.display =
                    'none';
                this.$$('#upload-metadata-label').style.display = 'none';
            }
            this.$$('#demo-data-buttons-container').style.display =
                'block';
            // Fill out the projector config.
            var projectorConfigTemplate = this.$$('#projector-config-template');
            var projectorConfigTemplateJson = {
                embeddings: [{
                        tensorName: 'My tensor',
                        tensorShape: [1000, 50],
                        tensorPath: 'https://raw.githubusercontent.com/.../tensors.tsv',
                        metadataPath: 'https://raw.githubusercontent.com/.../optional.metadata.tsv',
                    }],
            };
            this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            // Set up optional field checkboxes.
            var spriteFieldCheckbox = this.$$('#config-sprite-checkbox');
            spriteFieldCheckbox.onchange = function () {
                if (spriteFieldCheckbox.checked) {
                    projectorConfigTemplateJson.embeddings[0].sprite = {
                        imagePath: 'https://github.com/.../optional.sprite.png',
                        singleImageDim: [32, 32]
                    };
                }
                else {
                    delete projectorConfigTemplateJson.embeddings[0].sprite;
                }
                _this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            };
            var bookmarksFieldCheckbox = this.$$('#config-bookmarks-checkbox');
            bookmarksFieldCheckbox.onchange = function () {
                if (bookmarksFieldCheckbox.checked) {
                    projectorConfigTemplateJson.embeddings[0].bookmarksPath =
                        'https://raw.githubusercontent.com/.../bookmarks.txt';
                }
                else {
                    delete projectorConfigTemplateJson.embeddings[0].bookmarksPath;
                }
                _this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            };
            var metadataFieldCheckbox = this.$$('#config-metadata-checkbox');
            metadataFieldCheckbox.onchange = function () {
                if (metadataFieldCheckbox.checked) {
                    projectorConfigTemplateJson.embeddings[0].metadataPath =
                        'https://raw.githubusercontent.com/.../optional.metadata.tsv';
                }
                else {
                    delete projectorConfigTemplateJson.embeddings[0].metadataPath;
                }
                _this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            };
            // Update the link and the readonly shareable URL.
            var projectorConfigUrlInput = this.$$('#projector-config-url');
            var projectorConfigDemoUrlInput = this.$$('#projector-share-url');
            var projectorConfigDemoUrlLink = this.$$('#projector-share-url-link');
            projectorConfigUrlInput.onchange = function () {
                var projectorDemoUrl = location.protocol + '//' + location.host +
                    location.pathname +
                    '?config=' + projectorConfigUrlInput.value;
                projectorConfigDemoUrlInput.value =
                    projectorDemoUrl;
                projectorConfigDemoUrlLink.href = projectorDemoUrl;
            };
        };
        DataPanel.prototype.setProjectorConfigTemplateJson = function (projectorConfigTemplate, config) {
            projectorConfigTemplate.value =
                JSON.stringify(config, null, /** replacer */ 2 /** white space */);
        };
        DataPanel.prototype._getNumTensorsLabel = function () {
            return this.tensorNames.length === 1 ? '1 tensor' :
                this.tensorNames.length + ' tensors';
        };
        DataPanel.prototype._getNumRunsLabel = function () {
            return this.runNames.length === 1 ? '1 run' :
                this.runNames.length + ' runs';
        };
        DataPanel.prototype._hasChoices = function (choices) {
            return choices.length > 1;
        };
        return DataPanel;
    }(vz_projector.DataPanelPolymer));
    vz_projector.DataPanel = DataPanel;
    document.registerElement(DataPanel.prototype.is, DataPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
