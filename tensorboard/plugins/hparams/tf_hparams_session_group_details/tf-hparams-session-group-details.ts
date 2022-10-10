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
import * as IronResizableBehavior from '@polymer/iron-resizable-behavior';
import {html, PolymerElement} from '@polymer/polymer';
import '../../../components/polymer/irons_and_papers';
import {mixinBehaviors} from '../../../components/polymer/legacy_class';
import '../../../components/tf_backend/tf-backend';
import * as tf_color_scale from '../../../components/tf_color_scale/palettes';
import {RequestDataCallback} from '../../../components/tf_dashboard_common/data-loader-behavior';
import * as vz_chart_helpers from '../../../components/vz_chart_helpers/vz-chart-helpers';
import '../../scalar/tf_scalar_dashboard/tf-scalar-card';
import * as tf_hparams_utils from '../tf_hparams_utils/tf-hparams-utils';

// TODO: add dependency once the Polymer 3 scalar dashboard is migrated.
// import '../tf_scalar_dashboard/tf-scalar-card';

type RunTagItem = {
  run: string;
  tag: string;
};

/**
 * Shows a session group in more detail. Specifically, shows graphs of the
 * metrics for the session in the group as a function of the training step.
 * This element is shown one the user "drills-in" to a session group, for
 * example when she clicks on a row in table-view or a curve in parallel-coords
 * view.
 */
@customElement('tf-hparams-session-group-details')
class TfHparamsSessionGroupDetails extends mixinBehaviors(
  [IronResizableBehavior],
  PolymerElement
) {
  static readonly template = html`
    <template is="dom-if" if="[[!sessionGroup]]">
      <div>
        <h3>No session group selected</h3>
        <p>Please select a session group to see its metric-graphs here.</p>
      </div>
    </template>
    <template is="dom-if" if="[[!_haveMetrics(visibleSchema.*)]]">
      <div>
        <h3>No metrics are enabled</h3>
        <p>Please enable some metrics to see content here.</p>
      </div>
    </template>
    <div class="layout horizontal wrap session-group-details">
      <template
        is="dom-if"
        if="[[_haveMetricsAndSessionGroup(visibleSchema.*, sessionGroup)]]"
      >
        <template
          is="dom-repeat"
          items="[[visibleSchema.metricInfos]]"
          as="metricInfo"
        >
          <!-- Note that we do not provide a request-manager attribute since
               we provide a function in request-data for calling the backend
               to get the metrics data.
            -->
          <tf-scalar-card
            class="scalar-card"
            color-scale="[[_colorScale]]"
            data-to-load="[[_computeSeriesForSessionGroupMetric(sessionGroup, metricInfo)]]"
            tag="[[metricInfo.name.tag]]"
            tag-metadata="[[_computeTagMetadata(metricInfo)]]"
            x-type="[[_xType]]"
            multi-experiments="[[_noMultiExperiments]]"
            request-data="[[_requestData]]"
            active
          >
          </tf-scalar-card>
        </template>
      </template>
    </div>
    <!-- "iron-flex" is needed to use the layout classes in the div above -->
    <style include="iron-flex">
      :host {
        display: block;
      }
    </style>
  `;

  // An object for making HParams API requests to the backend.
  @property({type: Object})
  backend: any;
  // The name of the experiment to use. Will be passed as is to
  // the /metrics_eval HTTP endpoint.
  @property({type: String})
  experimentName: string;
  // See the definition of this property in tf-hparams-query-pane.html
  @property({type: Object})
  visibleSchema: any;
  // The session group object to display. Matches the SessionGroup
  // protocol buffer defined in api.proto.
  @property({type: Object})
  sessionGroup: any = null;
  @property({
    type: String,
  })
  _xType: string = vz_chart_helpers.XType.STEP;
  @property({
    type: Boolean,
  })
  _noMultiExperiments: boolean = false;
  // A Map mapping each of the sessionGroup's session's name
  // to its index in the group. Used by '_colorScale' to choose the color
  // of the plot of each session.
  @property({type: Object})
  _indexOfSession: any;
  // A tf.hparams.utils.hashOfString of sessionGroup.name. Used in
  // '_colorScale'.
  @property({type: Number})
  _sessionGroupNameHash: number;

  @property({
    type: Object,
  })
  _requestData: RequestDataCallback<
    RunTagItem,
    vz_chart_helpers.ScalarDatum[]
  > = (items, onLoad, onFinish) => {
    Promise.all(
      items.map((item) => {
        const request = {
          experimentName: this.experimentName,
          sessionName: item.run,
          metricName: item.tag,
        };
        return this.backend
          .listMetricEvals(request)
          .then((data) => void onLoad({item, data}));
      })
    ).finally(() => void onFinish());
  };

  @property({
    type: Object,
  })
  _colorScale = {
    scale: (seriesName) => {
      // The tf-scalar-card API sends a seriesName as a JSON
      // representation of the 2-element array [experiment, run],
      // where 'run' is the run we return in the 'requestData'
      // function--in our case that is the session name, and
      // 'experiment' is not used here tf-scalar-card's
      // multi-experiment attribute is turned off here).
      // The color of a session is determined by choosing a
      // starting point in 'palette' based on the sessionGroup name
      // and walking cyclicly 'sessionIndex' steps in the array, where
      // sesionIndex is the index of the session in the
      // group. We do this instead of just hashing the session name,
      // to guarantee that we don't repeat a color if the number
      // of sessions is at most the size of the palette.
      // Note that this method is called every time the user moves
      // over the metric plot, so it needs to be reasonably fast.
      const sessionName = (JSON.parse(seriesName) as any[])[1];
      const sessionIndex = this._indexOfSession.get(sessionName);
      const palette = tf_color_scale.standard;
      return palette[
        (this._sessionGroupNameHash + sessionIndex) % palette.length
      ];
    },
  };
  // Whenever the backend sends a new 'sessionGroups' array reply to the
  // ListSessionGroups RPC, we recreate the tf-session-group-detail
  // elements that correspond to session groups whose name is in the new
  // sessionGroups array. As such this element can be constructed when one
  // of its parents container is invisible: for example, if sessionGroups
  // was replaced when the user was on the parallel-coordinates view tab
  // and the new sessionGroups contains a session group object
  // whose metrics were open in the table view tab (i.e. the old
  // sessionGroups array contained a distinct JavaScript sessionGroup
  // object with same name).
  // If this happens, the tf-scalar-card child elements of this element
  // would measure a 0 size of their bounding boxes and would render
  // incorrectly. To avoid that, we listen for the 'iron-resize' event
  // that is fired by 'iron-pages' whenever the active page changes and
  // redraw each tf-scalar-card child.
  connectedCallback() {
    super.connectedCallback();
    (this as any).addEventListener('iron-resize', this.redraw.bind(this));
  }
  redraw() {
    this.shadowRoot?.querySelectorAll('tf-scalar-card').forEach((c) => {
      (c as any).redraw();
    });
  }
  @observe('sessionGroup.*')
  _sessionGroupChanged() {
    if (!this.sessionGroup || Object.keys(this.sessionGroup).length == 0) {
      this._indexOfSession = new Map();
      this._sessionGroupNameHash = 0;
    } else {
      this._indexOfSession = new Map(
        this.sessionGroup.sessions.map((session, index) => [
          session.name,
          index,
        ])
      );
      this._sessionGroupNameHash = tf_hparams_utils.hashOfString(
        this.sessionGroup.name
      );
    }
    // Reset each scalar-card by prodding 'tag'.
    // We do this so the card will reset its domain on the next load.
    this.shadowRoot?.querySelectorAll('tf-scalar-card').forEach((c) => {
      const anyCard = c as any;
      const tag = anyCard.get('tag');
      anyCard.set('tag', '');
      anyCard.set('tag', tag);
    });
  }
  _haveMetrics() {
    return (
      this.visibleSchema &&
      Array.isArray(this.visibleSchema.metricInfos) &&
      this.visibleSchema.metricInfos.length > 0
    );
  }
  _haveMetricsAndSessionGroup() {
    return this.sessionGroup && this._haveMetrics();
  }
  // Returns an array of the tensorboard 'runs' and 'tags' corresponding to
  // the given metric in each of the sessions in the given session group.
  _computeSeriesForSessionGroupMetric(sessionGroup, metricInfo) {
    if (
      sessionGroup === null ||
      Object.keys(sessionGroup).length == 0 ||
      metricInfo === null
    ) {
      return [];
    }
    return sessionGroup.sessions
      .filter(
        // If this session does not currently have a value for the given
        // metric then we don't want to include its run.
        (session) =>
          tf_hparams_utils.metricValueByName(
            session.metricValues,
            metricInfo.name
          ) !== undefined
      )
      .map(
        // Since the 'tag' and 'run' fields are essentially opaque
        // for the tf-scalar-card element, and passed as is to the
        // requestData function, we use them to encode the fields we
        // need to supply to the eval_metrics API (called in our
        // implementation of requestData above).
        (session) => ({tag: metricInfo.name, run: session.name})
      );
  }
  // Computes the tag-metadata attribute to send to the
  // tf-scalar-card element.
  _computeTagMetadata(metricInfo) {
    return {
      displayName: tf_hparams_utils.metricName(metricInfo),
      description: metricInfo.description || '',
    };
  }
}
