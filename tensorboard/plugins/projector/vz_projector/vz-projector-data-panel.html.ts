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

import {html} from '@polymer/polymer';
import '../../../components/tf_wbr_string/tf-wbr-string';
import './styles';

export const template = html`
  <style include="vz-projector-styles"></style>
  <style>
    .container {
      padding: 5px 20px 20px 20px;
    }

    input[type='file'] {
      display: none;
    }

    .file-name {
      margin-right: 10px;
    }

    .dirs {
      color: rgba(0, 0, 0, 0.7);
      font-size: 12px;
    }

    .dirs table tr {
      vertical-align: top;
    }

    .dirs table tr td {
      padding-bottom: 10px;
    }

    paper-item {
      --paper-item-disabled: {
        border-bottom: 1px solid black;
        justify-content: center;
        font-size: 12px;
        line-height: normal;
        min-height: 0px;
      }
    }

    .item-details {
      margin-left: 5px;
      color: gray;
      font-size: 12px;
    }

    paper-input {
      font-size: 15px;
      --paper-input-container: {
        padding: 5px 0;
      }
      --paper-input-container-label-floating: {
        white-space: normal;
        line-height: normal;
      }
    }

    paper-dropdown-menu {
      width: 100%;
      --paper-input-container: {
        padding: 5px 0;
      }
      --paper-input-container-input: {
        font-size: 15px;
      }
      --paper-input-container-label-floating: {
        white-space: normal;
        line-height: normal;
      }
    }

    paper-dropdown-menu paper-item {
      justify-content: space-between;
    }

    .title {
      align-items: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      color: black;
      display: flex;
      font-weight: 500;
      height: 59px;
      padding-left: 20px;
    }

    #normalize-data-checkbox {
      margin: 10px 0;
    }

    #projector-config-template {
      --paper-input-container-input: {
        line-height: 13px;
        font-family: monospace;
        font-size: 12px;
      }
    }

    #generate-share-url {
      padding: 16px;
      margin-left: 24px;
    }

    #projector-share-button-container {
      margin: 10px 0;
    }

    .metadata-editor,
    .colorlabel-container {
      display: flex;
    }

    #labelby {
      width: 100px;
      margin-right: 10px;
    }

    #colorby {
      width: calc(100% - 110px);
    }

    [hidden] {
      display: none;
    }

    .metadata-editor paper-dropdown-menu {
      width: 100px;
      margin-right: 10px;
    }

    .metadata-editor paper-input {
      width: calc(100% - 110px);
    }

    .config-checkbox {
      display: inline-block;
      font-size: 11px;
      margin-left: 10px;
    }

    .projector-config-options {
      margin-top: 12px;
    }

    .projector-config-dialog-container {
      padding: 24px;
    }

    .code {
      background-color: #f7f7f7;
      display: table;
      font-family: monospace;
      margin-top: 7px;
      padding: 15px;
    }

    .delimiter {
      color: #b71c1c;
    }

    .button-container {
      flex: 1 100%;
      margin-right: 5px;
    }

    .button-container paper-button {
      min-width: 50px;
      width: 100%;
    }

    #label-button {
      margin-right: 0px;
    }

    .upload-step {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .upload-step paper-button {
      margin-left: 30px;
    }

    .step-label {
      color: rgb(38, 180, 226);
    }

    .scrollable-container {
      margin-top: 0;
      min-width: 400px;
    }

    #projectorConfigDialog p {
      margin: 8px 0 8px;
    }

    .data-step {
      margin-top: 40px;
    }

    .data-step-contents {
      display: table;
      width: 100%;
    }

    .data-step-contents-contents {
      display: table-cell;
      margin-top: 6px;
    }

    .data-step-contents-upload {
      display: table-cell;
      text-align: right;
      vertical-align: bottom;
    }

    #demo-data-buttons-container {
      display: none;
      margin-top: 10px;
    }
  </style>
  <div class="title">DATA</div>
  <div class="container">
    <!-- List of runs -->
    <template is="dom-if" if="[[_hasChoices(runNames)]]">
      <paper-dropdown-menu
        no-animations
        label="[[_getNumRunsLabel(runNames)]] found"
      >
        <paper-listbox
          attr-for-selected="value"
          class="dropdown-content"
          selected="{{selectedRun}}"
          slot="dropdown-content"
        >
          <template is="dom-repeat" items="[[runNames]]">
            <paper-item value="[[item]]" label="[[item]]">
              [[item]]
            </paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>
    </template>

    <template is="dom-if" if="[[tensorNames]]">
      <!-- List of tensors in checkpoint -->
      <paper-dropdown-menu
        no-animations
        label="[[_getNumTensorsLabel(tensorNames)]] found"
      >
        <paper-listbox
          attr-for-selected="value"
          class="dropdown-content"
          selected="{{selectedTensor}}"
          slot="dropdown-content"
        >
          <template is="dom-repeat" items="[[tensorNames]]">
            <paper-item value="[[item.name]]" label="[[item.name]]">
              [[item.name]]
              <span class="item-details">
                [[item.shape.0]]x[[item.shape.1]]
              </span>
            </paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>
    </template>

    <div hidden$="[[!_hasChoices(colorOptions)]]">
      <div class="colorlabel-container">
        <!-- Label by -->
        <paper-dropdown-menu id="labelby" no-animations label="Label by">
          <paper-listbox
            attr-for-selected="value"
            class="dropdown-content"
            selected="{{selectedLabelOption}}"
            slot="dropdown-content"
          >
            <template is="dom-repeat" items="[[labelOptions]]">
              <paper-item value="[[item]]" label="[[item]]">
                [[item]]
              </paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
        <!-- Color by -->
        <paper-dropdown-menu id="colorby" no-animations label="Color by">
          <paper-listbox
            attr-for-selected="value"
            class="dropdown-content"
            selected="{{selectedColorOptionName}}"
            slot="dropdown-content"
          >
            <template is="dom-repeat" items="[[colorOptions]]">
              <paper-item
                class$="[[getSeparatorClass(item.isSeparator)]]"
                value="[[item.name]]"
                label="[[item.name]]"
                disabled="[[item.isSeparator]]"
              >
                [[item.name]]
                <span class="item-details">[[item.desc]]</span>
              </paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      <div hidden$="[[!showForceCategoricalColorsCheckbox]]">
        <paper-checkbox id="force-categorical-checkbox"
          >Use categorical coloring</paper-checkbox
        >
        <paper-icon-button icon="help" class="help-icon"></paper-icon-button>
        <paper-tooltip
          position="bottom"
          animation-delay="0"
          fit-to-visible-bounds
        >
          For metadata fields that have many unique values we use a gradient
          color map by default. This checkbox allows you to force categorical
          coloring by a given metadata field.
        </paper-tooltip>
      </div>
      <template is="dom-if" if="[[colorLegendRenderInfo]]">
        <vz-projector-legend
          render-info="[[colorLegendRenderInfo]]"
        ></vz-projector-legend>
      </template>
    </div>
    <template is="dom-if" if="[[_hasChoice(labelOptions)]]">
      <!-- Edit by -->
      <div class="metadata-editor">
        <paper-dropdown-menu no-animations label="Edit by">
          <paper-listbox
            attr-for-selected="value"
            class="dropdown-content"
            slot="dropdown-content"
            on-selected-item-changed="metadataEditorColumnChange"
            selected="{{metadataEditorColumn}}"
          >
            <template is="dom-repeat" items="[[metadataFields]]">
              <paper-item value="[[item]]" label="[[item]]">
                [[item]]
              </paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
        <paper-input
          value="{{metadataEditorInput}}"
          label="{{metadataEditorInputLabel}}"
          on-input="metadataEditorInputChange"
          on-keydown="metadataEditorInputKeydown"
        >
        </paper-input>
      </div>
    </template>
    <div id="demo-data-buttons-container">
      <span class="button-container">
        <paper-tooltip
          position="bottom"
          animation-delay="0"
          fit-to-visible-bounds
        >
          Load data from your computer
        </paper-tooltip>
        <paper-button id="upload" class="ink-button" on-tap="_openDataDialog"
          >Load</paper-button
        >
      </span>
      <span id="publish-container" class="button-container">
        <paper-tooltip
          position="bottom"
          animation-delay="0"
          fit-to-visible-bounds
        >
          Publish your embedding visualization and data
        </paper-tooltip>
        <paper-button
          id="host-embedding"
          class="ink-button"
          on-tap="_openConfigDialog"
          >Publish</paper-button
        >
      </span>
      <span class="button-container">
        <paper-tooltip
          position="bottom"
          animation-delay="0"
          fit-to-visible-bounds
        >
          Download the metadata with applied modifications
        </paper-tooltip>
        <paper-button class="ink-button" on-click="downloadMetadataClicked"
          >Download</paper-button
        >
        <a href="#" id="downloadMetadataLink" hidden></a>
      </span>
      <span id="label-button" class="button-container">
        <paper-tooltip
          position="bottom"
          animation-delay="0"
          fit-to-visible-bounds
        >
          Label selected metadata
        </paper-tooltip>
        <paper-button
          class="ink-button"
          on-click="metadataEditorButtonClicked"
          disabled="[[metadataEditorButtonDisabled]]"
          >Label</paper-button
        >
      </span>
    </div>
    <div>
      <paper-dialog id="dataDialog" with-backdrop>
        <h2>Load data from your computer</h2>
        <paper-dialog-scrollable class="scrollable-container">
          <div class="data-step" id="upload-tensors-step-container">
            <div class="upload-step">
              <div>
                <b
                  ><span class="step-label">Step 1:</span> Load a TSV file of
                  vectors.</b
                >
              </div>
            </div>
            <div class="data-step-contents">
              <div class="data-step-contents-contents">
                Example of 3 vectors with dimension 4:
                <div class="code">
                  0.1<span class="delimiter">&#92;t</span>0.2<span
                    class="delimiter"
                    >&#92;t</span
                  >0.5<span class="delimiter">&#92;t</span>0.9<br />
                  0.2<span class="delimiter">&#92;t</span>0.1<span
                    class="delimiter"
                    >&#92;t</span
                  >5.0<span class="delimiter">&#92;t</span>0.2<br />
                  0.4<span class="delimiter">&#92;t</span>0.1<span
                    class="delimiter"
                    >&#92;t</span
                  >7.0<span class="delimiter">&#92;t</span>0.8
                </div>
              </div>
              <div class="data-step-contents-upload">
                <paper-button
                  id="upload-tensors"
                  title="Choose a TSV tensor file"
                  >Choose file</paper-button
                >
                <input type="file" id="file" name="file" />
              </div>
            </div>
          </div>
          <div class="data-step">
            <div class="upload-step">
              <div>
                <span class="step-label" id="upload-metadata-label"
                  ><b>Step 2</b> (optional):</span
                >
                <b>Load a TSV file of metadata.</b>
              </div>
            </div>
            <div class="data-step-contents">
              <div class="data-step-contents-contents">
                Example of 3 data points and 2 columns.<br />
                <i
                  >Note: If there is more than one column, the first row will be
                  parsed as column labels.</i
                >
                <div class="code">
                  <b>Pokémon<span class="delimiter">&#92;t</span>Species</b
                  ><br />
                  Wartortle<span class="delimiter">&#92;t</span>Turtle<br />
                  Venusaur<span class="delimiter">&#92;t</span>Seed<br />
                  Charmeleon<span class="delimiter">&#92;t</span>Flame
                </div>
              </div>
              <div class="data-step-contents-upload">
                <paper-button
                  id="upload-metadata"
                  title="Choose a TSV metadata file"
                  class="ink-button"
                  >Choose file</paper-button
                >
                <input type="file" id="file-metadata" name="file-metadata" />
              </div>
            </div>
          </div>
        </paper-dialog-scrollable>
        <div class="dismiss-dialog-note">Click outside to dismiss.</div>
      </paper-dialog>
      <paper-dialog id="projectorConfigDialog" with-backdrop>
        <h2>Publish your embedding visualization and data</h2>
        <paper-dialog-scrollable class="scrollable-container">
          <div>
            <p>
              If you'd like to share your visualization with the world, follow
              these simple steps. See
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.tensorflow.org/get_started/embedding_viz"
                >this tutorial</a
              >
              for more.
            </p>
            <h4><span class="step-label">Step 1:</span> Make data public</h4>
            <p>
              Host tensors, metadata, sprite image, and bookmarks TSV files
              <i>publicly</i> on the web.
            </p>
            <p>
              One option is using a
              <a
                target="_blank"
                href="https://gist.github.com/"
                rel="noopener noreferrer"
                >github gist</a
              >. If you choose this approach, make sure to link directly to the
              raw file.
            </p>
          </div>
          <div>
            <h4><span class="step-label">Step 2:</span> Projector config</h4>
            <div class="projector-config-options">
              <i>Optional:</i>
              <div class="config-checkbox">
                <paper-checkbox id="config-metadata-checkbox" checked
                  >Metadata</paper-checkbox
                >
              </div>
              <div class="config-checkbox">
                <paper-checkbox id="config-sprite-checkbox"
                  >Sprite</paper-checkbox
                >
              </div>
              <div class="config-checkbox">
                <paper-checkbox id="config-bookmarks-checkbox"
                  >Bookmarks</paper-checkbox
                >
              </div>
            </div>
          </div>
          <paper-textarea
            id="projector-config-template"
            label="template_projector_config.json"
          ></paper-textarea>
          <div>
            <h4>
              <span class="step-label">Step 3:</span> Host projector config
            </h4>
            After you have hosted the projector config JSON file you built
            above, paste the URL to the config below.
          </div>
          <paper-input
            id="projector-config-url"
            label="Path to projector config"
          ></paper-input>
          <paper-input
            id="projector-share-url"
            label="Your shareable URL"
            readonly
          ></paper-input>
          <div id="projector-share-button-container">
            <a
              target="_blank"
              id="projector-share-url-link"
              rel="noopener noreferrer"
            >
              <paper-button title="Test your shareable URL" class="ink-button"
                >Test your shareable URL</paper-button
              >
            </a>
          </div>
        </paper-dialog-scrollable>
        <div class="dismiss-dialog-note">Click outside to dismiss.</div>
      </paper-dialog>
    </div>
    <paper-checkbox id="normalize-data-checkbox" checked="{{normalizeData}}">
      Spherize data
    </paper-checkbox>
    <paper-icon-button
      id="normalize-data-help"
      icon="help"
      class="help-icon"
    ></paper-icon-button>
    <paper-tooltip
      for="normalize-data-help"
      position="bottom"
      animation-delay="0"
      fit-to-visible-bounds
    >
      The data is normalized by shifting each point by the centroid and making
      it unit norm.
    </paper-tooltip>
    <div class="dirs">
      <table>
        <tr>
          <td>Checkpoint:</td>
          <td>
            <span id="checkpoint-file">
              <tf-wbr-string
                title="[[projectorConfig.modelCheckpointPath]]"
                delimiter-pattern="[[_wordDelimiter]]"
                value="[[projectorConfig.modelCheckpointPath]]"
              ></tf-wbr-string>
            </span>
          </td>
        </tr>
        <tr>
          <td>Metadata:</td>
          <td>
            <span id="metadata-file">
              <tf-wbr-string
                title="[[metadataFile]]"
                delimiter-pattern="[[_wordDelimiter]]"
                value="[[metadataFile]]"
              ></tf-wbr-string>
            </span>
          </td>
        </tr>
      </table>
    </div>
  </div>
`;
