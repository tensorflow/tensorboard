/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
/**
 * @fileoverview Common interfaces for the tensorflow graph visualizer.
 */
import { DO_NOT_SUBMIT } from "../tf-imports/d3.html";
import { DO_NOT_SUBMIT } from "../tf-imports/dagre.html";
import { DO_NOT_SUBMIT } from "../tf-imports/graphlib.html";
import { DO_NOT_SUBMIT } from "../tf-imports/lodash.html";
import { DO_NOT_SUBMIT } from "annotation";
import { DO_NOT_SUBMIT } from "colors";
import { DO_NOT_SUBMIT } from "contextmenu";
import { DO_NOT_SUBMIT } from "edge";
import { DO_NOT_SUBMIT } from "externs";
import { DO_NOT_SUBMIT } from "graph";
import { DO_NOT_SUBMIT } from "hierarchy";
import { DO_NOT_SUBMIT } from "layout";
import { DO_NOT_SUBMIT } from "loader";
import { DO_NOT_SUBMIT } from "node";
import { DO_NOT_SUBMIT } from "op";
import { DO_NOT_SUBMIT } from "parser";
import { DO_NOT_SUBMIT } from "proto";
import { DO_NOT_SUBMIT } from "render";
import { DO_NOT_SUBMIT } from "scene";
import { DO_NOT_SUBMIT } from "template";
import { DO_NOT_SUBMIT } from "util";
/* Copyright 2015 The TensorFlow Authors. All Rights Reserved.

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
/**
 * @fileoverview Common interfaces for the tensorflow graph visualizer.
 */
export interface ProgressTracker {
    updateProgress(incrementValue: number): void;
    setMessage(msg: string): void;
    reportError(msg: string, err: Error): void;
}
// Note that tf-graph-control depends on the value of the enum.
// Polymer does not let one use JS variable as a prop.
export enum SelectionType {
    OP_GRAPH = "op_graph",
    CONCEPTUAL_GRAPH = "conceptual_graph",
    PROFILE = "profile"
}
