/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
/**
 * @fileoverview Extern declarations for tensorflow graph visualizer.
 *     This file contains compiler stubs for external dependencies whos
 *     implementations are defined at runtime.
 */
import * as graphlib from 'graphlib';

/**
 * Dagre auggments the graplih.GraphOptions to add more options like below.
 */
export interface GraphOptions extends graphlib.GraphOptions {
  name?: string;
  /**
   * Direction for rank nodes. Can be TB, BT, LR, or RL, where T = top,
   * B = bottom, L = left, and R = right.
   */
  rankdir?: string;
  type?: string | number;
  /** Number of pixels between each rank in the layout. */
  ranksep?: number;
  /** Number of pixels that separate nodes horizontally in the layout. */
  nodesep?: number;
  /** Number of pixels that separate edges horizontally in the layout */
  edgesep?: number;
}

/**
 * Unlike graphlib.Graph, node and edge are typed.
 */
export abstract class Graph<Node, EdgeValue> {
  constructor(options: GraphOptions) {}

  abstract setNode(name: string, value?: Node): Graph<Node, EdgeValue>;
  abstract hasNode(name: string): boolean;

  abstract setEdge(
    fromName: string,
    toName: string,
    value?: EdgeValue,
    name?: string
  ): Graph<Node, EdgeValue>;
  abstract setEdge(
    edge: graphlib.Edge,
    label?: EdgeValue
  ): Graph<Node, EdgeValue>;
  abstract hasEdge(v: string, w: string, name?: string | undefined): boolean;
  abstract hasEdge(edge: graphlib.Edge): boolean;
  abstract edge(fromName: string, toName: string): EdgeValue;
  abstract edge(edgeObject: graphlib.Edge): EdgeValue;
  abstract removeEdge(v: string, w: string): Graph<Node, EdgeValue>;
  abstract nodes(): string[];
  abstract node(name: string): Node;
  abstract removeNode(name: string): Graph<Node, EdgeValue>;
  abstract setGraph(label: string): Graph<Node, EdgeValue>;
  abstract graph(): string;
  abstract nodeCount(): number;
  abstract neighbors(name: string): string[];
  abstract successors(name: string): string[];
  abstract predecessors(name: string): string[];
  abstract edges(): graphlib.Edge[];
  abstract outEdges(name: string): graphlib.Edge[];
  abstract inEdges(name: string): graphlib.Edge[];
  /**
   * Returns those nodes in the graph that have no in-edges.
   * Takes O(|V|) time.
   */
  abstract sources(): string[];
  /**
   * Remove the node with the id v in the graph or do nothing if
   * the node is not in the graph. If the node was removed this
   * function also removes any incident edges. Returns the graph,
   * allowing this to be chained with other functions. Takes O(|E|) time.
   */
  abstract setParent(name: string, parentName?: string): Graph<Node, EdgeValue>;
}
