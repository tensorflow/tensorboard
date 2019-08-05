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
                observer: '_selectedColorOptionNameChanged',
            },
            selectedLabelOption: {
                type: String,
                notify: true,
                observer: '_selectedLabelOptionChanged',
            },
            normalizeData: Boolean,
            showForceCategoricalColorsCheckbox: Boolean,
            metadataEditorInput: { type: String },
            metadataEditorInputLabel: { type: String, value: 'Tag selection as' },
            metadataEditorInputChange: { type: Object },
            metadataEditorColumn: { type: String },
            metadataEditorColumnChange: { type: Object },
            metadataEditorButtonClicked: { type: Object },
            metadataEditorButtonDisabled: { type: Boolean },
            downloadMetadataClicked: { type: Boolean },
            superviseInput: { type: String },
            superviseInputTyping: { type: Object },
            superviseInputChange: { type: Object },
            superviseInputLabel: { type: String, value: 'Ignored label' },
            superviseColumn: { type: String },
            superviseColumnChanged: { type: Object },
            showSuperviseSettings: { type: Boolean, value: false },
        },
        observers: ['_generateUiForNewCheckpointForRun(selectedRun)'],
    });
    class DataPanel extends vz_projector.DataPanelPolymer {
        constructor() {
            super(...arguments);
            this.forceCategoricalColoring = false;
        }
        ready() {
            super.ready();
            this.normalizeData = true;
            this.superviseInputSelected = '';
        }
        initialize(projector, dp) {
            this.projector = projector;
            this.dataProvider = dp;
            this.setupUploadButtons();
            // Tell the projector whenever the data normalization changes.
            // Unknown why, but the polymer checkbox button stops working as soon as
            // you do d3.select() on it.
            this.$$('#normalize-data-checkbox').addEventListener('change', () => {
                this.projector.setNormalizeData(this.normalizeData);
            });
            let forceCategoricalColoringCheckbox = this.$$('#force-categorical-checkbox');
            forceCategoricalColoringCheckbox.addEventListener('change', () => {
                this.setForceCategoricalColoring(forceCategoricalColoringCheckbox.checked);
            });
            // Get all the runs.
            this.dataProvider.retrieveRuns((runs) => {
                this.runNames = runs;
                // Choose the first run by default.
                if (this.runNames.length > 0) {
                    if (this.selectedRun != runs[0]) {
                        // This set operation will automatically trigger the observer.
                        this.selectedRun = runs[0];
                    }
                    else {
                        // Explicitly load the projector config. We explicitly load because
                        // the run name stays the same, which means that the observer won't
                        // actually be triggered by setting the selected run.
                        this._generateUiForNewCheckpointForRun(this.selectedRun);
                    }
                }
            });
        }
        setForceCategoricalColoring(forceCategoricalColoring) {
            this.forceCategoricalColoring = forceCategoricalColoring;
            this.$$('#force-categorical-checkbox').checked = this.forceCategoricalColoring;
            this.updateMetadataUI(this.spriteAndMetadata.stats, this.metadataFile);
            // The selected color option name doesn't change when we switch to using
            // categorical coloring for stats with too many unique values, so we
            // manually call this polymer observer so that we update the UI.
            this._selectedColorOptionNameChanged();
        }
        getSeparatorClass(isSeparator) {
            return isSeparator ? 'separator' : null;
        }
        metadataChanged(spriteAndMetadata, metadataFile) {
            this.spriteAndMetadata = spriteAndMetadata;
            if (metadataFile != null) {
                this.metadataFile = metadataFile;
            }
            this.updateMetadataUI(this.spriteAndMetadata.stats, this.metadataFile);
            if (this.selectedColorOptionName == null ||
                this.colorOptions.filter((c) => c.name === this.selectedColorOptionName)
                    .length === 0) {
                this.selectedColorOptionName = this.colorOptions[0].name;
            }
            let labelIndex = -1;
            this.metadataFields = spriteAndMetadata.stats.map((stats, i) => {
                if (!stats.isNumeric && labelIndex === -1) {
                    labelIndex = i;
                }
                return stats.name;
            });
            if (this.metadataEditorColumn == null ||
                this.metadataFields.filter((name) => name === this.metadataEditorColumn)
                    .length === 0) {
                // Make the default label the first non-numeric column.
                this.metadataEditorColumn = this.metadataFields[Math.max(0, labelIndex)];
            }
            if (this.superviseColumn == null ||
                this.metadataFields.filter((name) => name === this.superviseColumn)
                    .length === 0) {
                // Make the default supervise class the first non-numeric column.
                this.superviseColumn = this.metadataFields[Math.max(0, labelIndex)];
                this.superviseInput = '';
            }
            this.superviseInputChange();
        }
        projectionChanged(projection) {
            if (projection) {
                switch (projection.projectionType) {
                    case 'tsne':
                        this.set('showSuperviseSettings', true);
                        break;
                    default:
                        this.set('showSuperviseSettings', false);
                }
            }
        }
        onProjectorSelectionChanged(selectedPointIndices, neighborsOfFirstPoint) {
            this.selectedPointIndices = selectedPointIndices;
            this.neighborsOfFirstPoint = neighborsOfFirstPoint;
            this.metadataEditorInputChange();
        }
        addWordBreaks(longString) {
            if (longString == null) {
                return '';
            }
            return longString.replace(/([\/=-_,])/g, '$1<wbr>');
        }
        updateMetadataUI(columnStats, metadataFile) {
            const metadataFileElement = this.$$('#metadata-file');
            metadataFileElement.innerHTML = this.addWordBreaks(metadataFile);
            metadataFileElement.title = metadataFile;
            // Label by options.
            let labelIndex = -1;
            this.labelOptions = columnStats.map((stats, i) => {
                // Make the default label by the first non-numeric column.
                if (!stats.isNumeric && labelIndex === -1) {
                    labelIndex = i;
                }
                return stats.name;
            });
            if (this.selectedLabelOption == null ||
                this.labelOptions.filter((name) => name === this.selectedLabelOption)
                    .length === 0) {
                this.selectedLabelOption = this.labelOptions[Math.max(0, labelIndex)];
            }
            if (this.metadataEditorColumn == null ||
                this.labelOptions.filter((name) => name === this.metadataEditorColumn)
                    .length === 0) {
                this.metadataEditorColumn = this.labelOptions[Math.max(0, labelIndex)];
            }
            // Color by options.
            const standardColorOption = [
                { name: 'No color map' },
            ];
            const metadataColorOption = columnStats
                .filter((stats) => {
                return !stats.tooManyUniqueValues || stats.isNumeric;
            })
                .map((stats) => {
                let map;
                let items;
                let thresholds;
                let isCategorical = this.forceCategoricalColoring || !stats.tooManyUniqueValues;
                let desc;
                if (isCategorical) {
                    const scale = d3.scaleOrdinal(d3.schemeCategory10);
                    let range = scale.range();
                    // Re-order the range.
                    let newRange = range.map((color, i) => {
                        let index = (i * 3) % range.length;
                        return range[index];
                    });
                    items = stats.uniqueEntries;
                    scale.range(newRange).domain(items.map((x) => x.label));
                    map = scale;
                    const len = stats.uniqueEntries.length;
                    desc =
                        `${len} ${len > range.length ? ' non-unique' : ''} ` + `colors`;
                }
                else {
                    thresholds = [
                        { color: '#ffffdd', value: stats.min },
                        { color: '#1f2d86', value: stats.max },
                    ];
                    map = d3
                        .scaleLinear()
                        .domain(thresholds.map((t) => t.value))
                        .range(thresholds.map((t) => t.color));
                    desc = 'gradient';
                }
                return {
                    name: stats.name,
                    desc: desc,
                    map: map,
                    items: items,
                    thresholds: thresholds,
                    tooManyUniqueValues: stats.tooManyUniqueValues,
                };
            });
            if (metadataColorOption.length > 0) {
                // Add a separator line between built-in color maps
                // and those based on metadata columns.
                standardColorOption.push({ name: 'Metadata', isSeparator: true });
            }
            this.colorOptions = standardColorOption.concat(metadataColorOption);
        }
        metadataEditorContext(enabled) {
            this.metadataEditorButtonDisabled = !enabled;
            if (this.projector) {
                this.projector.metadataEditorContext(enabled, this.metadataEditorColumn);
            }
        }
        metadataEditorInputChange() {
            let col = this.metadataEditorColumn;
            let value = this.metadataEditorInput;
            let selectionSize = this.selectedPointIndices.length + this.neighborsOfFirstPoint.length;
            if (selectionSize > 0) {
                if (value != null && value.trim() !== '') {
                    if (this.spriteAndMetadata.stats.filter((s) => s.name === col)[0]
                        .isNumeric &&
                        isNaN(+value)) {
                        this.metadataEditorInputLabel = `Label must be numeric`;
                        this.metadataEditorContext(false);
                    }
                    else {
                        let numMatches = this.projector.dataSet.points.filter((p) => p.metadata[col].toString() === value.trim()).length;
                        if (numMatches === 0) {
                            this.metadataEditorInputLabel = `Tag ${selectionSize} with new label`;
                        }
                        else {
                            this.metadataEditorInputLabel = `Tag ${selectionSize} points as`;
                        }
                        this.metadataEditorContext(true);
                    }
                }
                else {
                    this.metadataEditorInputLabel = 'Tag selection as';
                    this.metadataEditorContext(false);
                }
            }
            else {
                this.metadataEditorContext(false);
                if (value != null && value.trim() !== '') {
                    this.metadataEditorInputLabel = 'Select points to tag';
                }
                else {
                    this.metadataEditorInputLabel = 'Tag selection as';
                }
            }
        }
        metadataEditorInputKeydown(e) {
            // Check if 'Enter' was pressed
            if (e.keyCode === 13) {
                this.metadataEditorButtonClicked();
            }
            e.stopPropagation();
        }
        metadataEditorColumnChange() {
            this.metadataEditorInputChange();
        }
        metadataEditorButtonClicked() {
            if (!this.metadataEditorButtonDisabled) {
                let value = this.metadataEditorInput.trim();
                let selectionSize = this.selectedPointIndices.length + this.neighborsOfFirstPoint.length;
                this.projector.metadataEdit(this.metadataEditorColumn, value);
                this.projector.metadataEditorContext(true, this.metadataEditorColumn);
                this.metadataEditorInputLabel = `${selectionSize} labeled as '${value}'`;
            }
        }
        downloadMetadataClicked() {
            if (this.projector &&
                this.projector.dataSet &&
                this.projector.dataSet.spriteAndMetadataInfo) {
                let tsvFile = this.projector.dataSet.spriteAndMetadataInfo.stats
                    .map((s) => s.name)
                    .join('\t');
                this.projector.dataSet.spriteAndMetadataInfo.pointsInfo.forEach((p) => {
                    let vals = [];
                    for (const column in p) {
                        vals.push(p[column]);
                    }
                    tsvFile += '\n' + vals.join('\t');
                });
                const textBlob = new Blob([tsvFile], { type: 'text/plain' });
                this.$.downloadMetadataLink.download = 'metadata-edited.tsv';
                this.$.downloadMetadataLink.href = window.URL.createObjectURL(textBlob);
                this.$.downloadMetadataLink.click();
            }
        }
        superviseInputTyping() {
            let value = this.superviseInput.trim();
            if (value == null || value.trim() === '') {
                if (this.superviseInputSelected === '') {
                    this.superviseInputLabel = 'No ignored label';
                }
                else {
                    this.superviseInputLabel = `Supervising without '${this.superviseInputSelected}'`;
                }
                return;
            }
            if (this.projector && this.projector.dataSet) {
                let numMatches = this.projector.dataSet.points.filter((p) => p.metadata[this.superviseColumn].toString().trim() === value).length;
                if (numMatches === 0) {
                    this.superviseInputLabel = 'Label not found';
                }
                else {
                    if (this.projector.dataSet.superviseInput != value) {
                        this.superviseInputLabel = `Supervise without '${value}' [${numMatches} points]`;
                    }
                }
            }
        }
        superviseInputChange() {
            let value = this.superviseInput.trim();
            if (value == null || value.trim() === '') {
                this.superviseInputSelected = '';
                this.superviseInputLabel = 'No ignored label';
                this.setSupervision(this.superviseColumn, '');
                return;
            }
            if (this.projector && this.projector.dataSet) {
                let numMatches = this.projector.dataSet.points.filter((p) => p.metadata[this.superviseColumn].toString().trim() === value).length;
                if (numMatches === 0) {
                    this.superviseInputLabel = `Supervising without '${this.superviseInputSelected}'`;
                }
                else {
                    this.superviseInputSelected = value;
                    this.superviseInputLabel = `Supervising without '${value}' [${numMatches} points]`;
                    this.setSupervision(this.superviseColumn, value);
                }
            }
        }
        superviseColumnChanged() {
            this.superviseInput = '';
            this.superviseInputChange();
        }
        setSupervision(superviseColumn, superviseInput) {
            if (this.projector && this.projector.dataSet) {
                this.projector.dataSet.setSupervision(superviseColumn, superviseInput);
            }
        }
        setNormalizeData(normalizeData) {
            this.normalizeData = normalizeData;
        }
        _selectedTensorChanged() {
            this.projector.updateDataSet(null, null, null);
            if (this.selectedTensor == null) {
                return;
            }
            this.dataProvider.retrieveTensor(this.selectedRun, this.selectedTensor, (ds) => {
                let metadataFile = this.getEmbeddingInfoByName(this.selectedTensor)
                    .metadataPath;
                this.dataProvider.retrieveSpriteAndMetadata(this.selectedRun, this.selectedTensor, (metadata) => {
                    this.projector.updateDataSet(ds, metadata, metadataFile);
                });
            });
            this.projector.setSelectedTensor(this.selectedRun, this.getEmbeddingInfoByName(this.selectedTensor));
        }
        _generateUiForNewCheckpointForRun(selectedRun) {
            this.dataProvider.retrieveProjectorConfig(selectedRun, (info) => {
                this.projectorConfig = info;
                let names = this.projectorConfig.embeddings
                    .map((e) => e.tensorName)
                    .filter((name) => {
                    let shape = this.getEmbeddingInfoByName(name).tensorShape;
                    return shape.length === 2 && shape[0] > 1 && shape[1] > 1;
                })
                    .sort((a, b) => {
                    let embA = this.getEmbeddingInfoByName(a);
                    let embB = this.getEmbeddingInfoByName(b);
                    // Prefer tensors with metadata.
                    if (vz_projector.util.xor(!!embA.metadataPath, !!embB.metadataPath)) {
                        return embA.metadataPath ? -1 : 1;
                    }
                    // Prefer non-generated tensors.
                    let isGenA = vz_projector.util.tensorIsGenerated(a);
                    let isGenB = vz_projector.util.tensorIsGenerated(b);
                    if (vz_projector.util.xor(isGenA, isGenB)) {
                        return isGenB ? -1 : 1;
                    }
                    // Prefer bigger tensors.
                    let sizeA = embA.tensorShape[0];
                    let sizeB = embB.tensorShape[0];
                    if (sizeA !== sizeB) {
                        return sizeB - sizeA;
                    }
                    // Sort alphabetically by tensor name.
                    return a <= b ? -1 : 1;
                });
                this.tensorNames = names.map((name) => {
                    return { name, shape: this.getEmbeddingInfoByName(name).tensorShape };
                });
                const wordBreakablePath = this.addWordBreaks(this.projectorConfig.modelCheckpointPath);
                const checkpointFile = this.$$('#checkpoint-file');
                checkpointFile.innerHTML = wordBreakablePath;
                checkpointFile.title = this.projectorConfig.modelCheckpointPath;
                // If in demo mode, let the order decide which tensor to load by default.
                const defaultTensor = this.projector.servingMode === 'demo'
                    ? this.projectorConfig.embeddings[0].tensorName
                    : names[0];
                if (this.selectedTensor === defaultTensor) {
                    // Explicitly call the observer. Polymer won't call it if the previous
                    // string matches the current string.
                    this._selectedTensorChanged();
                }
                else {
                    this.selectedTensor = defaultTensor;
                }
            });
        }
        _selectedLabelOptionChanged() {
            this.projector.setSelectedLabelOption(this.selectedLabelOption);
        }
        _selectedColorOptionNameChanged() {
            let colorOption;
            for (let i = 0; i < this.colorOptions.length; i++) {
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
                let items = colorOption.items.map((item) => {
                    return {
                        color: colorOption.map(item.label),
                        label: item.label,
                        count: item.count,
                    };
                });
                this.colorLegendRenderInfo = { items, thresholds: null };
            }
            else {
                this.colorLegendRenderInfo = {
                    items: null,
                    thresholds: colorOption.thresholds,
                };
            }
            this.projector.setSelectedColorOption(colorOption);
        }
        tensorWasReadFromFile(rawContents, fileName) {
            vz_projector.parseRawTensors(rawContents, (ds) => {
                const checkpointFile = this.$$('#checkpoint-file');
                checkpointFile.innerText = fileName;
                checkpointFile.title = fileName;
                this.projector.updateDataSet(ds);
            });
        }
        metadataWasReadFromFile(rawContents, fileName) {
            vz_projector.parseRawMetadata(rawContents, (metadata) => {
                this.projector.updateDataSet(this.projector.dataSet, metadata, fileName);
            });
        }
        getEmbeddingInfoByName(tensorName) {
            for (let i = 0; i < this.projectorConfig.embeddings.length; i++) {
                const e = this.projectorConfig.embeddings[i];
                if (e.tensorName === tensorName) {
                    return e;
                }
            }
        }
        setupUploadButtons() {
            // Show and setup the upload button.
            const fileInput = this.$$('#file');
            fileInput.onchange = () => {
                const file = fileInput.files[0];
                // Clear out the value of the file chooser. This ensures that if the user
                // selects the same file, we'll re-read it.
                fileInput.value = '';
                const fileReader = new FileReader();
                fileReader.onload = (evt) => {
                    const content = fileReader.result;
                    this.tensorWasReadFromFile(content, file.name);
                };
                fileReader.readAsArrayBuffer(file);
            };
            const uploadButton = this.$$('#upload-tensors');
            uploadButton.onclick = () => {
                fileInput.click();
            };
            // Show and setup the upload metadata button.
            const fileMetadataInput = this.$$('#file-metadata');
            fileMetadataInput.onchange = () => {
                const file = fileMetadataInput.files[0];
                // Clear out the value of the file chooser. This ensures that if the user
                // selects the same file, we'll re-read it.
                fileMetadataInput.value = '';
                const fileReader = new FileReader();
                fileReader.onload = (evt) => {
                    const contents = fileReader.result;
                    this.metadataWasReadFromFile(contents, file.name);
                };
                fileReader.readAsArrayBuffer(file);
            };
            const uploadMetadataButton = this.$$('#upload-metadata');
            uploadMetadataButton.onclick = () => {
                fileMetadataInput.click();
            };
            if (this.projector.servingMode !== 'demo') {
                this.$$('#publish-container').style.display = 'none';
                this.$$('#upload-tensors-step-container').style.display = 'none';
                this.$$('#upload-metadata-label').style.display =
                    'none';
            }
            this.$$('#demo-data-buttons-container').style.display =
                'flex';
            // Fill out the projector config.
            const projectorConfigTemplate = this.$$('#projector-config-template');
            const projectorConfigTemplateJson = {
                embeddings: [
                    {
                        tensorName: 'My tensor',
                        tensorShape: [1000, 50],
                        tensorPath: 'https://raw.githubusercontent.com/.../tensors.tsv',
                        metadataPath: 'https://raw.githubusercontent.com/.../optional.metadata.tsv',
                    },
                ],
            };
            this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            // Set up optional field checkboxes.
            const spriteFieldCheckbox = this.$$('#config-sprite-checkbox');
            spriteFieldCheckbox.onchange = () => {
                if (spriteFieldCheckbox.checked) {
                    projectorConfigTemplateJson.embeddings[0].sprite = {
                        imagePath: 'https://github.com/.../optional.sprite.png',
                        singleImageDim: [32, 32],
                    };
                }
                else {
                    delete projectorConfigTemplateJson.embeddings[0].sprite;
                }
                this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            };
            const bookmarksFieldCheckbox = this.$$('#config-bookmarks-checkbox');
            bookmarksFieldCheckbox.onchange = () => {
                if (bookmarksFieldCheckbox.checked) {
                    projectorConfigTemplateJson.embeddings[0].bookmarksPath =
                        'https://raw.githubusercontent.com/.../bookmarks.txt';
                }
                else {
                    delete projectorConfigTemplateJson.embeddings[0].bookmarksPath;
                }
                this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            };
            const metadataFieldCheckbox = this.$$('#config-metadata-checkbox');
            metadataFieldCheckbox.onchange = () => {
                if (metadataFieldCheckbox.checked) {
                    projectorConfigTemplateJson.embeddings[0].metadataPath =
                        'https://raw.githubusercontent.com/.../optional.metadata.tsv';
                }
                else {
                    delete projectorConfigTemplateJson.embeddings[0].metadataPath;
                }
                this.setProjectorConfigTemplateJson(projectorConfigTemplate, projectorConfigTemplateJson);
            };
            // Update the link and the readonly shareable URL.
            const projectorConfigUrlInput = this.$$('#projector-config-url');
            const projectorConfigDemoUrlInput = this.$$('#projector-share-url');
            const projectorConfigDemoUrlLink = this.$$('#projector-share-url-link');
            projectorConfigUrlInput.onchange = () => {
                let projectorDemoUrl = location.protocol +
                    '//' +
                    location.host +
                    location.pathname +
                    '?config=' +
                    projectorConfigUrlInput.value;
                projectorConfigDemoUrlInput.value = projectorDemoUrl;
                projectorConfigDemoUrlLink.href = projectorDemoUrl;
            };
        }
        setProjectorConfigTemplateJson(projectorConfigTemplate, config) {
            projectorConfigTemplate.value = JSON.stringify(config, null, 
            /** replacer */ 2 /** white space */);
        }
        _getNumTensorsLabel() {
            return this.tensorNames.length === 1
                ? '1 tensor'
                : this.tensorNames.length + ' tensors';
        }
        _getNumRunsLabel() {
            return this.runNames.length === 1
                ? '1 run'
                : this.runNames.length + ' runs';
        }
        _hasChoice(choices) {
            return choices.length > 0;
        }
        _hasChoices(choices) {
            return choices.length > 1;
        }
        _openDataDialog() {
            this.$.dataDialog.open();
        }
        _openConfigDialog() {
            this.$.projectorConfigDialog.open();
        }
    }
    vz_projector.DataPanel = DataPanel;
    customElements.define(DataPanel.prototype.is, DataPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
