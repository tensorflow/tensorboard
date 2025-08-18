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
import './styles';

export const template = html`
    <style include="vz-projector-styles"></style>
    <style>
      :host {
        transition: height 0.2s;
      }

      .ink-button {
        border: none;
        border-radius: 2px;
        font-size: 13px;
        padding: 10px;
        min-width: 88px;
        flex-shrink: 0;
        background: #e3e3e3;
      }

      .ink-panel-buttons {
        margin-bottom: 10px;
      }

      .two-way-toggle {
        display: flex;
        flex-direction: row;
      }

      .two-way-toggle span {
        padding-right: 7px;
      }

      .has-border {
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .toggle {
        min-width: 0px;
        font-size: 12px;
        width: 17px;
        min-height: 0px;
        height: 21px;
        padding: 0;
        margin: 0px;
      }

      .toggle[active] {
        background-color: #880e4f;
        color: white;
      }

      .two-columns {
        display: flex;
        justify-content: space-between;
      }

      .two-columns > :first-child {
        margin-right: 15px;
      }

      .two-columns > div {
        width: 50%;
      }

      .dropdown-item {
        justify-content: space-between;
        min-height: 35px;
      }

      .tsne-supervise-factor {
        margin-bottom: -8px;
      }

      .supervise-settings {
        display: flex;
      }

      .supervise-settings paper-dropdown-menu {
        width: 100px;
        margin-right: 10px;
      }

      .supervise-settings paper-input {
        width: calc(100% - 110px);
      }

      #z-container {
        display: flex;
        align-items: center;
        width: 50%;
      }

      #z-checkbox {
        margin: 27px 0 0 5px;
        width: 18px;
      }

      #z-dropdown {
        flex-grow: 1;
      }

      .notice {
        color: #880e4f;
      }

      .container {
        padding: 20px;
      }

      .book-icon {
        height: 20px;
        color: rgba(0, 0, 0, 0.7);
      }

      .item-details {
        color: gray;
        font-size: 12px;
        margin-left: 5px;
      }

      .pca-dropdown {
        width: 100%;
      }

      .pca-dropdown paper-listbox {
        width: 135px;
      }

      .dropdown-item.header {
        border-bottom: 1px solid #aaa;
        color: #333;
        font-weight: bold;
      }

      #total-variance {
        color: rgba(0, 0, 0, 0.7);
      }
    </style>
    <div id="main">
      <div class="ink-panel-header">
        <div class="ink-tab-group">
          <div
            data-tab="umap"
            id="umap-tab"
            class="ink-tab projection-tab"
            title="Uniform manifold approximation and projection"
          >
            UMAP
          </div>
          <div
            data-tab="tsne"
            id="tsne-tab"
            class="ink-tab projection-tab"
            title="t-distributed stochastic neighbor embedding"
          >
            t-SNE
          </div>
          <div
            data-tab="pca"
            id="pca-tab"
            class="ink-tab projection-tab"
            title="Principal component analysis"
          >
            PCA
          </div>
          <div
            data-tab="custom"
            id="custom-tab"
            class="ink-tab projection-tab"
            title="Linear projection of two custom vectors"
          >
            Custom
          </div>
        </div>
      </div>
      <div class="container">
        <!-- UMAP Controls -->
        <div data-panel="umap" class="ink-panel-content">
          <div class="slider">
            <label>Dimension</label>
            <div class="two-way-toggle">
              <span>2D</span>
              <paper-toggle-button id="umap-toggle" checked="{{umapIs3d}}"
                >3D</paper-toggle-button
              >
            </div>
          </div>
          <div class="slider umap-neighbors">
            <label>
              Neighbors
              <paper-icon-button
                icon="help"
                class="help-icon"
              ></paper-icon-button>
              <paper-tooltip
                position="right"
                animation-delay="0"
                fit-to-visible-bounds
              >
                The number of nearest neighbors used to compute the fuzzy
                simplicial set, which is used to approximate the overall shape
                of the manifold. The default value is 15.
              </paper-tooltip>
            </label>
            <paper-slider
              id="umap-neighbors-slider"
              value="{{umapNeighbors}}"
              pin
              min="5"
              max="50"
            ></paper-slider>
            <span>[[umapNeighbors]]</span>
          </div>
          <div class="slider umap-min-dist">
            <label>
              MinDist
              <paper-icon-button
                icon="help"
                class="help-icon"
              ></paper-icon-button>
              <paper-tooltip
                position="right"
                animation-delay="0"
                fit-to-visible-bounds
              >
                Controls how tightly UMAP is allowed to pack points together.
                Provides the minimum distance apart that points are allowed to
                be in the low dimensional representation. The default value is
                0.1.
              </paper-tooltip>
            </label>
            <paper-slider
              id="umap-mindist-slider"
              value="{{umapMinDist}}"
              pin
              min="0"
              max="0.99"
              step="0.01"
            ></paper-slider>
            <span>[[umapMinDist]]</span>
          </div>
          <p>
            <button
              id="run-umap"
              class="ink-button"
              title="Run UMAP"
              on-tap="runUmap"
            >
              Run
            </button>
          </p>
          <p id="umap-sampling" class="notice">
            For faster results, the data will be sampled down to
            [[getUmapSampleSizeText()]] points.
          </p>
          <p>
            <iron-icon icon="book" class="book-icon"></iron-icon>
            <a
              target="_blank"
              rel="noopener"
              href="https://umap-learn.readthedocs.io/en/latest/how_umap_works.html"
            >
              Learn more about UMAP.
            </a>
          </p>
        </div>
        <!-- TSNE Controls -->
        <div data-panel="tsne" class="ink-panel-content">
          <div class="slider">
            <label>Dimension</label>
            <div class="two-way-toggle">
              <span>2D</span>
              <paper-toggle-button id="tsne-toggle" checked="{{tSNEis3d}}"
                >3D</paper-toggle-button
              >
            </div>
          </div>
          <div class="slider tsne-perplexity">
            <label>
              Perplexity
              <paper-icon-button
                icon="help"
                class="help-icon"
              ></paper-icon-button>
              <paper-tooltip
                position="right"
                animation-delay="0"
                fit-to-visible-bounds
              >
                The most appropriate perplexity value depends on the density of
                the data. Loosely speaking, a larger / denser dataset requires a
                larger perplexity. Typical values for perplexity range between 5
                and 50.
              </paper-tooltip>
            </label>
            <paper-slider
              id="perplexity-slider"
              pin
              min="2"
              max="100"
              value="30"
            ></paper-slider>
            <span></span>
          </div>
          <div class="slider tsne-learning-rate">
            <label>
              Learning rate
              <paper-icon-button
                icon="help"
                class="help-icon"
              ></paper-icon-button>
              <paper-tooltip
                position="right"
                animation-delay="0"
                fit-to-visible-bounds
              >
                The ideal learning rate often depends on the size of the data,
                with smaller datasets requiring smaller learning rates.
              </paper-tooltip>
            </label>
            <paper-slider
              id="learning-rate-slider"
              snaps
              min="-3"
              max="2"
              step="1"
              value="1"
              max-markers="6"
            >
            </paper-slider>
            <span></span>
          </div>
          <div class="slider tsne-supervise-factor">
            <label>
              Supervise
              <paper-icon-button
                icon="help"
                class="help-icon"
              ></paper-icon-button>
              <paper-tooltip
                position="right"
                animation-delay="0"
                fit-to-visible-bounds
              >
                The label importance used for supervision, from 0 (disabled) to
                100 (full importance).
              </paper-tooltip>
            </label>
            <paper-slider
              id="supervise-factor-slider"
              min="0"
              max="100"
              pin
              value="{{superviseFactor}}"
            >
            </paper-slider>
            <span></span>
          </div>
          <!-- Supervise by -->
          <div class="supervise-settings">
            <paper-dropdown-menu no-animations label="Supervise with">
              <paper-listbox
                attr-for-selected="value"
                class="dropdown-content"
                on-selected-item-changed="superviseColumnChanged"
                selected="{{superviseColumn}}"
                slot="dropdown-content"
              >
                <template is="dom-repeat" items="[[metadataFields]]">
                  <paper-item value="[[item]]" label="[[item]]">
                    [[item]]
                  </paper-item>
                </template>
              </paper-listbox>
            </paper-dropdown-menu>
            <paper-input
              value="{{superviseInput}}"
              label="{{superviseInputLabel}}"
              on-change="superviseInputChange"
              on-input="superviseInputTyping"
            >
            </paper-input>
          </div>
          <p>
            <button class="run-tsne ink-button" title="Re-run t-SNE">
              Run
            </button>
            <button class="pause-tsne ink-button" title="Pause t-SNE">
              Pause
            </button>
            <button class="perturb-tsne ink-button" title="Perturb t-SNE">
              Perturb
            </button>
          </p>
          <p>Iteration: <span class="run-tsne-iter">0</span></p>
          <p id="tsne-sampling" class="notice">
            For faster results, the data will be sampled down to
            [[getTsneSampleSizeText()]] points.
          </p>
          <p>
            <iron-icon icon="book" class="book-icon"></iron-icon>
            <a
              target="_blank"
              href="http://distill.pub/2016/misread-tsne/"
              rel="noopener noreferrer"
            >
              How to use t-SNE effectively.
            </a>
          </p>
        </div>
        <!-- PCA Controls -->
        <div data-panel="pca" class="ink-panel-content">
          <div class="two-columns">
            <div>
              <!-- Left column -->
              <paper-dropdown-menu
                class="pca-dropdown"
                vertical-align="bottom"
                no-animations
                label="X"
              >
                <paper-listbox
                  attr-for-selected="value"
                  class="dropdown-content"
                  selected="{{pcaX}}"
                  slot="dropdown-content"
                >
                  <paper-item disabled class="dropdown-item header">
                    <div>#</div>
                    <div>Variance (%)</div>
                  </paper-item>
                  <template is="dom-repeat" items="[[pcaComponents]]">
                    <paper-item
                      class="dropdown-item"
                      value="[[item.id]]"
                      label="Component #[[item.componentNumber]]"
                    >
                      <div>[[item.componentNumber]]</div>
                      <div class="item-details">[[item.percVariance]]</div>
                    </paper-item>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
              <paper-dropdown-menu
                class="pca-dropdown"
                no-animations
                vertical-align="bottom"
                label="Z"
                disabled="[[!hasPcaZ]]"
                id="z-dropdown"
              >
                <paper-listbox
                  attr-for-selected="value"
                  class="dropdown-content"
                  selected="{{pcaZ}}"
                  slot="dropdown-content"
                >
                  <paper-item disabled class="dropdown-item header">
                    <div>#</div>
                    <div>Variance (%)</div>
                  </paper-item>
                  <template is="dom-repeat" items="[[pcaComponents]]">
                    <paper-item
                      class="dropdown-item"
                      value="[[item.id]]"
                      label="Component #[[item.componentNumber]]"
                    >
                      <div>[[item.componentNumber]]</div>
                      <div class="item-details">[[item.percVariance]]</div>
                    </paper-item>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
            </div>
            <div>
              <!-- Right column -->
              <paper-dropdown-menu
                class="pca-dropdown"
                vertical-align="bottom"
                no-animations
                label="Y"
              >
                <paper-listbox
                  attr-for-selected="value"
                  class="dropdown-content"
                  selected="{{pcaY}}"
                  slot="dropdown-content"
                >
                  <paper-item disabled class="dropdown-item header">
                    <div>#</div>
                    <div>Variance (%)</div>
                  </paper-item>
                  <template is="dom-repeat" items="[[pcaComponents]]">
                    <paper-item
                      class="dropdown-item"
                      value="[[item.id]]"
                      label="Component #[[item.componentNumber]]"
                    >
                      <div>[[item.componentNumber]]</div>
                      <div class="item-details">[[item.percVariance]]</div>
                    </paper-item>
                  </template>
                </paper-listbox>
              </paper-dropdown-menu>
              <paper-checkbox
                id="z-checkbox"
                checked="{{pcaIs3d}}"
              ></paper-checkbox>
            </div>
          </div>
          <p id="pca-sampling" class="notice">
            PCA is approximate.
            <paper-icon-button
              icon="help"
              class="help-icon"
            ></paper-icon-button>
          </p>
          <div id="total-variance">Total variance</div>
          <paper-tooltip
            for="pca-sampling"
            position="top"
            animation-delay="0"
            fit-to-visible-bounds
          >
            For fast results, the data was sampled to [[getPcaSampleSizeText()]]
            points and randomly projected down to [[getPcaSampledDimText()]]
            dimensions.
          </paper-tooltip>
        </div>
        <!-- Custom Controls -->
        <div data-panel="custom" class="ink-panel-content">
          <paper-dropdown-menu
            style="width: 100%"
            no-animations
            label="Search by"
          >
            <paper-listbox
              attr-for-selected="value"
              class="dropdown-content"
              selected="{{customSelectedSearchByMetadataOption}}"
              slot="dropdown-content"
            >
              <template is="dom-repeat" items="[[searchByMetadataOptions]]">
                <paper-item
                  class="dropdown-item"
                  value="[[item]]"
                  label="[[item]]"
                >
                  [[item]]
                </paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
          <div class="two-columns">
            <vz-projector-input id="xLeft" label="Left"></vz-projector-input>
            <vz-projector-input id="xRight" label="Right"></vz-projector-input>
          </div>
          <div class="two-columns">
            <vz-projector-input id="yUp" label="Up"></vz-projector-input>
            <vz-projector-input id="yDown" label="Down"></vz-projector-input>
          </div>
        </div>
      </div>
    </div>
  </template>
  <script src="vz-projector-projections-panel.js"></script>
</dom-module>
`;
