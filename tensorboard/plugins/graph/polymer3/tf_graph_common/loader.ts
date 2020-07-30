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
import {DO_NOT_SUBMIT} from '../tf-imports/d3.html';
import {DO_NOT_SUBMIT} from '../tf-imports/dagre.html';
import {DO_NOT_SUBMIT} from '../tf-imports/graphlib.html';
import {DO_NOT_SUBMIT} from '../tf-imports/lodash.html';
import {DO_NOT_SUBMIT} from 'annotation';
import {DO_NOT_SUBMIT} from 'colors';
import {DO_NOT_SUBMIT} from 'common';
import {DO_NOT_SUBMIT} from 'contextmenu';
import {DO_NOT_SUBMIT} from 'edge';
import {DO_NOT_SUBMIT} from 'externs';
import {DO_NOT_SUBMIT} from 'graph';
import {DO_NOT_SUBMIT} from 'hierarchy';
import {DO_NOT_SUBMIT} from 'layout';
import {DO_NOT_SUBMIT} from 'node';
import {DO_NOT_SUBMIT} from 'op';
import {DO_NOT_SUBMIT} from 'parser';
import {DO_NOT_SUBMIT} from 'proto';
import {DO_NOT_SUBMIT} from 'render';
import {DO_NOT_SUBMIT} from 'scene';
import {DO_NOT_SUBMIT} from 'template';
import {DO_NOT_SUBMIT} from 'util';
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
export type GraphAndHierarchy = {
  graph: SlimGraph;
  graphHierarchy: hierarchy.Hierarchy;
};
export function fetchAndConstructHierarchicalGraph(
  tracker: tf.graph.util.Tracker,
  remotePath: string | null,
  pbTxtFile: Blob | null,
  compatibilityProvider: op.CompatibilityProvider = new op.TpuCompatibilityProvider(),
  hierarchyParams: hierarchy.HierarchyParams = hierarchy.DefaultHierarchyParams
): Promise<GraphAndHierarchy> {
  const dataTracker = util.getSubtaskTracker(tracker, 30, 'Data');
  const graphTracker = util.getSubtaskTracker(tracker, 20, 'Graph');
  const hierarchyTracker = util.getSubtaskTracker(
    tracker,
    50,
    'Namespace hierarchy'
  );
  return parser
    .fetchAndParseGraphData(remotePath, pbTxtFile, dataTracker)
    .then(
      function(graph) {
        if (!graph.node) {
          throw new Error(
            'The graph is empty. This can happen when ' +
              'TensorFlow could not trace any graph. Please refer to ' +
              'https://github.com/tensorflow/tensorboard/issues/1961 for more ' +
              'information.'
          );
        }
        return build(graph, DefaultBuildParams, graphTracker);
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
      return {graph, graphHierarchy};
    })
    .catch((e) => {
      // Generic error catch, for errors that happened outside
      // asynchronous tasks.
      const msg = `Graph visualization failed.\n\n${e}`;
      tracker.reportError(msg, e);
      // Don't swallow the error.
      throw e;
    });
}
