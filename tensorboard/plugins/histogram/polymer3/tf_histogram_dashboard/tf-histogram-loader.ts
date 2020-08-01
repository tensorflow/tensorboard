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
import "@polymer/paper-icon-button";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-card-heading/tf-card-heading.html";
import { DO_NOT_SUBMIT } from "../tf-color-scale/tf-color-scale.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/data-loader-behavior.html";
import { DO_NOT_SUBMIT } from "../tf-imports/lodash.html";
import { DO_NOT_SUBMIT } from "../vz-histogram-timeseries/vz-histogram-timeseries.html";
import { DO_NOT_SUBMIT } from "tf-histogram-core.html";
import "@polymer/paper-icon-button";
import { DO_NOT_SUBMIT } from "../tf-imports/polymer.html";
import { DO_NOT_SUBMIT } from "../tf-backend/tf-backend.html";
import { DO_NOT_SUBMIT } from "../tf-card-heading/tf-card-heading.html";
import { DO_NOT_SUBMIT } from "../tf-color-scale/tf-color-scale.html";
import { DO_NOT_SUBMIT } from "../tf-dashboard-common/data-loader-behavior.html";
import { DO_NOT_SUBMIT } from "../tf-imports/lodash.html";
import { DO_NOT_SUBMIT } from "../vz-histogram-timeseries/vz-histogram-timeseries.html";
import { DO_NOT_SUBMIT } from "tf-histogram-core.html";
'use strict';
@customElement("tf-histogram-loader")
class TfHistogramLoader extends PolymerElement {
    static readonly template = html `<tf-card-heading tag="[[tag]]" run="[[run]]" display-name="[[tagMetadata.displayName]]" description="[[tagMetadata.description]]" color="[[_runColor]]"></tf-card-heading>
    <!--
      The main histogram that we render. Data is set directly with
      \`setSeriesData\`, not with a bound property.
    -->
    <vz-histogram-timeseries id="chart" time-property="[[timeProperty]]" mode="[[histogramMode]]" color-scale="[[_colorScaleFunction]]"></vz-histogram-timeseries>
    <div style="display: flex; flex-direction: row;">
      <paper-icon-button selected$="[[_expanded]]" icon="fullscreen" on-tap="_toggleExpanded"></paper-icon-button>
    </div>
    <style>
      :host {
        display: flex;
        flex-direction: column;
        width: 330px;
        height: 235px;
        margin-right: 10px;
        margin-bottom: 15px;
      }
      :host([_expanded]) {
        width: 700px;
        height: 500px;
      }

      vz-histogram-timeseries {
        -moz-user-select: none;
        -webkit-user-select: none;
        will-change: transform;
      }

      paper-icon-button {
        color: #2196f3;
        border-radius: 100%;
        width: 32px;
        height: 32px;
        padding: 4px;
      }

      paper-icon-button[selected] {
        background: var(--tb-ui-light-accent);
      }

      tf-card-heading {
        margin-bottom: 10px;
        width: 90%;
      }
    </style>`;
    @property({ type: String })
    run: string;
    @property({ type: String })
    tag: string;
    @property({
        type: Function
    })
    getDataLoadName: object = () => ({ run }) => run;
    @property({
        type: Function
    })
    getDataLoadUrl: object = () => ({ tag, run }) => {
        const router = tf_backend.getRouter();
        return tf_backend.addParams(router.pluginRoute('histograms', '/histograms'), { tag, run });
    };
    @property({
        type: Function
    })
    loadDataCallback: object = function () {
        return (_, datum, data) => {
            const d3Data = tf_histogram_dashboard.backendToVz(data);
            const name = this.getDataLoadName(datum);
            this.$.chart.setSeriesData(name, d3Data);
        };
    };
    @property({ type: Object })
    tagMetadata: object;
    @property({ type: String })
    timeProperty: string;
    @property({ type: String })
    histogramMode: string;
    @property({
        type: Object
    })
    _colorScaleFunction: object = () => tf_color_scale.runsColorScale;
    @property({
        type: Boolean,
        reflectToAttribute: true
    })
    _expanded: boolean = false;
    @observe("run", "tag", "requestManager")
    reload() { }
    behaviors: [tf_dashboard_common.DataLoaderBehavior];
    @computed("run", "tag")
    get dataToLoad(): unknown[] {
        var run = this.run;
        var tag = this.tag;
        return [{ run, tag }];
    }
    @computed("run")
    get _runColor(): string {
        var run = this.run;
        return this._colorScaleFunction(run);
    }
    redraw() {
        this.$.chart.redraw();
    }
    _toggleExpanded(e) {
        this.set('_expanded', !this._expanded);
        this.redraw();
    }
}
