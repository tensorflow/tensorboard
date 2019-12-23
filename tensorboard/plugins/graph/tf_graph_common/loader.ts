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
import {SlimGraph, DefaultBuildParams, build as graphBuild} from './graph';
import {
  build as hierarchyBuild,
  Hierarchy,
  HierarchyParams,
  DefaultHierarchyParams,
} from './hierarchy';
import {Tracker, getSubtaskTracker} from './util';
import {
  CompatibilityProvider,
  checkOpsForCompatibility,
  TpuCompatibilityProvider,
} from './op';
import {fetchAndParseGraphData} from './parser';
import {GraphDef} from './proto';

export type GraphAndHierarchy = {
  graph: SlimGraph;
  graphHierarchy: Hierarchy;
};
export function fetchAndConstructHierarchicalGraph(
  tracker: Tracker,
  remotePath: string | null,
  pbTxtFile: Blob | null,
  compatibilityProvider: CompatibilityProvider = new TpuCompatibilityProvider(),
  hierarchyParams: HierarchyParams = DefaultHierarchyParams
): Promise<GraphAndHierarchy> {
  const dataTracker = getSubtaskTracker(tracker, 30, 'Data');
  const graphTracker = getSubtaskTracker(tracker, 20, 'Graph');
  const hierarchyTracker = getSubtaskTracker(
    tracker,
    50,
    'Namespace hierarchy'
  );
  return fetchAndParseGraphData(remotePath!, pbTxtFile!, dataTracker)
    .then(
      function(graph: GraphDef) {
        if (!graph.node) {
          throw new Error(
            'The graph is empty. This can happen when ' +
              'TensorFlow could not trace any graph. Please refer to ' +
              'https://github.com/tensorflow/tensorboard/issues/1961 for more ' +
              'information.'
          );
        }
        return graphBuild(graph, DefaultBuildParams, graphTracker);
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
    .then(async (graph: SlimGraph) => {
      // Populate compatibile field of OpNode based on whitelist
      checkOpsForCompatibility(graph, compatibilityProvider);
      const graphHierarchy = await hierarchyBuild(
        graph,
        hierarchyParams,
        hierarchyTracker
      );
      return {graph, graphHierarchy};
    })
    .catch((e: Error) => {
      // Generic error catch, for errors that happened outside
      // asynchronous tasks.
      const msg = `Graph visualization failed.\n\n${e}`;
      tracker.reportError(msg, e);
      // Don't swallow the error.
      throw e;
    });
}
