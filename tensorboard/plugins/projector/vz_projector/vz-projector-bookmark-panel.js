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
    // tslint:disable-next-line
    vz_projector.BookmarkPanelPolymer = vz_projector.PolymerElement({
        is: 'vz-projector-bookmark-panel',
        properties: {
            savedStates: Object,
            // Keep a separate polymer property because the savedStates doesn't change
            // when adding and removing states.
            hasStates: { type: Boolean, value: false },
            selectedState: Number
        }
    });
    class BookmarkPanel extends vz_projector.BookmarkPanelPolymer {
        constructor() {
            super(...arguments);
            this.hasStates = false;
        }
        ready() {
            super.ready();
            this.savedStates = [];
            this.setupUploadButton();
            this.ignoreNextProjectionEvent = false;
            this.expandLessButton =
                this.$$('#expand-less');
            this.expandMoreButton =
                this.$$('#expand-more');
        }
        initialize(projector, projectorEventContext) {
            this.projector = projector;
            projectorEventContext.registerProjectionChangedListener(() => {
                if (this.ignoreNextProjectionEvent) {
                    this.ignoreNextProjectionEvent = false;
                }
                else {
                    this.clearStateSelection();
                }
            });
        }
        setSelectedTensor(run, tensorInfo, dataProvider) {
            // Clear any existing bookmarks.
            this.addStates(null);
            if (tensorInfo && tensorInfo.bookmarksPath) {
                // Get any bookmarks that may come when the projector starts up.
                dataProvider.getBookmarks(run, tensorInfo.tensorName, bookmarks => {
                    this.addStates(bookmarks);
                    this._expandMore();
                });
            }
            else {
                this._expandLess();
            }
        }
        /** Handles a click on show bookmarks tray button. */
        _expandMore() {
            this.$.panel.show();
            this.expandMoreButton.style.display = 'none';
            this.expandLessButton.style.display = '';
        }
        /** Handles a click on hide bookmarks tray button. */
        _expandLess() {
            this.$.panel.hide();
            this.expandMoreButton.style.display = '';
            this.expandLessButton.style.display = 'none';
        }
        /** Handles a click on the add bookmark button. */
        _addBookmark() {
            let currentState = this.projector.getCurrentState();
            currentState.label = 'State ' + this.savedStates.length;
            currentState.isSelected = true;
            this.selectedState = this.savedStates.length;
            for (let i = 0; i < this.savedStates.length; i++) {
                this.savedStates[i].isSelected = false;
                // We have to call notifyPath so that polymer knows this element was
                // updated.
                this.notifyPath('savedStates.' + i + '.isSelected', false, false);
            }
            this.push('savedStates', currentState);
            this.updateHasStates();
        }
        /** Handles a click on the download bookmarks button. */
        _downloadFile() {
            let serializedState = this.serializeAllSavedStates();
            let blob = new Blob([serializedState], { type: 'text/plain' });
            let textFile = window.URL.createObjectURL(blob);
            // Force a download.
            let a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = textFile;
            a.download = 'state';
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(textFile);
        }
        /** Handles a click on the upload bookmarks button. */
        _uploadFile() {
            let fileInput = this.$$('#state-file');
            fileInput.click();
        }
        setupUploadButton() {
            // Show and setup the load view button.
            const fileInput = this.$$('#state-file');
            fileInput.onchange = () => {
                const file = fileInput.files[0];
                // Clear out the value of the file chooser. This ensures that if the user
                // selects the same file, we'll re-read it.
                fileInput.value = '';
                const fileReader = new FileReader();
                fileReader.onload = (evt) => {
                    const str = fileReader.result;
                    const savedStates = JSON.parse(str);
                    // Verify the bookmarks match.
                    if (this.savedStatesValid(savedStates)) {
                        this.addStates(savedStates);
                        this.loadSavedState(0);
                    }
                    else {
                        vz_projector.logging.setWarningMessage(`Unable to load bookmarks: wrong dataset, expected dataset ` +
                            `with shape (${savedStates[0].dataSetDimensions}).`);
                    }
                };
                fileReader.readAsText(file);
            };
        }
        addStates(savedStates) {
            if (savedStates == null) {
                this.savedStates = [];
            }
            else {
                for (let i = 0; i < savedStates.length; i++) {
                    savedStates[i].isSelected = false;
                    this.push('savedStates', savedStates[i]);
                }
            }
            this.updateHasStates();
        }
        /** Deselects any selected state selection. */
        clearStateSelection() {
            for (let i = 0; i < this.savedStates.length; i++) {
                this.setSelectionState(i, false);
            }
        }
        /** Handles a radio button click on a saved state. */
        _radioButtonHandler(evt) {
            const index = this.getParentDataIndex(evt);
            this.loadSavedState(index);
            this.setSelectionState(index, true);
        }
        loadSavedState(index) {
            for (let i = 0; i < this.savedStates.length; i++) {
                if (this.savedStates[i].isSelected) {
                    this.setSelectionState(i, false);
                }
                else if (index === i) {
                    this.setSelectionState(i, true);
                    this.ignoreNextProjectionEvent = true;
                    this.projector.loadState(this.savedStates[i]);
                }
            }
        }
        setSelectionState(stateIndex, selected) {
            this.savedStates[stateIndex].isSelected = selected;
            const path = 'savedStates.' + stateIndex + '.isSelected';
            this.notifyPath(path, selected, false);
        }
        /**
         * Crawls up the DOM to find an ancestor with a data-index attribute. This is
         * used to match events to their bookmark index.
         */
        getParentDataIndex(evt) {
            for (let i = 0; i < evt.path.length; i++) {
                let dataIndex = evt.path[i].getAttribute('data-index');
                if (dataIndex != null) {
                    return +dataIndex;
                }
            }
            return -1;
        }
        /** Handles a clear button click on a bookmark. */
        _clearButtonHandler(evt) {
            let index = this.getParentDataIndex(evt);
            this.splice('savedStates', index, 1);
            this.updateHasStates();
        }
        /** Handles a label change event on a bookmark. */
        _labelChange(evt) {
            let index = this.getParentDataIndex(evt);
            this.savedStates[index].label = evt.target.value;
        }
        /**
         * Used to determine whether to select the radio button for a given bookmark.
         */
        _isSelectedState(index) {
            return index === this.selectedState;
        }
        _isNotSelectedState(index) {
            return index !== this.selectedState;
        }
        /**
         * Gets all of the saved states as a serialized string.
         */
        serializeAllSavedStates() {
            return JSON.stringify(this.savedStates);
        }
        /**
         * Loads all of the serialized states and shows them in the list of
         * viewable states.
         */
        loadSavedStates(serializedStates) {
            this.savedStates = JSON.parse(serializedStates);
            this.updateHasStates();
        }
        /**
         * Updates the hasState polymer property.
         */
        updateHasStates() {
            this.hasStates = (this.savedStates.length !== 0);
        }
        /** Sanity checks a State array to ensure it matches the current dataset. */
        savedStatesValid(states) {
            for (let i = 0; i < states.length; i++) {
                if (states[i].dataSetDimensions[0] !== this.projector.dataSet.dim[0] ||
                    states[i].dataSetDimensions[1] !== this.projector.dataSet.dim[1]) {
                    return false;
                }
            }
            return true;
        }
    }
    vz_projector.BookmarkPanel = BookmarkPanel;
    customElements.define(BookmarkPanel.prototype.is, BookmarkPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
