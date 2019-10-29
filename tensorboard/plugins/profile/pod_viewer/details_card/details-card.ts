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

namespace pod_viewer_details_card {
  type DetailNode =
    | podviewer.proto.ChannelInfo
    | podviewer.proto.PodStatsRecord
    | podviewer.proto.AllReduceOpInfo;

  Polymer({
    is: 'details-card',
    properties: {
      nodes: {
        type: Array,
      },
      _name: {
        type: String,
        computed: '_computeName(nodes)',
      },
      stepBreakdownLayers: {
        type: Array,
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
    },
    _isAllReduce(node: DetailNode): node is podviewer.proto.AllReduceOpInfo {
      return (<podviewer.proto.AllReduceOpInfo>node).replicaGroups != undefined;
    },
    _isChannel(node: DetailNode): node is podviewer.proto.ChannelInfo {
      return (<podviewer.proto.ChannelInfo>node).channelId != undefined;
    },
    _isStep(node: DetailNode): node is podviewer.proto.PodStatsRecord {
      return (<podviewer.proto.PodStatsRecord>node).hostName != undefined;
    },
    _hasReplicaGroups(node: podviewer.proto.AllReduceOpInfo): boolean {
      return node.replicaGroups && node.replicaGroups.length > 0;
    },
    _computeName: function(nodes: Array<DetailNode>): string | undefined {
      if (!nodes || nodes.length == 0) return;
      const node = nodes[0];
      if (this._isChannel(node)) {
        return 'Channel # ' + (<podviewer.proto.ChannelInfo>node).channelId;
      } else if (this._isAllReduce(node)) {
        return (<podviewer.proto.AllReduceOpInfo>node).name;
      } else if (this._isStep(node)) {
        return (
          'Step breakdown of chip ' +
          (<podviewer.proto.PodStatsRecord>node).chipId +
          ', core ' +
          (<podviewer.proto.PodStatsRecord>node).nodeId
        );
      }
      return;
    },
    /**
     * Converts from number of bytes to MiB.
     */
    _bytesToMiB: function(numBytes: number): number {
      return numBytes / 1048576;
    },
    /**
     * Return the formatted data size in MiB.
     */
    _sizeMiB: function(dataSize: undefined | number): string | undefined {
      if (!dataSize) return;
      return this._format(this._bytesToMiB(dataSize));
    },
    /**
     * Return the formatted link bandwidth in GiB/s.
     * The link bandwidth here is defined by the data size transferred over the
     * duration between the start of the send operation to the end of the
     * recv-done operation.
     */
    _bandwidth: function(
      dataSize: undefined | number,
      duration: undefined | number
    ): string | undefined {
      if (!dataSize || !duration) return;
      return this._format(dataSize / duration / 1073.74);
    },
    /**
     * Return the chip id given the global core id.
     */
    _chipId: function(coreId: number): number {
      return Math.floor(coreId / 2);
    },
    /**
     * Return the node ordinal given the global core id.
     */
    _nodeId: function(coreId: number): number {
      return coreId & 1;
    },
    /**
     * Format a number with two digits after the decimal point.
     */
    _format: function(number: undefined | number): string {
      return number == null ? '' : number.toFixed(2);
    },
    /**
     * Return a formatted value associated with a specific breakdown.
     */
    _getStepBreakdownValue: function(
      node: undefined | podviewer.proto.PodStatsRecord,
      key: undefined | string
    ): string | undefined {
      if (!key || !node) return;
      return this._format(node[key] ? node[key] : 0);
    },
    /**
     * Return a the percentage of a specific breakdown.
     */
    _getStepBreakdownPct: function(
      node: undefined | podviewer.proto.PodStatsRecord,
      key: undefined | string
    ): string | undefined {
      if (!key || !node || !node.totalDurationUs || !node[key]) return;
      return ((node[key] / node.totalDurationUs) * 100).toFixed(2) + '%';
    },
  });
} // namespace pod_viewer_details_card
