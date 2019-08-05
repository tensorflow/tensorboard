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
  Polymer({
    is: 'pod-viewer-dashboard',
    properties: {
      /**
       * @type {?podviewer.proto.PodViewerInputData}
       */
      data: {
        type: Object,
        observer: '_dataChanged',
      },
      /**
       * Active elements selected to be shown in the details card.
       */
      activeDetails: {
        type: Array,
        notify: true,
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
      _errorMessage: {
        type: String,
        computed: '_computeErrorMessage(_maxStepId)',
      },
      _runEnvironment: {
        type: Object,
        computed: '_computeRunEnvironment(data)',
      },
      _stepBreakdownLayers: {
        type: Object,
        value: () => [
          {key: 'highFlopsComputeUs', label: 'High flops compute'},
          {key: 'lowFlopsComputeUs', label: 'Low flops compute'},
          {key: 'hostInfeedDurationUs', label: 'Infeed'},
          {key: 'hostOutfeedDurationUs', label: 'Outfeed'},
          {key: 'allReduceComputeDurationUs', label: 'AllReduce compute'},
          {key: 'allReduceSyncDurationUs', label: 'AllReduce sync'},
          {key: 'sendDurationUs', label: 'Send'},
          {key: 'recvDurationUs', label: 'Recv'},
        ],
      },
      _podStatsMap: {
        type: Object,
        computed:
          '_computePodStatsMap(_podStatsMaps, curStepId, _stepBreakdownLayers)',
      },
      _stepStats: {
        type: Array,
        value: null,
        computed: '_computeStepStats(_podStatsMap)',
      },
      _channelDb: {
        type: Array,
        value: null,
        computed: '_computeChannelDb(_podStatsMap)',
      },
      _allReduceDb: {
        type: Array,
        value: null,
        computed: '_computeAllReduceDb(_podStatsMap)',
      },
      _channelLayers: {
        type: Array,
        value: () => [{key: 'durationUs', label: 'Duration (s)'}],
      },
      _allReduceLayers: {
        type: Array,
        value: () => [{key: 'durationUs', label: 'Duration (µs)'}],
      },
      _stepBreakdownFunc: {
        type: Object,
        value: () => (d) => `(${d.chipId}, ${d.nodeId})`,
      },
      _channelFunc: {
        type: Object,
        value: () => (d) => d.channelId,
      },
      _allReduceFunc: {
        type: Object,
        value: () =>
          function(d) {
            if (!d.name) return;
            const res = d.name.replace(/ll-reduce.|usion.|ll-reduce|usion/, '');
            return res.length > 1 ? res : res + '0';
          },
      },
    },
    _computePodStatsMaps(
      data: podviewer.proto.PodViewerInputData | undefined | null
    ): Array<podviewer.proto.PodStatsMap> {
      if (!data) return [];
      return data.podStatsSequence.podStatsMap;
    },
    _computeRunEnvironment(
      data: podviewer.proto.PodViewerInputData | undefined | null
    ): podviewer.proto.RunEnvironment {
      if (!data) return;
      return data.runEnvironment;
    },
    _computeMaxStepId(
      podStatsMaps: Array<podviewer.proto.PodStatsMap>
    ): number {
      return podStatsMaps.length - 1;
    },
    _computeErrorMessage(maxStepId: number): string {
      if (maxStepId >= 0) return '';
      return (
        'WARNING: No step time measured. ' +
        'This might happen if your profile duration is too short, ' +
        'try increase profile duration to cover a full step. ' +
        'If you have an inference job or not use TpuEstimator, ' +
        'please skip this tool.'
      );
    },
    /**
     * Calculate the lowFlopsComputeUs by deducting all other breakdown from the
     * total duration.
     */
    _populateLowFlopsCompute(
      podStatsMap: podviewer.proto.PodStatsMap | undefined,
      layers: Array<podviewer.proto.StackLayer>
    ): podviewer.proto.PodStatsMap {
      if (!podStatsMap || !layers) return;
      let podStatsPerCore = podStatsMap.podStatsPerCore;
      for (let coreId in podStatsPerCore) {
        let val = podStatsPerCore[coreId];
        if (val.hasOwnProperty('lowFlopsComputeUs')) {
          // already populated.
          return podStatsMap;
        }
        val['lowFlopsComputeUs'] = val.totalDurationUs;
        for (let j = 0; j < layers.length; j++) {
          if (j == 1) {
            continue;
          }
          // Input missing a field, set it to 0.
          if (!val[layers[j].key]) {
            val[layers[j].key] = 0;
          }
          // Skip the lowFlopsComputeUs.
          val['lowFlopsComputeUs'] -= val[layers[j].key];
        }
      }
      return podStatsMap;
    },
    _computePodStatsMap(
      podStatsMaps: Array<podviewer.proto.PodStatsMap>,
      curStepId: number,
      layers: Array<podviewer.proto.StackLayer>
    ): podviewer.proto.PodStatsMap {
      if (
        !podStatsMaps ||
        curStepId < 0 ||
        curStepId >= podStatsMaps.length ||
        !layers
      ) {
        return;
      }
      return this._populateLowFlopsCompute(podStatsMaps[curStepId], layers);
    },
    _computeStepStats(
      podStatsMap: podviewer.proto.PodStatsMap
    ): Array<podviewer.proto.PodStatsRecord> | undefined {
      if (!podStatsMap || !podStatsMap.podStatsPerCore) return;
      const obj = podStatsMap.podStatsPerCore;
      return Object.keys(obj)
        .map((key) => obj[key])
        .sort((a, b) => a.chipId - b.chipId);
    },
    _computeChannelDb(
      podStatsMap: podviewer.proto.PodStatsMap
    ): Array<podviewer.proto.ChannelInfo> | undefined {
      if (
        !podStatsMap ||
        !podStatsMap.channelDb ||
        podStatsMap.channelDb.length <= 0
      ) {
        return;
      }
      return podStatsMap.channelDb
        .slice()
        .sort((a, b) => b.durationUs - a.durationUs);
    },
    _computeAllReduceDb(
      podStatsMap: podviewer.proto.PodStatsMap
    ): Array<podviewer.proto.AllReduceOpInfo> | undefined {
      if (
        !podStatsMap ||
        !podStatsMap.allReduceOpDb ||
        podStatsMap.allReduceOpDb.length <= 0
      ) {
        return;
      }
      return podStatsMap.allReduceOpDb
        .slice()
        .sort((a, b) => b.durationUs - a.durationUs);
    },
    _dataChanged(newData: podviewer.proto.PodViewerInputData) {
      if (!newData) return;
      this.curStepId = 0;
    },
    /**
     * The active bar could be one of the PodStatsRecord, ChannelInfo or
     * AllReduceOpInfo. Reuse the details_card component to show any of these
     * details.
     */
    _activeBarChanged(newBar: any) {
      if (newBar) {
        this.activeDetails = [newBar];
      }
    },
    /**
     * Returns the step number of the current step.
     */
    _getStepNum(podStatsMap: podviewer.proto.PodStatsMap): number {
      return podStatsMap ? podStatsMap.stepNum : 0;
    },
  });
} // namespace pod_viewer_dashboard
