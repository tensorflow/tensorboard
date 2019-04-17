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

module tpu.profiler.podviewer.proto {
  /**
   * Describes the replica groups in an all-reduce op (e.g., all-reduce and
   * all-to-all).
   */
  export interface ReplicaGroup {
    /**
     * The ids of the replicas that belongs to the same group. The ordering of
     * the ids matters in some op (e.g., all-to-all).
     */
    replicaIds: Array<number>;
  }

  /**
   * Pod system topology, which describes the number of chips in a pod
   * and the connectivity style.
   */
  export interface SystemTopology {
    /**
     * The X, Y, and Z dimensions of this topology. 0 means that dimension does
     *  not exist.
     */
    xDimension: number;
    yDimension: number;
    zDimension?: number;
  }

  /**
   * The run environment of a profiling session.
   */
  export interface RunEnvironment {
    /** Number of hosts used. */
    hostCount?: number;
    /** The type of TPU used. */
    tpuType: string;
    /** The number of TPU cores used. */
    tpuCoreCount?: number;
    /** Pod system topology. */
    topology: SystemTopology;
  }

  /**
   * Performance and extra info on all-reduce ops.
   */
  export interface AllReduceOpInfo {
    /** Name of this op. */
    name: number;
    /** Number of times this op occurred.
    occurrences: number;
    /**
     * Time in microseconds spent on this op (averaged across all of its
     * occurrences).
     */
    durationUs: number;
    /** Byte size of data transferred. */
    dataSize: number;
    /** Replica groups. */
    replicaGroups: Array<ReplicaGroup>;
  }

  /** There is one PodStatsRecord for each step traced on each TPU node. */
  export interface PodStatsRecord {
    /** The host name where the trace was collected. */
    hostName: string;
    /** The TPU global chip id where the trace was collected. */
    chipId: number;
    /** The TPU node id where the trace was collected. */
    nodeId: number;
    /** The step number. */
    stepNum: number;
    /** The step duration in micro-seconds. */
    totalDurationUs: number;
    /**
     * The time spent running high flops ops, such as convolution and output
     * fusion.
     */
    highFlopsComputeUs: number;
    /** The time spent on infeed from host to TPU core in micro-seconds. */
    hostInfeedDurationUs: number;
    /** The time spent on outfeed from TPU core to host in micro-seconds. */
    hostOutfeedDurationUs: number;
    /** The time spent on send operations. */
    sendDurationUs: number;
    /** The time spent on recv operations. */
    recvDurationUs: number;
    /**
     * The time spent on all-reduce in micro-seconds
     * (used to be cross-replica-sum).
     */
    crsDurationUs: number;
    /** bottleneck out of the above mentioned metrics. */
    bottleneck: number;
  }

  /**
   * Performance and extra info in a training step across all cores.
   */
  export interface PodStatsMap {
    /** Step number */
    stepNum: number;
    /** A map from core_id to PodStatsRecord. */
    podStatsPerCore: Array<{[key: number]: PodStatsRecord}>;
    /** Send and receive channel info. */
    channelDb: Array<ChannelInfo>;
    /**
     * A map from core ID to program replica id. Replica id map could change
     * during a profile session, but should stay stable within a step.
     */
    coreIdToReplicaIdMap: Array<{[key: number]: number}>;
    /** All-reduce op info. */
    allReduceOpDb: Array<AllReduceOpInfo>;
  }

  /** A sequence of PodStatsMap for each step. */
  export interface PodStatsSequence {
    podStatsMap: Array<PodStatsMap>;
  }

  /** Information about a send and recv channel. */
  export interface ChannelInfo {
    /** Id of the channel. */
    channelId: number;
    /** Core id of the send op. */
    srcCoreId: number;
    /** Core id of the recv op. */
    dstCoreId: number;
    /** Byte size of the data transferred. */
    dataSize: number;
    /**
     * Duration from the beginning of the send op to the end of the recv-done
     * op in microseconds.
     */
    duraionUs: number;
    /** Number of occurrences of a channel. */
    occurrences: number;
    /** Percentage of the link bandwidth used over the peak link bandwidth. */
    utilization: number;
    /** A list of hlo names associated with this channel id. */
    hloNames: Array<string>;
    /**
     * Duration from the beginning of the recv-done to the beginning of send in
     * microseconds. If the recv-done op starts after the beginning of the send
     * op, the delay is zero.
     */
    sendDelayUs: number;
    /** The replica_id of the program executing the send and recv ops. */
    replicaId: number;
  }

  /** Data input to the pod viewer tool. */
  export interface PodViewerInputData {
    /** Pod level stats for each step. */
    podStatsSequence: PodStatsSequence;
    /** Job run environment, including number of hosts used, type of TPU used. */
    runEnvironment: RunEnvironment;
  }
}
