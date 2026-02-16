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

import {customElement, observe, property} from '@polymer/decorators';
import {PolymerElement} from '@polymer/polymer';
import {LegacyElementMixin} from '../../../components/polymer/legacy_element_mixin';
import {getRouter} from '../../../components/tf_backend/router';
import * as tf_graph_common from '../tf_graph_common/common';
import * as tf_graph from '../tf_graph_common/graph';
import * as tf_graph_hierarchy from '../tf_graph_common/hierarchy';
import * as tf_graph_loader from '../tf_graph_common/loader';
import * as tf_graph_op from '../tf_graph_common/op';
import * as tf_graph_parser from '../tf_graph_common/parser';
import * as tf_graph_util from '../tf_graph_common/util';
import * as tf_graph_controls from '../tf_graph_controls/tf-graph-controls';

interface GraphRunTag {
  run: string;
  tag: string | null;
}

/**
 * Data loader for tf-graph-dashboard.
 *
 * The loader loads op graph, conceptual graphs, and RunMetadata associated with
 * an op graph which is the major difference from the tf-graph-loader which is
 * only capable of loading an op graph. Another difference is that the loader
 * takes `selection` from the tf-graph-controls as an input as opposed to URL
 * path of an data endpoint.
 */
@customElement('tf-graph-dashboard-loader')
class TfGraphDashboardLoader extends LegacyElementMixin(PolymerElement) {
  @property({type: Array})
  datasets: any[];
  /**
   * @type {{value: number, msg: string}}
   *
   * A number between 0 and 100 denoting the % of progress
   * for the progress bar and the displayed message.
   */
  @property({
    type: Object,
    notify: true,
  })
  progress: object;
  @property({type: Object})
  selection: any;
  /**
   * TODO(stephanwlee): This should be changed to take in FileList or
   * the prop should be changed to `fileInput`.
   * @type {?Event}
   */
  @property({type: Object})
  selectedFile: object;
  @property({
    type: Object,
  })
  compatibilityProvider = new tf_graph_op.TpuCompatibilityProvider();
  @property({
    type: Object,
  })
  hierarchyParams = tf_graph_hierarchy.DefaultHierarchyParams;
  @property({
    type: Object,
    readOnly: true, //readonly so outsider can't change this via binding
    notify: true,
  })
  outGraphHierarchy: tf_graph_hierarchy.Hierarchy;
  @property({
    type: Object,
    readOnly: true, //readonly so outsider can't change this via binding
    notify: true,
  })
  outGraph: tf_graph.SlimGraph;
  @property({
    type: Object,
    readOnly: true, // This property produces data.
    notify: true,
  })
  outStats: object;
  @property({type: Object})
  _graphRunTag: GraphRunTag;
  override _template = null;
  @observe('selection', 'compatibilityProvider')
  _selectionChanged(): void {
    if (!this.selection) {
      return;
    }
    // selection can change a lot within a microtask.
    // Don't fetch too much too fast and introduce race condition.
    this.debounce('selectionchange', () => {
      this._load(this.selection);
    });
  }
  _load(selection: tf_graph_controls.Selection) {
    const {run, tag, type: selectionType} = selection;
    switch (selectionType) {
      case tf_graph_common.SelectionType.OP_GRAPH:
      case tf_graph_common.SelectionType.CONCEPTUAL_GRAPH: {
        // Clear stats about the previous graph.
        (function () {
          this._setOutStats(null);
        }.bind(this)());
        const params = new URLSearchParams();
        params.set('run', run);
        params.set(
          'conceptual',
          String(
            selectionType === tf_graph_common.SelectionType.CONCEPTUAL_GRAPH
          )
        );
        if (tag) params.set('tag', tag);
        const graphPath = getRouter().pluginRouteForSrc(
          'graphs',
          '/graph',
          params
        );
        return this._fetchAndConstructHierarchicalGraph(graphPath).then(() => {
          this._graphRunTag = {run, tag};
        });
      }
      case tf_graph_common.SelectionType.PROFILE: {
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
              type: tf_graph_common.SelectionType.OP_GRAPH,
            })
          : Promise.resolve();
        const params = new URLSearchParams();
        params.set('tag', tag!);
        params.set('run', run);
        const metadataPath = getRouter().pluginRouteForSrc(
          'graphs',
          '/run_metadata',
          params
        );
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
    var tracker = tf_graph_util.getTracker(this);
    tf_graph_parser.fetchAndParseMetadata(path, tracker).then(
      function (stats) {
        this._setOutStats(stats);
      }.bind(this)
    );
  }
  _fetchAndConstructHierarchicalGraph(path: string | null, pbTxtFile?: Blob) {
    // Reset the progress bar to 0.
    this.set('progress', {
      value: 0,
      msg: '',
    });
    const tracker = tf_graph_util.getTracker(this);
    return tf_graph_loader
      .fetchAndConstructHierarchicalGraph(
        tracker,
        path,
        pbTxtFile !== undefined ? pbTxtFile : null,
        this.compatibilityProvider,
        this.hierarchyParams
      )
      .then(
        function ({graph, graphHierarchy}) {
          this._setOutGraph(graph);
          this._setOutGraphHierarchy(graphHierarchy);
        }.bind(this)
      );
  }
  @observe('selectedFile', 'compatibilityProvider')
  _selectedFileChanged() {
    var e = this.selectedFile;
    if (!e) {
      return;
    }
    const target = (e as any).target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }
    // Clear out the value of the file chooser. This ensures that if the user
    // selects the same file, we'll re-read it.
    target.value = '';
    this._fetchAndConstructHierarchicalGraph(null, file);
  }
}
