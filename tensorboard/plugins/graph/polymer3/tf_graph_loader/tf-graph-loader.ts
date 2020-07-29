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

import { PolymerElement, html } from "@polymer/polymer";
import { customElement, property } from "@polymer/decorators";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-graph-common/tf-graph-common.html";
import { DO_NOT_SUBMIT } from "tf-graph-loader";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-graph-common/tf-graph-common.html";
@customElement("tf-graph-loader")
class TfGraphLoader extends PolymerElement {
    @property({ type: Array })
    datasets: unknown[];
    @property({
        type: Number
    })
    selectedData: number = 0;
    @property({ type: Object })
    selectedFile: object;
    @property({
        type: Object
    })
    compatibilityProvider: object = () => new tf.graph.op.TpuCompatibilityProvider();
    @property({
        type: Object
    })
    overridingHierarchyParams: object = () => ({});
    @property({
        type: Object,
        notify: true
    })
    progress: object;
    @property({
        type: Object,
        readOnly: true,
        notify: true
    })
    outGraphHierarchy: object;
    @property({
        type: Object,
        readOnly: true,
        notify: true
    })
    outGraph: object;
    @property({
        type: Object,
        readOnly: true,
        notify: true
    })
    outHierarchyParams: object;
    _template: null;
    @observe("datasets", "selectedData", "overridingHierarchyParams", "compatibilityProvider")
    _loadData(): void {
        // Input can change a lot within a microtask.
        // Don't fetch too much too fast and introduce race condition.
        this.debounce("load", () => {
            const dataset = this.datasets[this.selectedData];
            if (!dataset)
                return;
            this._parseAndConstructHierarchicalGraph(dataset.path);
        });
    }
    _parseAndConstructHierarchicalGraph(path: string | null, pbTxtFile?: Blob): void {
        const { overridingHierarchyParams, compatibilityProvider } = this;
        // Reset the progress bar to 0.
        this.progress = { value: 0, msg: "" };
        const tracker = tf.graph.util.getTracker(this);
        const hierarchyParams = Object.assign({}, tf.graph.hierarchy.DefaultHierarchyParams, overridingHierarchyParams);
        tf.graph.loader
            .fetchAndConstructHierarchicalGraph(tracker, path, pbTxtFile, compatibilityProvider, hierarchyParams)
            .then(({ graph, graphHierarchy }) => {
            this._setOutHierarchyParams(hierarchyParams);
            this._setOutGraph(graph);
            this._setOutGraphHierarchy(graphHierarchy);
        });
    }
    @observe("selectedFile", "overridingHierarchyParams", "compatibilityProvider")
    _loadFile(): void {
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
        target.value = "";
        this._parseAndConstructHierarchicalGraph(null, file);
    }
}
