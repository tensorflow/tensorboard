/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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

interface PodStatsSequence {
  podStatsMap: any,
}[];

interface PodViewerInputData {
  podStatsSequence: PodStatsSequence,
  runEnvironment?: any,
}

Polymer({
  is: 'pod-viewer-dashboard',
  properties: {
    /**
     * @type {?PodViewerInputData}
     */
    data: {
      type: Object,
      value: () => ({}),
      observer: '_dataChanged',
      notify: true,
    },
    /**
     * Active elements selected to be shown in the details card.
     */
    activeDetails: {
      type: Array,
      notify: true,
    },
    selectedChannel: {
      type: Array,
      notify: true,
      observer: '_selectedChannelChanged',
    },
    activeBar: {
      type: Object,
      notify: true,
      observer: '_activeBarChanged',
    },
    curStepId: {
      type: Number,
      value: 0,
    },
    _podStatsMaps: {
      type: Object,
      computed: '_computePodStatsMaps(data)',
    },
    _maxStepId: {
      type: Number,
      computed: '_computeMaxStepId(_podStatsMaps)',
    },
    _error_message: {
      type: String,
      computed: '_computeErrorMessage(_maxStepId)',
    },
    _runEnvironment: {
      type: Object,
      computed: '_computeRunEnvironment(data)',
    },
    _stepBreakdownLayers: {
      type: Array,
      value: () => { return [
          {key: 'highFlopsComputeUs', label: 'High flops compute'},
          {key: 'lowFlopsComputeUs', label: 'Low flops compute'},
          {key: 'hostInfeedDurationUs', label: 'Infeed'},
          {key: 'hostOutfeedDurationUs', label: 'Outfeed'},
          {key: 'crsDurationUs', label: 'All reduce'},
          {key: 'sendDurationUs', label: 'Send'},
          {key: 'recvDurationUs', label: 'Recv'}]; },
    },
    _podStats: {
      type: Object,
      computed:
          '_computePodStats(_podStatsMaps, curStepId, _stepBreakdownLayers)',
    },
    _stepStats: {
      type: Array,
      computed: '_computeStepStats(_podStats)',
    },
    _channelDb: {
      type: Array,
      computed: '_computeChannelDb(_podStats)',
    },
    _allReduceDb: {
      type: Array,
      computed: '_computeAllReduceDb(_podStats)',
    },
    _channelLayers: {
      type: Array,
      value: () => { return [{key: 'durationUs', label: 'Duration (us)'}]; },
    },
    _allReduceLayers: {
      type: Array,
      value: () => { return [{key: 'durationUs', label: 'Duration (us)'}]; },
    },
    _stepBreakdownFunc: {
      type: Object,
      value: (d) => (d) => `(${d.chipId}, ${d.nodeId})`,
    },
    _channelFunc: {
      type: Object,
      value: (d) => (d) => d.channelId,
    },
    _allReduceFunc: {
      type: Object,
      value: (d) => function(d) {
               if (!d.name) return '';
               const res =
                   d.name.replace(/ll-reduce.|usion.|ll-reduce|usion/, '');
               return res.length > 1 ? res : res + '0';
             },
    },
  },
  _computePodStatsMaps(data : PodViewerInputData|undefined|null) : any[] {
    if (!data) return [];
    return data.podStatsSequence.podStatsMap;
  },
  _computeRunEnvironment(data: PodViewerInputData|undefined|null) : any {
    return data.runEnvironment;
  },
  _computeMaxStepId(podStatsMaps : any[]) : number {
    return podStatsMaps.length - 1;
  },
  _computeErrorMessage(maxStepId: number) : string {
    if (maxStepId >= 0) { return ''; }
    return "WARNING: No step time measured. "
           + "This might happen if your profile duration is too short, "
           + "try increase profile duration to cover a full step. "
           + "If you have an inference job or not use TpuEstimator, "
           + "please skip this tool.";
  },
  _computePodStats(podStatsMaps : any[], curStepId: number,
                   stepBreakdown: any[]) : any {
    if (curStepId < 0 || curStepId >= podStatsMaps.length || !stepBreakdown) {
      return null;
    }
    return this._populateLowFlopsCompute(
               podStatsMaps[curStepId], stepBreakdown);
  },
  _computeStepStats(podStats) {
    if (!podStats || !podStats['podStatsPerCore']) return null;
    let stepStats = [];
    for (const i in podStats['podStatsPerCore']) {
      stepStats.push(podStats['podStatsPerCore'][i]);
    }
    stepStats.sort((a, b) => a.chipId - b.chipId);
    return stepStats;
  },
  _computeChannelDb(podStats) {
    if (!podStats || !podStats.channelDb || podStats.channelDb.length <=0 ) {
      return null;
    }
    return podStats.channelDb.sort((a, b) => b.durationUs - a.durationUs);
  },
  _computeAllReduceDb(podStats) {
    if (!podStats || !podStats.allReduceOpDb
        || podStats.allReduceOpDb.length <=0) {
      return null;
    }
    return podStats.allReduceOpDb.sort((a, b) => b.durationUs - a.durationUs);
  },
  _dataChanged(newData) {
    if (!newData) { return; }
    this.curStepId = 0;
  },
  /**
   * Updates the input of the details card when selected channel changed.
   */
  _selectedChannelChanged(newChannel) {
    if (newChannel) {
      this.activeDetails = newChannel;
    }
  },
  _activeBarChanged(newBar) {
    if (newBar) {
      this.activeDetails = [newBar];
    }
  },
  /**
   * Calculate the lowFlopsComputeUs by deducting all other breakdown from the
   * total duration.
   */
  _populateLowFlopsCompute(podStats, layers) {
    if (!podStats || !layers) return null;
    let podStatsPerCore = podStats['podStatsPerCore'];
    for (let i in podStatsPerCore) {
      let val = podStatsPerCore[i];
      if (val.hasOwnProperty('lowFlopsComputeUs')) {
        // already populated.
        return;
      }
      val['lowFlopsComputeUs'] = val.totalDurationUs;
      for (let j = 0; j < layers.length; j++) {
        if (j == 1) {
          continue;
        }
        // Skip the lowFlopsComputeUs.
        val['lowFlopsComputeUs'] -= val[layers[j].key];
      }
    }
   return podStats;
  },
  /**
   * Returns the step number of the current step.
   */
  _getStepNum(podStats): string {
    return podStats ? podStats.stepNum : '';
  },
});

} // namespace pod_viewer_dashboard
