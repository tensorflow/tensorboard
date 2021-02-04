/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
export interface ActionEvent {
  eventCategory: string;
  eventAction: string;
  eventLabel?: string;
  eventValue?: number;
}

export const GRAPH_DEBUG_TIMING_EVENT_CATEGORY = 'Graph dashboard timings';

export enum GraphDebugEventId {
  /**
   * Pre-rendering.
   */
  FETCH_PBTXT_BYTES = 'FETCH_PBTXT_BYTES',
  PARSE_PBTXT_INTO_OBJECT = 'PARSE_PBTXT_INTO_OBJECT',
  FETCH_METADATA_PBTXT_BYTES = 'FETCH_METADATA_PBTXT_BYTES',
  PARSE_METADATA_PBTXT_INTO_OBJECT = 'PARSE_METADATA_PBTXT_INTO_OBJECT',
  NORMALIZING_NAMES = 'NORMALIZING_NAMES',
  BUILD_SLIM_GRAPH = 'BUILD_SLIM_GRAPH',
  HIERARCHY_ADD_NODES = 'HIERARCHY_ADD_NODES',
  HIERARCHY_DETECT_SERIES = 'HIERARCHY_DETECT_SERIES',
  HIERARCHY_ADD_EDGES = 'HIERARCHY_ADD_EDGES',
  HIERARCHY_FIND_SIMILAR_SUBGRAPHS = 'HIERARCHY_FIND_SIMILAR_SUBGRAPHS',
  /**
   * Rendering.
   */
  RENDER_BUILD_HIERARCHY = 'RENDER_BUILD_HIERARCHY',
  RENDER_SCENE_LAYOUT = 'RENDER_SCENE_LAYOUT',
  RENDER_SCENE_BUILD_SCENE = 'RENDER_SCENE_BUILD_SCENE',
  /**
   * Total graph loading (superset of other phases).
   */
  GRAPH_LOAD_SUCCEEDED = 'GRAPH_LOAD_SUCCEEDED',
  GRAPH_LOAD_FAILED = 'GRAPH_LOAD_FAILED',
}
