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
    var BookmarkPanel = /** @class */ (function (_super) {
        __extends(BookmarkPanel, _super);
        function BookmarkPanel() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.hasStates = false;
            return _this;
        }
        BookmarkPanel.prototype.ready = function () {
            this.savedStates = [];
            this.setupUploadButton();
            this.ignoreNextProjectionEvent = false;
            this.expandLessButton =
                this.querySelector('#expand-less');
            this.expandMoreButton =
                this.querySelector('#expand-more');
        };
        BookmarkPanel.prototype.initialize = function (projector, projectorEventContext) {
            var _this = this;
            this.projector = projector;
            projectorEventContext.registerProjectionChangedListener(function () {
                if (_this.ignoreNextProjectionEvent) {
                    _this.ignoreNextProjectionEvent = false;
                }
                else {
                    _this.clearStateSelection();
                }
            });
        };
        BookmarkPanel.prototype.setSelectedTensor = function (run, tensorInfo, dataProvider) {
            var _this = this;
            // Clear any existing bookmarks.
            this.addStates(null);
            if (tensorInfo && tensorInfo.bookmarksPath) {
                // Get any bookmarks that may come when the projector starts up.
                dataProvider.getBookmarks(run, tensorInfo.tensorName, function (bookmarks) {
                    _this.addStates(bookmarks);
                    _this._expandMore();
                });
            }
            else {
                this._expandLess();
            }
        };
        /** Handles a click on show bookmarks tray button. */
        BookmarkPanel.prototype._expandMore = function () {
            this.$.panel.show();
            this.expandMoreButton.style.display = 'none';
            this.expandLessButton.style.display = '';
        };
        /** Handles a click on hide bookmarks tray button. */
        BookmarkPanel.prototype._expandLess = function () {
            this.$.panel.hide();
            this.expandMoreButton.style.display = '';
            this.expandLessButton.style.display = 'none';
        };
        /** Handles a click on the add bookmark button. */
        BookmarkPanel.prototype._addBookmark = function () {
            var currentState = this.projector.getCurrentState();
            currentState.label = 'State ' + this.savedStates.length;
            currentState.isSelected = true;
            this.selectedState = this.savedStates.length;
            for (var i = 0; i < this.savedStates.length; i++) {
                this.savedStates[i].isSelected = false;
                // We have to call notifyPath so that polymer knows this element was
                // updated.
                this.notifyPath('savedStates.' + i + '.isSelected', false, false);
            }
            this.push('savedStates', currentState);
            this.updateHasStates();
        };
        /** Handles a click on the download bookmarks button. */
        BookmarkPanel.prototype._downloadFile = function () {
            var serializedState = this.serializeAllSavedStates();
            var blob = new Blob([serializedState], { type: 'text/plain' });
            var textFile = window.URL.createObjectURL(blob);
            // Force a download.
            var a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = textFile;
            a.download = 'state';
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(textFile);
        };
        /** Handles a click on the upload bookmarks button. */
        BookmarkPanel.prototype._uploadFile = function () {
            var fileInput = this.querySelector('#state-file');
            fileInput.click();
        };
        BookmarkPanel.prototype.setupUploadButton = function () {
            var _this = this;
            // Show and setup the load view button.
            var fileInput = this.querySelector('#state-file');
            fileInput.onchange = function () {
                var file = fileInput.files[0];
                // Clear out the value of the file chooser. This ensures that if the user
                // selects the same file, we'll re-read it.
                fileInput.value = '';
                var fileReader = new FileReader();
                fileReader.onload = function (evt) {
                    var str = fileReader.result;
                    var savedStates = JSON.parse(str);
                    // Verify the bookmarks match.
                    if (_this.savedStatesValid(savedStates)) {
                        _this.addStates(savedStates);
                        _this.loadSavedState(0);
                    }
                    else {
                        vz_projector.logging.setWarningMessage("Unable to load bookmarks: wrong dataset, expected dataset " +
                            ("with shape (" + savedStates[0].dataSetDimensions + ")."));
                    }
                };
                fileReader.readAsText(file);
            };
        };
        BookmarkPanel.prototype.addStates = function (savedStates) {
            if (savedStates == null) {
                this.savedStates = [];
            }
            else {
                for (var i = 0; i < savedStates.length; i++) {
                    savedStates[i].isSelected = false;
                    this.push('savedStates', savedStates[i]);
                }
            }
            this.updateHasStates();
        };
        /** Deselects any selected state selection. */
        BookmarkPanel.prototype.clearStateSelection = function () {
            for (var i = 0; i < this.savedStates.length; i++) {
                this.setSelectionState(i, false);
            }
        };
        /** Handles a radio button click on a saved state. */
        BookmarkPanel.prototype._radioButtonHandler = function (evt) {
            var index = this.getParentDataIndex(evt);
            this.loadSavedState(index);
            this.setSelectionState(index, true);
        };
        BookmarkPanel.prototype.loadSavedState = function (index) {
            for (var i = 0; i < this.savedStates.length; i++) {
                if (this.savedStates[i].isSelected) {
                    this.setSelectionState(i, false);
                }
                else if (index === i) {
                    this.setSelectionState(i, true);
                    this.ignoreNextProjectionEvent = true;
                    this.projector.loadState(this.savedStates[i]);
                }
            }
        };
        BookmarkPanel.prototype.setSelectionState = function (stateIndex, selected) {
            this.savedStates[stateIndex].isSelected = selected;
            var path = 'savedStates.' + stateIndex + '.isSelected';
            this.notifyPath(path, selected, false);
        };
        /**
         * Crawls up the DOM to find an ancestor with a data-index attribute. This is
         * used to match events to their bookmark index.
         */
        BookmarkPanel.prototype.getParentDataIndex = function (evt) {
            for (var i = 0; i < evt.path.length; i++) {
                var dataIndex = evt.path[i].getAttribute('data-index');
                if (dataIndex != null) {
                    return +dataIndex;
                }
            }
            return -1;
        };
        /** Handles a clear button click on a bookmark. */
        BookmarkPanel.prototype._clearButtonHandler = function (evt) {
            var index = this.getParentDataIndex(evt);
            this.splice('savedStates', index, 1);
            this.updateHasStates();
        };
        /** Handles a label change event on a bookmark. */
        BookmarkPanel.prototype._labelChange = function (evt) {
            var index = this.getParentDataIndex(evt);
            this.savedStates[index].label = evt.target.value;
        };
        /**
         * Used to determine whether to select the radio button for a given bookmark.
         */
        BookmarkPanel.prototype._isSelectedState = function (index) {
            return index === this.selectedState;
        };
        BookmarkPanel.prototype._isNotSelectedState = function (index) {
            return index !== this.selectedState;
        };
        /**
         * Gets all of the saved states as a serialized string.
         */
        BookmarkPanel.prototype.serializeAllSavedStates = function () {
            return JSON.stringify(this.savedStates);
        };
        /**
         * Loads all of the serialized states and shows them in the list of
         * viewable states.
         */
        BookmarkPanel.prototype.loadSavedStates = function (serializedStates) {
            this.savedStates = JSON.parse(serializedStates);
            this.updateHasStates();
        };
        /**
         * Updates the hasState polymer property.
         */
        BookmarkPanel.prototype.updateHasStates = function () {
            this.hasStates = (this.savedStates.length !== 0);
        };
        /** Sanity checks a State array to ensure it matches the current dataset. */
        BookmarkPanel.prototype.savedStatesValid = function (states) {
            for (var i = 0; i < states.length; i++) {
                if (states[i].dataSetDimensions[0] !== this.projector.dataSet.dim[0] ||
                    states[i].dataSetDimensions[1] !== this.projector.dataSet.dim[1]) {
                    return false;
                }
            }
            return true;
        };
        return BookmarkPanel;
    }(vz_projector.BookmarkPanelPolymer));
    vz_projector.BookmarkPanel = BookmarkPanel;
    document.registerElement(BookmarkPanel.prototype.is, BookmarkPanel);
})(vz_projector || (vz_projector = {})); // namespace vz_projector
