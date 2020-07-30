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
import {RenderNodeInfo} from './render';

type Selection = d3.Selection<any, any, any, any>;
// This technically extends Polymer.Component whose constructor is not
// accessible.
export abstract class TfGraphScene extends HTMLElement {
  maxMetanodeLabelLength: number;
  maxMetanodeLabelLengthLargeFont: number;
  maxMetanodeLabelLengthFontSize: number;
  templateIndex: () => {};
  colorBy: string;
  abstract fire(eventName: string, daat: any): void;
  abstract addNodeGroup(name: string, selection: Selection): void;
  abstract removeNodeGroup(name: string): void;
  abstract removeAnnotationGroup(name: string): void;
  abstract isNodeExpanded(node: RenderNodeInfo): boolean;
  abstract isNodeHighlighted(nodeName: string): boolean;
  abstract isNodeSelected(nodeName: string): boolean;
  abstract getAnnotationGroupsIndex(name: string): Selection;
  abstract getGraphSvgRoot(): SVGElement;
  abstract getContextMenu(): HTMLElement;
}
