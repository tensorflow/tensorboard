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

namespace pod_viewer_dashboard {

Polymer({
  is: 'pod-viewer-dashboard',
  properties: {
    _data: {
      type: Object,
      notify: true,
    },
    podStats: {
      type: Object,
      notify: true,
      observer: 'podStatsChanged_',
    },
    stepStats: {
      type: Array,
      value: null,
      notify: true,
    },
    channelDb: {
      type: Array,
      value: null,
      notify: true,
    },
    allReduceDb: {
      type: Array,
      value: null,
      notify: true,
    },
    stepBreakdownEle: {
      type: Array,
      notify: true,
    },
    channelEle: {
      type: Array,
      notify: true,
    },
    allReduceEle: {
      type: Array,
      notify: true,
    },
    stepBreakdownFunc: {
      type: Object,
      notify: true,
    },
    channelFunc: {
      type: Object,
      notify: true,
    },
    allReduceFunc: {
      type: Object,
      notify: true,
    },
    runEnvironment: {
      type: Object,
      notify: true,
    },
    curStepId: {
      type: Number,
      value: 0,
      observer: 'stepChanged_',
    },
    maxStepId: {
      type: Number,
    },
    stepNum: {
      type: Number,
      computed: 'getStepNum(podStats)',
    },
    selectedChipId: {
      type: Number,
      value: -1,
      notify: true,
    },
    selectedChannel: {
      type: Array,
      notify: true,
      observer: 'selectedChannelChanged_',
    },
    activeBarChartEle: {
      type: Object,
      notify: true,
      observer: 'activeBarChartEleChanged_',
    },
    hloInfoMap: {
      type: Object,
      notify: true,
    },
    active: {
      type: Array,
      value: () => [],
      notify: true,
    },
    ready_: {
      type: Boolean,
      value: false,
    },
  },
  observers: [
    'dataChanged_(_data, ready_)',
  ],
  /**
   * Updates the UI when new data is loaded.
   */
  dataChanged_(newData, ready) {
    if (!newData || !ready) {
      return;
    }
    this.maxStepId = newData.podStatsSequence.podStatsMap.length - 1;
    this.curStepId = 0;
    if (this.maxStepId > 0) {
      this.podStats = this.populateLowFlopsCompute_(
        newData.podStatsSequence.podStatsMap['0']);
    }
    this.runEnvironment = newData.runEnvironment;
    this.hloInfoMap = newData.hloInfoMap;
  },
  /**
   * Updates the UI when curStepId changes.
   */
  stepChanged_(newStep: number) {
    if (!this._data) {
      return;
    }
    if (newStep > this.maxStepId) {
      return;
    }
    this.podStats = this.populateLowFlopsCompute_(
      this._data.podStatsSequence.podStatsMap[newStep.toString()]);
  },
  /**
   * Updates the input of the details card when selected channel changed.
   */
  selectedChannelChanged_(newChannel) {
    if (!newChannel) {
      return;
    }
    this.active = newChannel;
  },
  activeBarChartEleChanged_(newEle) {
    if (!newEle) {
      return;
    }
    this.active = [newEle];
  },
  populateLowFlopsCompute_(podStats) {
    if (!podStats || !this.ready_) return null;
    let podStatsPerCore = podStats['podStatsPerCore'];
    for (let i in podStatsPerCore) {
      let val = podStatsPerCore[i];
      if (val.hasOwnProperty('lowFlopsComputeUs')) {
        // already populated.
        return;
      }
      // lowFlopsComputeUs is calculated by deducting all other breakdown from
      // the total duration.
      val['lowFlopsComputeUs'] = val.totalDurationUs;
      for (let j = 0; j < this.stepBreakdownEle.length; j++) {
        if (j == 1) {
          continue;
        }
        // Skip the lowFlopsComputeUs.
        val['lowFlopsComputeUs'] -= val[this.stepBreakdownEle[j].key];
      }
    }
   return podStats;
  },
  /**
   * Updates the data sent to stack bar chart when pod stats changed.
   */
  podStatsChanged_(newStats) {
    if (!newStats) {
      return;
    }
    let stepStats = [];
    for (const i in newStats['podStatsPerCore']) {
      stepStats.push(newStats['podStatsPerCore'][i]);
    }
    stepStats.sort((a, b) => a.chipId - b.chipId);
    this.stepStats = stepStats;
    if (newStats['channelDb'].length > 0) {
      this.channelDb = newStats['channelDb'].sort(
          (a, b) => b.durationUs - a.durationUs);
    }
    if (newStats['allReduceOpDb'].length > 0) {
      this.allReduceDb = newStats['allReduceOpDb'].sort(
          (a, b) => b.durationUs - a.durationUs);
    }
  },
  /**
   * Returns the step number of the current step.
   */
  getStepNum(podStats): number {
    return parseInt(podStats.stepNum, 10);
  },
  ready() {
    this.stepBreakdownEle = [
      {key: 'highFlopsComputeUs', label: 'High flops compute'},
      {key: 'lowFlopsComputeUs', label: 'Low flops compute'},
      {key: 'hostInfeedDurationUs', label: 'Infeed'},
      {key: 'hostOutfeedDurationUs', label: 'Outfeed'},
      {key: 'crsDurationUs', label: 'All reduce'},
      {key: 'sendDurationUs', label: 'Send'},
      {key: 'recvDurationUs', label: 'Recv'}
    ];
    this.channelEle = [{key: 'durationUs', label: 'Duration (us)'}];
    this.allReduceEle = [{key: 'durationUs', label: 'Duration (us)'}];
    this.stepBreakdownFunc = (d) => {
      return '(' + d.chipId + ',' + d.nodeId + ')';
    };
    this.channelFunc = (d) => d.channelId;
    this.allReduceFunc = function(d) {
      const res = d.name.replace(/ll-reduce.|usion.|ll-reduce|usion/, '');
      return res.length > 1 ? res : res + '0';
    };
    this.ready_ = true;
  }
});

} // namespace pod_viewer_dashboard
