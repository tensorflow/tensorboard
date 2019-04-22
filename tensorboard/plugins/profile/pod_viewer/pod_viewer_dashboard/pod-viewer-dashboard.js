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
var pod_viewer_dashboard;
(function (pod_viewer_dashboard) {
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
                value: function () { return [
                    { key: 'highFlopsComputeUs', label: 'High flops compute' },
                    { key: 'lowFlopsComputeUs', label: 'Low flops compute' },
                    { key: 'hostInfeedDurationUs', label: 'Infeed' },
                    { key: 'hostOutfeedDurationUs', label: 'Outfeed' },
                    { key: 'crsDurationUs', label: 'All reduce' },
                    { key: 'sendDurationUs', label: 'Send' },
                    { key: 'recvDurationUs', label: 'Recv' },
                ]; },
            },
            _podStatsMap: {
                type: Object,
                computed: '_computePodStatsMap(_podStatsMaps, curStepId, _stepBreakdownLayers)',
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
                value: function () { return [
                    { key: 'durationUs', label: 'Duration (s)' },
                ]; },
            },
            _allReduceLayers: {
                type: Array,
                value: function () { return [
                    { key: 'durationUs', label: 'Duration (µs)' },
                ]; },
            },
            _stepBreakdownFunc: {
                type: Object,
                value: function () { return function (d) { return "(" + d.chipId + ", " + d.nodeId + ")"; }; },
            },
            _channelFunc: {
                type: Object,
                value: function () { return function (d) { return d.channelId; }; },
            },
            _allReduceFunc: {
                type: Object,
                value: function () { return function (d) {
                    if (!d.name)
                        return;
                    var res = d.name.replace(/ll-reduce.|usion.|ll-reduce|usion/, '');
                    return res.length > 1 ? res : res + '0';
                }; },
            },
        },
        _computePodStatsMaps: function (data) {
            if (!data)
                return [];
            return data.podStatsSequence.podStatsMap;
        },
        _computeRunEnvironment: function (data) {
            return data.runEnvironment;
        },
        _computeMaxStepId: function (podStatsMaps) {
            return podStatsMaps.length - 1;
        },
        _computeErrorMessage: function (maxStepId) {
            if (maxStepId >= 0)
                return '';
            return "WARNING: No step time measured. "
                + "This might happen if your profile duration is too short, "
                + "try increase profile duration to cover a full step. "
                + "If you have an inference job or not use TpuEstimator, "
                + "please skip this tool.";
        },
        /**
         * Calculate the lowFlopsComputeUs by deducting all other breakdown from the
         * total duration.
         */
        _populateLowFlopsCompute: function (podStatsMap, layers) {
            if (!podStatsMap || !layers)
                return;
            var podStatsPerCore = podStatsMap.podStatsPerCore;
            for (var coreId in podStatsPerCore) {
                var val = podStatsPerCore[coreId];
                if (val.hasOwnProperty('lowFlopsComputeUs')) {
                    // already populated.
                    return podStatsMap;
                }
                val['lowFlopsComputeUs'] = val.totalDurationUs;
                for (var j = 0; j < layers.length; j++) {
                    if (j == 1) {
                        continue;
                    }
                    // Skip the lowFlopsComputeUs.
                    val['lowFlopsComputeUs'] -= val[layers[j].key];
                }
            }
            return podStatsMap;
        },
        _computePodStatsMap: function (podStatsMaps, curStepId, layers) {
            if (curStepId < 0 || curStepId >= podStatsMaps.length || !layers)
                return;
            return this._populateLowFlopsCompute(podStatsMaps[curStepId], layers);
        },
        _computeStepStats: function (podStatsMap) {
            if (!podStatsMap || !podStatsMap.podStatsPerCore)
                return;
            var obj = podStatsMap.podStatsPerCore;
            return Object.keys(obj).map(function (key) { return obj[key]; })
                .sort(function (a, b) { return a.chipId - b.chipId; });
        },
        _computeChannelDb: function (podStatsMap) {
            if (!podStatsMap || !podStatsMap.channelDb
                || podStatsMap.channelDb.length <= 0) {
                return;
            }
            return podStatsMap.channelDb.slice()
                .sort(function (a, b) { return b.durationUs - a.durationUs; });
        },
        _computeAllReduceDb: function (podStatsMap) {
            if (!podStatsMap || !podStatsMap.allReduceOpDb
                || podStatsMap.allReduceOpDb.length <= 0) {
                return;
            }
            return podStatsMap.allReduceOpDb.slice()
                .sort(function (a, b) { return b.durationUs - a.durationUs; });
        },
        _dataChanged: function (newData) {
            if (!newData)
                return;
            this.curStepId = 0;
        },
        /**
         * Updates the input of the details card when selected channel changed.
         */
        _selectedChannelChanged: function (newChannel) {
            if (newChannel) {
                this.activeDetails = newChannel;
            }
        },
        /**
         * The active bar could be one of the PodStatsRecord, ChannelInfo or
         * AllReduceOpInfo. Reuse the details_card component to show any of these
         * details.
         */
        _activeBarChanged: function (newBar) {
            if (newBar) {
                this.activeDetails = [newBar];
            }
        },
        /**
         * Returns the step number of the current step.
         */
        _getStepNum: function (podStatsMap) {
            return podStatsMap ? podStatsMap.stepNum : 0;
        },
    });
})(pod_viewer_dashboard || (pod_viewer_dashboard = {})); // namespace pod_viewer_dashboard
