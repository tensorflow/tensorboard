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

interface StepBreakdownNode {
  /* Examples 'highFlopsComputeUs', 'lowFlopsComputeUs', 'Send', 'Recv'*/
  [key: string]: number;
  totalDurationUs: number;
}

Polymer({
  is: 'details-card',
  properties: {
    nodes: {
      type: Array,
      notify: true,
      observer: 'updateCard_',
    },
    name: {
      type: String,
      value: null,
    },
    id: {
      type: Number,
    },
    utilization: {
      type: Number,
    },
    isChannel: {
      type: Boolean,
      value: false,
    },
    isAllReduce: {
      type: Boolean,
      value: false,
    },
    hasReplicaGroups: {
      type: Boolean,
      value: false,
    },
    isStepBreakdown: {
      type: Boolean,
      value: false,
    },
    stepBreakdownLayers: {
      type: Array,
      value: () => { return [
          {key: 'highFlopsComputeUs', label: 'High flops compute'},
          {key: 'lowFlopsComputeUs', label: 'Low flops compute'},
          {key: 'hostInfeedDurationUs', label: 'Infeed'},
          {key: 'hostOutfeedDurationUs', label: 'Outfeed'},
          {key: 'crsDurationUs', label: 'All reduce'},
          {key: 'sendDurationUs', label: 'Send'},
          {key: 'recvDurationUs', label: 'Recv'},]; },
    },
  },
  /**
   * Update the details card.
   */
  updateCard_: function(nodes) {
    if (!nodes || nodes.length == 0) return;
    this.isChannel = false;
    this.isAllReduce = false;
    this.isStepBreakdown = false;
    this.hasReplicaGroups = false;
    if (nodes[0].channelId) {
      this.name = 'Channel #';
      this.id = nodes[0].channelId;
      this.isChannel = true;
    } else if (nodes[0].hostName) {
      this.name = 'Step breakdown of chip';
      this.id = nodes[0].chipId;
      this.isStepBreakdown = true;
    } else if (nodes[0].replicaGroups) {
      this.name = nodes[0].name;
      this.id = null;
      this.isAllReduce = true;
      this.hasReplicaGroups = nodes[0].replicaGroups.length;
    }
  },
  /**
   * Converts from number of bytes to MiB.
   */
  bytesToMiB_: function(numBytes: number): number {
    return numBytes / 1048576;
  },
  /**
   * Return the formatted data size in MiB.
   */
  sizeMiB_: function(dataSize: undefined|number): string {
    if (!dataSize) {
      return '';
    }
    return this.format_(this.bytesToMiB_(dataSize));
  },
  /**
   * Return the formatted link bandwidth in GiB/s.
   * The link bandwidth here is defined by the data size transferred over the
   * duration between the start of the send operation to the end of the
   * recv-done operation.
   */
  bw_: function(dataSize: undefined|number, duration: undefined|number):
      string {
        if (!dataSize || !duration) {
          return '';
        }
        return this.format_(dataSize / duration / 1073.74);
      },
  /**
   * Return the chip id given the global core id.
   */
  chipId_: function(coreId: undefined|number): number {
    if (!coreId) {
      return 0;
    }
    return Math.floor(coreId / 2);
  },
  /**
   * Return the node ordinal given the global core id.
   */
  nodeId_: function(coreId: undefined|number): number {
    if (!coreId) {
      return 0;
    }
    return coreId & 1;
  },
  /**
   * Format a number with two digits after the decimal point.
   */
  format_: function(number: undefined|number): string {
    return number == null ? '' : number.toFixed(2);
  },
  /**
   * Return a formatted value associated with a specific breakdown.
   */
  getStepBreakdownValue_: function(node: undefined | StepBreakdownNode,
                                   key: undefined|string): string {
    if (!key || !node) {
      return '';
    }
    return this.format_(node[key]);
  },
  /**
   * Return a the percentage of a specific breakdown.
   */
  getStepBreakdownPct_: function(node: undefined | StepBreakdownNode,
                                 key: undefined|string): string {
    if (!key || !node || !node.totalDurationUs) {
      return '';
    }
    return (node[key] / node.totalDurationUs * 100).toFixed(2) + '%';
  },
});

} // namespace pod_viewer_details_card
