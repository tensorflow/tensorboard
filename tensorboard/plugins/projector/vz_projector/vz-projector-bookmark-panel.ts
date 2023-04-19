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
import {customElement, property} from '@polymer/decorators';
import {PolymerElement} from '@polymer/polymer';
import '../../../components/polymer/irons_and_papers';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {State} from './data';
import {DataProvider, EmbeddingInfo} from './data-provider';
import * as logging from './logging';
import {ProjectorEventContext} from './projectorEventContext';
import {template} from './vz-projector-bookmark-panel.html';

@customElement('vz-projector-bookmark-panel')
class BookmarkPanel extends LegacyElementMixin(PolymerElement) {
  static readonly template = template;

  @property({type: Object})
  savedStates: Array<any>;
  // Keep a separate polymer property because the savedStates doesn't change
  // when adding and removing states.
  @property({type: Boolean})
  hasStates: boolean = false;
  @property({type: Number})
  selectedState: number;

  private projector: any;
  private ignoreNextProjectionEvent: boolean;
  private expandLessButton: HTMLButtonElement;
  private expandMoreButton: HTMLButtonElement;

  ready() {
    super.ready();
    this.savedStates = [];
    this.setupUploadButton();
    this.ignoreNextProjectionEvent = false;
    this.expandLessButton = this.$$('#expand-less') as HTMLButtonElement;
    this.expandMoreButton = this.$$('#expand-more') as HTMLButtonElement;
  }
  initialize(projector: any, projectorEventContext: ProjectorEventContext) {
    this.projector = projector;
    projectorEventContext.registerProjectionChangedListener(() => {
      if (this.ignoreNextProjectionEvent) {
        this.ignoreNextProjectionEvent = false;
      } else {
        this.clearStateSelection();
      }
    });
  }
  setSelectedTensor(
    run: string,
    tensorInfo: EmbeddingInfo,
    dataProvider: DataProvider
  ) {
    // Clear any existing bookmarks.
    this.addStates();
    if (tensorInfo && tensorInfo.bookmarksPath) {
      // Get any bookmarks that may come when the projector starts up.
      dataProvider.getBookmarks(run, tensorInfo.tensorName, (bookmarks) => {
        this.addStates(bookmarks);
        this._expandMore();
      });
    } else {
      this._expandLess();
    }
  }
  /** Handles a click on show bookmarks tray button. */
  _expandMore() {
    (this.$.panel as any).show();
    this.expandMoreButton.style.display = 'none';
    this.expandLessButton.style.display = '';
  }
  /** Handles a click on hide bookmarks tray button. */
  _expandLess() {
    (this.$.panel as any).hide();
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
      this.notifyPath('savedStates.' + i + '.isSelected', false);
    }
    this.push('savedStates', currentState as any);
    this.updateHasStates();
  }
  /** Handles a click on the download bookmarks button. */
  _downloadFile() {
    let serializedState = this.serializeAllSavedStates();
    let blob = new Blob([serializedState], {type: 'text/plain'});
    // TODO(b/162788443): Undo conformance workaround.
    let textFile = window.URL['createObjectURL'](blob);
    // Force a download.
    let a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    // TODO(b/162788443): Undo conformance workaround.
    Object.assign(a, {href: textFile});
    (a as any).download = 'state';
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(textFile);
  }
  /** Handles a click on the upload bookmarks button. */
  _uploadFile() {
    let fileInput = this.$$('#state-file');
    (fileInput as HTMLInputElement).click();
  }
  private setupUploadButton() {
    // Show and setup the load view button.
    const fileInput = this.$$('#state-file') as HTMLInputElement;
    fileInput.onchange = () => {
      const file: File = fileInput.files?.[0]!;
      // Clear out the value of the file chooser. This ensures that if the user
      // selects the same file, we'll re-read it.
      fileInput.value = '';
      const fileReader = new FileReader();
      fileReader.onload = (evt) => {
        const str: string = fileReader.result as string;
        const savedStates = JSON.parse(str) as State[];
        // Verify the bookmarks match.
        if (this.savedStatesValid(savedStates)) {
          this.addStates(savedStates);
          this.loadSavedState(0);
        } else {
          logging.setWarningMessage(
            `Unable to load bookmarks: wrong dataset, expected dataset ` +
              `with shape (${savedStates[0].dataSetDimensions}).`
          );
        }
      };
      fileReader.readAsText(file);
    };
  }
  addStates(savedStates?: State[]) {
    if (savedStates == null) {
      this.savedStates = [];
    } else {
      for (let i = 0; i < savedStates.length; i++) {
        savedStates[i].isSelected = false;
        this.push('savedStates', savedStates[i] as any);
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
  _radioButtonHandler(evt: Event) {
    const index = this.getBookmarkIndex(evt);
    this.loadSavedState(index);
    this.setSelectionState(index, true);
  }
  loadSavedState(index: number) {
    for (let i = 0; i < this.savedStates.length; i++) {
      if (this.savedStates[i].isSelected) {
        this.setSelectionState(i, false);
      } else if (index === i) {
        this.setSelectionState(i, true);
        this.ignoreNextProjectionEvent = true;
        this.projector.loadState(this.savedStates[i]);
      }
    }
  }
  private setSelectionState(stateIndex: number, selected: boolean) {
    this.savedStates[stateIndex].isSelected = selected;
    const path = 'savedStates.' + stateIndex + '.isSelected';
    this.notifyPath(path, selected);
  }
  /**
   * Returns the bookmark index of the event.
   */
  private getBookmarkIndex(evt: any) {
    return evt.model.__data.index;
  }
  /** Handles a clear button click on a bookmark. */
  _clearButtonHandler(evt: Event) {
    let index = this.getBookmarkIndex(evt);
    this.splice('savedStates', index, 1);
    this.updateHasStates();
  }
  /** Handles a label change event on a bookmark. */
  _labelChange(evt: Event) {
    let index = this.getBookmarkIndex(evt);
    this.savedStates[index].label = (evt.target as any).value;
  }
  /**
   * Used to determine whether to select the radio button for a given bookmark.
   */
  _isSelectedState(index: number) {
    return index === this.selectedState;
  }
  _isNotSelectedState(index: number) {
    return index !== this.selectedState;
  }
  /**
   * Gets all of the saved states as a serialized string.
   */
  serializeAllSavedStates(): string {
    return JSON.stringify(this.savedStates);
  }
  /**
   * Loads all of the serialized states and shows them in the list of
   * viewable states.
   */
  loadSavedStates(serializedStates: string) {
    this.savedStates = JSON.parse(serializedStates) as State[];
    this.updateHasStates();
  }
  /**
   * Updates the hasState polymer property.
   */
  private updateHasStates() {
    this.hasStates = this.savedStates.length !== 0;
  }
  /** Sanity checks a State array to ensure it matches the current dataset. */
  private savedStatesValid(states: State[]): boolean {
    for (let i = 0; i < states.length; i++) {
      if (
        states[i].dataSetDimensions[0] !== this.projector.dataSet.dim[0] ||
        states[i].dataSetDimensions[1] !== this.projector.dataSet.dim[1]
      ) {
        return false;
      }
    }
    return true;
  }
}
