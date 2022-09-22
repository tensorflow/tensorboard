/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import * as tb_debug from '../../../components/tb_debug';
import * as tf_graph_common from './common';
import * as tf_graph from './graph';
import * as hierarchy from './hierarchy';
import * as op from './op';
import * as parser from './parser';
import * as tf_graph_util from './util';

export type GraphAndHierarchy = {
  graph: tf_graph.SlimGraph;
  graphHierarchy: hierarchy.Hierarchy;
};
export function fetchAndConstructHierarchicalGraph(
  tracker: tf_graph_common.ProgressTracker,
  remotePath: string | null,
  pbTxtFile: Blob | null,
  compatibilityProvider: op.CompatibilityProvider = new op.TpuCompatibilityProvider(),
  hierarchyParams: hierarchy.HierarchyParams = hierarchy.DefaultHierarchyParams
): Promise<GraphAndHierarchy> {
  const dataTracker = tf_graph_util.getSubtaskTracker(tracker, 30, 'Data');
  const graphTracker = tf_graph_util.getSubtaskTracker(tracker, 20, 'Graph');
  const hierarchyTracker = tf_graph_util.getSubtaskTracker(
    tracker,
    50,
    'Namespace hierarchy'
  );
  const start = Date.now();
  return parser
    .fetchAndParseGraphData(remotePath!, pbTxtFile!, dataTracker)
    .then(
      function (graph) {
        if (!graph.node) {
          throw new Error(
            'The graph is empty. This can happen when ' +
              'TensorFlow could not trace any graph. Please refer to ' +
              'https://github.com/tensorflow/tensorboard/issues/1961 for more ' +
              'information.'
          );
        }
        return tf_graph.build(graph, tf_graph.DefaultBuildParams, graphTracker);
      },
      () => {
        throw new Error(
          'Malformed GraphDef. This can sometimes be caused by ' +
            'a bad network connection or difficulty reconciling multiple ' +
            'GraphDefs; for the latter case, please refer to ' +
            'https://github.com/tensorflow/tensorboard/issues/1929.'
        );
      }
    )
    .then(async (graph) => {
      // Populate compatibile field of OpNode based on whitelist
      op.checkOpsForCompatibility(graph, compatibilityProvider);
      const graphHierarchy = await hierarchy.build(
        graph,
        hierarchyParams,
        hierarchyTracker
      );
      tf_graph_util.notifyDebugEvent({
        timingId: tb_debug.GraphDebugEventId.GRAPH_LOAD_SUCCEEDED,
        eventValue: Date.now() - start,
      });
      return {graph, graphHierarchy};
    })
    .catch((e) => {
      // Generic error catch, for errors that happened outside
      // asynchronous tasks.
      const msg = `Graph visualization failed.\n\n${e}`;
      tracker.reportError(msg, e);
      tf_graph_util.notifyDebugEvent({
        timingId: tb_debug.GraphDebugEventId.GRAPH_LOAD_FAILED,
        eventValue: Date.now() - start,
      });
      // Don't swallow the error.
      throw e;
    });
}
