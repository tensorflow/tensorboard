/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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
import {PolymerElement, html} from '@polymer/polymer';
import {customElement, property} from '@polymer/decorators';

import '../tf_graph_board/tf-graph-board';
import {TfGraphBoard} from '../tf_graph_board/tf-graph-board';
import '../tf_graph_controls/tf-graph-controls';
import '../tf_graph_loader/tf-graph-loader';
import * as tf_graph_render from '../tf_graph_common/render';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';

/**
 * Stand alone element of tf-graph for embedding.
 *
 * The pbtxt format is the stringified version of the graphdef.
 *
 *   <tf-graph-app pbtxt="[[pbtxt]]"></tf-graph-app>
 *
 *   import tensorflow as tf.js
 *   life = tf.constant(2, name='life')
 *   universe = tf.constant(40, name='universe')
 *   everything = tf.constant(0, name='everything')
 *   lifeuniverse = tf.add(life, universe)
 *   answer = tf.add(lifeuniverse, everything, name='answer')
 *   open("graph.pbtxt", "w").write(str(tf.get_default_graph().as_graph_def()))
 */
@customElement('tf-graph-app')
class TfGraphApp extends LegacyElementMixin(PolymerElement) {
  static readonly template = html`
    <style>
      :host /deep/ {
        font-family: 'Roboto', sans-serif;
      }

      .main {
        position: absolute;
        right: 0;
        left: 250px;
        height: 100%;
      }

      .side {
        border: 1px solid black;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        height: 100%;
        left: 0;
        position: absolute;
        width: 250px;
      }

      tf-graph-controls {
        flex-grow: 1;
      }

      .all {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .container {
        height: 650px;
      }

      /* The no-toolbar class will hide the div.side element, and move div.main over
   to the left hand side. */
      .container.no-toolbar .main {
        left: 0;
      }

      .container.no-toolbar .side {
        display: none;
      }
    </style>
    <div class="container">
      <div class="all">
        <div class="side">
          <tf-graph-controls
            color-by-params="[[colorByParams]]"
            color-by="{{colorBy}}"
            render-hierarchy="[[_renderHierarchy]]"
            selected-node="{{selectedNode}}"
            selected-file="{{selectedFile}}"
            on-fit-tap="_fit"
            trace-inputs="{{_traceInputs}}"
            auto-extract-nodes="{{_autoExtractNodes}}"
            on-download-image-requested="_onDownloadImageRequested"
          ></tf-graph-controls>
          <tf-graph-loader
            id="loader"
            out-graph-hierarchy="{{graphHierarchy}}"
            out-graph="{{graph}}"
            progress="{{_progress}}"
            selected-file="[[selectedFile]]"
          ></tf-graph-loader>
        </div>
        <div class="main">
          <tf-graph-board
            id="graphboard"
            graph-hierarchy="[[graphHierarchy]]"
            graph="[[graph]]"
            progress="[[_progress]]"
            color-by="{{colorBy}}"
            color-by-params="{{colorByParams}}"
            render-hierarchy="{{_renderHierarchy}}"
            selected-node="{{selectedNode}}"
            trace-inputs="[[_traceInputs]]"
            autoExtractNodes="[[_autoExtractNodes]]"
          ></tf-graph-board>
        </div>
      </div>
    </div>
  `;
  // To use tf-graph-app, specify one of these 2 properties. Provide either
  // 1. The path to a pbtxt file to load (pbtxtFileLocation). This option nicely makes the
  //    progress bar include the time it takes to load the file across the network. The path could
  //    be either a relative path or an absolute URL (of a resource that supports CORS).
  // 2. The raw contents of a pbtxt file (pbtxt).
  // Do not set both of these 2 properties.
  @property({
    type: String,
    observer: '_updateGraph',
  })
  pbtxtFileLocation: string;
  @property({
    type: String,
    observer: '_updateGraph',
  })
  pbtxt: string;
  @property({
    type: Number,
    observer: '_updateWidth',
  })
  width: number;
  @property({
    type: Number,
    observer: '_updateHeight',
  })
  height: number;
  @property({
    type: Boolean,
    observer: '_updateToolbar',
  })
  toolbar: boolean;
  @property({
    type: String,
    notify: true,
  })
  selectedNode: string;
  @property({type: Object})
  _renderHierarchy: tf_graph_render.RenderGraphInfo;
  @property({type: Object})
  _progress: object;
  @property({type: Boolean})
  _traceInputs: boolean;
  @property({type: Boolean})
  _autoExtractNodes: boolean;
  _updateToolbar() {
    (this.$$('.container') as HTMLElement).classList.toggle(
      'no-toolbar',
      !this.toolbar
    );
  }
  _updateWidth() {
    (this.$$('.container') as HTMLElement).style.width = this.width + 'px';
  }
  _updateHeight() {
    (this.$$('.container') as HTMLElement).style.height = this.height + 'px';
  }
  _updateGraph() {
    if (this.pbtxtFileLocation) {
      // Fetch a pbtxt file. The fetching will be part of the loading sequence.
      (this.$.loader as any).datasets = [
        {
          // Just name the dataset based on the file location.
          name: this.pbtxtFileLocation,
          path: this.pbtxtFileLocation,
        },
      ];
      (this.$.loader as any).set('selectedDataset', 0);
    } else if (this.pbtxt) {
      // Render the provided pbtxt.
      var blob = new Blob([this.pbtxt]);
      // TODO(@chihuahua): Find out why we call a private method here and do away with the call.
      (this.$.loader as any)._parseAndConstructHierarchicalGraph(null, blob);
    }
  }
  _fit() {
    ((this.$$('#graphboard') as unknown) as TfGraphBoard).fit();
  }
  _onDownloadImageRequested(filename: string) {
    ((this.$$('#graphboard') as unknown) as TfGraphBoard).downloadAsImage(
      filename
    );
  }
}
