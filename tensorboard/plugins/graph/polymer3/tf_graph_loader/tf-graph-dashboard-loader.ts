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
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
import {DO_NOT_SUBMIT} from 'tf-graph-dashboard-loader';
import {DO_NOT_SUBMIT} from '../tf-imports/polymer.html';
import {DO_NOT_SUBMIT} from '../tf-backend/tf-backend.html';
import {DO_NOT_SUBMIT} from '../tf-graph-common/tf-graph-common.html';
interface GraphRunTag {
  run: string;
  tag?: string;
}
@customElement('tf-graph-dashboard-loader')
class TfGraphDashboardLoader extends PolymerElement {
  @property({type: Array})
  datasets: unknown[];
  @property({
    type: Object,
    notify: true,
  })
  progress: object;
  @property({type: Object})
  selection: object;
  @property({type: Object})
  selectedFile: object;
  @property({
    type: Object,
  })
  compatibilityProvider: object = () =>
    new tf.graph.op.TpuCompatibilityProvider();
  @property({
    type: Object,
  })
  hierarchyParams: object = () => tf.graph.hierarchy.DefaultHierarchyParams;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  outGraphHierarchy: object;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  outGraph: object;
  @property({
    type: Object,
    readOnly: true,
    notify: true,
  })
  outStats: object;
  @property({type: Object})
  _graphRunTag: object;
  _template: null;
  @observe('selection', 'compatibilityProvider')
  _selectionChanged(): void {
    // selection can change a lot within a microtask.
    // Don't fetch too much too fast and introduce race condition.
    this.debounce('selectionchange', () => {
      this._load(this.selection);
    });
  }
  _load(selection: tf.graph.controls.Selection) {
    const {run, tag, type: selectionType} = selection;
    switch (selectionType) {
      case tf.graph.SelectionType.OP_GRAPH:
      case tf.graph.SelectionType.CONCEPTUAL_GRAPH: {
        // Clear stats about the previous graph.
        this._setOutStats(null);
        const params = new URLSearchParams();
        params.set('run', run);
        params.set(
          'conceptual',
          String(selectionType === tf.graph.SelectionType.CONCEPTUAL_GRAPH)
        );
        if (tag) params.set('tag', tag);
        const graphPath = tf_backend
          .getRouter()
          .pluginRoute('graphs', '/graph', params);
        return this._fetchAndConstructHierarchicalGraph(graphPath).then(() => {
          this._graphRunTag = {run, tag};
        });
      }
      case tf.graph.SelectionType.PROFILE: {
        const {tags} = this.datasets.find(({name}) => name === run);
        const tagMeta = tags.find((t) => t.tag === tag);
        // In case current tag misses opGraph but has profile information,
        // we fallback to the v1 behavior of fetching the run graph.
        const requiredOpGraphTag = tagMeta.opGraph ? tag : null;
        console.assert(
          tags.find((t) => t.tag === requiredOpGraphTag),
          `Required tag (${requiredOpGraphTag}) is missing.`
        );
        const shouldFetchGraph =
          !this._graphRunTag ||
          this._graphRunTag.run !== run ||
          this._graphRunTag.tag !== requiredOpGraphTag;
        const maybeFetchGraphPromise = shouldFetchGraph
          ? this._load({
              run,
              tag: requiredOpGraphTag,
              type: tf.graph.SelectionType.OP_GRAPH,
            })
          : Promise.resolve();
        const params = new URLSearchParams();
        params.set('tag', tag);
        params.set('run', run);
        const metadataPath = tf_backend
          .getRouter()
          .pluginRoute('graphs', '/run_metadata', params);
        return maybeFetchGraphPromise.then(() =>
          this._readAndParseMetadata(metadataPath)
        );
      }
      default:
        return Promise.reject(
          new Error(`Unknown selection type: ${selectionType}`)
        );
    }
  }
  _readAndParseMetadata(path: string) {
    // Reset the progress bar to 0.
    this.set('progress', {
      value: 0,
      msg: '',
    });
    var tracker = tf.graph.util.getTracker(this);
    tf.graph.parser.fetchAndParseMetadata(path, tracker).then((stats) => {
      this._setOutStats(stats);
    });
  }
  _fetchAndConstructHierarchicalGraph(path: string | null, pbTxtFile?: Blob) {
    // Reset the progress bar to 0.
    this.set('progress', {
      value: 0,
      msg: '',
    });
    const tracker = tf.graph.util.getTracker(this);
    return tf.graph.loader
      .fetchAndConstructHierarchicalGraph(
        tracker,
        path,
        pbTxtFile,
        this.compatibilityProvider,
        this.hierarchyParams
      )
      .then(({graph, graphHierarchy}) => {
        this._setOutGraph(graph);
        this._setOutGraphHierarchy(graphHierarchy);
      });
  }
  @observe('selectedFile', 'compatibilityProvider')
  _selectedFileChanged() {
    var e = this.selectedFile;
    if (!e) {
      return;
    }
    const target = e.target as HTMLInputElement;
    const file = target.files[0];
    if (!file) {
      return;
    }
    // Clear out the value of the file chooser. This ensures that if the user
    // selects the same file, we'll re-read it.
    target.value = '';
    this._fetchAndConstructHierarchicalGraph(null, file);
  }
}
