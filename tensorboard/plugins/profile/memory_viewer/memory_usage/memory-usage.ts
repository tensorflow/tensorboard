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

namespace memory_viewer_usage {

/**
 * Provides calculation of memory usage from xla buffer assignment.
 * @final
 */
export class MemoryUsage {
  private buffers_: memory_viewer_xla_lb.LogicalBuffer[] = [];
  private idToBuffer_: {
    [key: number]: memory_viewer_xla_lb.LogicalBuffer} = {};
  private idToBufferAllocation_: {
    [key: number]: memory_viewer_xla_ba.BufferAllocation} = {};
  private nameToHlo_: {
    [key: string]: memory_viewer_xla_hi.HloInstruction} = {};
  private unSeenLogicalBuffers_: Set<number>;
  private seenBufferAllocations_: Set<number>;
  private nColor_: number = 0;
  private rest_: number = 0;

  peakHeapSizeBytes: number = 0;
  unpaddedPeakHeapSizeBytes: number = 0;
  peakLogicalBuffers: number[] = [];
  peakHeapSizePosition: number = 0;
  indefiniteMemoryUsageBytes: number = 0;
  heapSizes: number[] = [];
  unpaddedHeapSizes: number[] = [];
  maxHeap: {[key: string]: any}[] = [];
  maxHeapBySize: {[key: string]: any}[] = [];
  bySizeToMaxHeap: number[] = [];
  maxHeapToBySize: number[] = [];
  logicalBufferSpans: {[key: number]: number[]} = {};

  /**
   * Byte size within which we collapse buffer entries for the max-heap
   * display.
   */
  smallBufferSize: number;

  /**
   * @param json Json message that contains the hloModule,
   *     hloOrdering and bufferAssignment.
   */
  constructor(json) {
    this.unSeenLogicalBuffers_ = new Set();
    this.seenBufferAllocations_ = new Set();
    this.smallBufferSize = 16 * 1024;
    this.initHloInstructions_(json.hloModule);
    this.initMemoryUsage_(json.bufferAssignment);
    this.initMaxHeap_();
  }

  /**
   * Constructs a mapping from name to HLO instruction.
   */
  private initHloInstructions_(hloModule) {
    if (!hloModule) {
      console.warn(
          'Missing hloModule, skipping unpadded allocation size analysis');
      return;
    }
    for (const comp of hloModule.computations) {
      for (const inst of comp.instructions) {
        if (inst.name) {
          this.nameToHlo_[inst.name] =
            new memory_viewer_xla_hi.HloInstruction(inst);
        }
      }
    }
  }

  /**
   * Initializes memory usage of the module.
   */
  private initMemoryUsage_(bufferAssignment) {
    if (!bufferAssignment) {
      console.error('No buffer assignment info');
      return;
    }
    this.initBuffers_(bufferAssignment);
    this.initAllocations_(bufferAssignment);
    this.findPeakMemoryUsage_(bufferAssignment);
  }

  /**
   * Creates a sorted buffer list and an id to buffer map from
   * `bufferAssignment`.
   */
  private initBuffers_(bufferAssignment) {
    for (let jsonBuffer of bufferAssignment.logicalBuffers) {
      const buffer = new memory_viewer_xla_lb.LogicalBuffer(jsonBuffer);
      this.buffers_.push(buffer);
      this.idToBuffer_[buffer.id] = buffer;
      this.unSeenLogicalBuffers_.add(buffer.id);
    }
  }

  /**
   * Creates a logical buffer id to buffer allocation map from
   * `bufferAssignment`.
   */
  private initAllocations_(bufferAssignment) {
    for (const jsonAlloc of bufferAssignment.bufferAllocations) {
      const alloc = new memory_viewer_xla_ba.BufferAllocation(jsonAlloc);
      for (const assigned of jsonAlloc.assigned) {
        if (assigned.logicalBufferId) {
          this.idToBufferAllocation_[assigned.logicalBufferId] = alloc;
        }
      }
    }
  }

  /**
   * Creates a heap object that is displayed in a plot in the memory
   * visualization.
   */
  private newHeapObject_(
      color: number, buffer: memory_viewer_xla_lb.LogicalBuffer,
      shape: memory_viewer_xla_s.Shape,
      inst: memory_viewer_xla_hi.HloInstruction,
      groupName: string): {[key: string] : any} {
    const unpaddedSize =
        shape ? memory_viewer_utils.bytesToMiB(
          shape.unpaddedHeapSizeBytes()) : 0;
    const dict = {
      'instructionName': buffer.instructionName,
      'logicalBufferId': buffer.id,
      'unpaddedSizeMiB': unpaddedSize,
      'tfOpName': inst.tfOpName,
      'opcode': inst.opcode,
      'sizeMiB': memory_viewer_utils.bytesToMiB(buffer.size),
      'color': color,
      'shape': shape ? shape.humanStringWithLayout() : '',
      'groupName': groupName,
    };
    return dict;
  }

  /**
   * Adds the logical buffer as an element in the maxHeap with constitutent
   * logical buffers. If the logical buffer size is smaller than the specified
   * small buffer size, return the size without adding into the maxHeap.
   * Otherwise, return 0.
   */
  private addHeapObject_(parent: any,
      buffer: memory_viewer_xla_lb.LogicalBuffer, groupName: string) {
    if (buffer.size <= parent.smallBufferSize) {
      parent.rest_ += buffer.size;
      return;
    }
    if (!buffer.instructionName) {
      return;
    }
    const inst = parent.nameToHlo_[buffer.instructionName];
    if (!inst) {
      return;
    }
    const shape = inst.shape.resolveShapeIndex(buffer.shapeIndex);
    parent.maxHeap.push(
        parent.newHeapObject_(parent.nColor_++, buffer, shape, inst, groupName));
  }

  /**
   * Accumulate data for use in a stacked bar plot.
   * We accumulate it in "program order" -- the order in which it was placed
   * into the logical_buffers sequence above was program order, and we iterate
   * that order to create data points.
   **/
  private initMaxHeap_() {
    for (const id of this.peakLogicalBuffers) {
      const alloc = this.idToBufferAllocation_[id];
      const groupName = alloc ? alloc.groupName : '';
      this.addHeapObject_(this, this.idToBuffer_[id], groupName);
    }
    if (this.rest_ != 0) {
      const small = 'small (<' + this.smallBufferSize / 1024 + ' KiB)';
      this.maxHeap.push({
        'instructionName': small,
        'sizeMiB': memory_viewer_utils.bytesToMiB(this.rest_),
        'color': 0,
        'groupName': small
      });
    }
    let indexedMaxHeap = this.maxHeap.map(function(e, i) {
      return {ind: i, val: e};
    });
    indexedMaxHeap.sort((a, b) => b.val.sizeMiB - a.val.sizeMiB);
    this.maxHeapBySize = indexedMaxHeap.map(function(e) {
      return e.val;
    });
    this.bySizeToMaxHeap = indexedMaxHeap.map(function(e) {
      return e.ind;
    });
    this.maxHeapToBySize.length = this.maxHeap.length;
    for (let i = 0; i < this.bySizeToMaxHeap.length; i++) {
      this.maxHeapToBySize[this.bySizeToMaxHeap[i]] = i;
    }
  }

  /**
   * Finds the peak memory usage from the `bufferAssignment`.
   */
  private findPeakMemoryUsage_(bufferAssignment) {
    let heapSizes: number[] = [];
    let unpaddedHeapSizes: number[] = [];
    let logicalBuffers: number[] = [];
    let peakLogicalBuffers: number[] = [];
    let heapSizeBytes = 0;
    let unpaddedHeapSizeBytes = 0;
    let peakHeapSizeBytes = 0;

    // Unpadded size at peak.
    let unpaddedPeakHeapSizeBytes = 0;
    let peakHeapSizePosition = 0;
    for (const event of bufferAssignment.heapSimulatorTraces[0].events) {
      heapSizes.push(memory_viewer_utils.bytesToMiB(heapSizeBytes));
      unpaddedHeapSizes.push(memory_viewer_utils.bytesToMiB(
        unpaddedHeapSizeBytes));
      const eventId = parseInt(event.bufferId, 10);
      const buffer = this.idToBuffer_[eventId];
      this.unSeenLogicalBuffers_.delete(eventId);
      const alloc = this.idToBufferAllocation_[eventId];
      if (alloc) {
        this.seenBufferAllocations_.add(alloc.index);
      }
      let shape = null;
      if (buffer.instructionName && buffer.instructionName != '') {
        shape = this.nameToHlo_[buffer.instructionName].shape.resolveShapeIndex(
            buffer.shapeIndex);
      }
      switch (event.kind.toString()) {
        case 'ALLOC':
          logicalBuffers.push(eventId);
          heapSizeBytes += buffer.size;

          // Caculates the unpadded heap size when we have shape info.
          if (shape) {
            unpaddedHeapSizeBytes += shape.unpaddedHeapSizeBytes();
          }
          this.logicalBufferSpans[eventId] = [heapSizes.length, -1];
          if (heapSizeBytes > peakHeapSizeBytes) {
            peakHeapSizeBytes = heapSizeBytes;
            unpaddedPeakHeapSizeBytes = unpaddedHeapSizeBytes;
            // The next element to be pushed to heapSizes is the maxium.
            peakHeapSizePosition = heapSizes.length;
            peakLogicalBuffers = logicalBuffers.slice();
          }
          break;
        case 'FREE':
          logicalBuffers = logicalBuffers.filter((item) => {
            return item !== eventId;
          });
          heapSizeBytes -= buffer.size;
          if (shape) {
            unpaddedHeapSizeBytes -= shape.unpaddedHeapSizeBytes();
          }
          this.logicalBufferSpans[eventId][1] = heapSizes.length;
          if (heapSizeBytes < 0) {
            console.error('heap_size_bytes < 0');
          }
          break;
        case 'SHARE_WITH':

          // Nothing to do, but note we've seen the shared thing.
          this.unSeenLogicalBuffers_.delete(
              parseInt(event.shareWithCanonicalId, 10));
          break;
        default:
          console.log('ERROR: unknown heap event kind:', event);
          break;
      }
    }

    heapSizes.push(memory_viewer_utils.bytesToMiB(heapSizeBytes));
    const indefiniteMemoryUsageBytes =
        this.findIndefiniteMemoryUsage_(this.unSeenLogicalBuffers_);
    this.peakHeapSizeBytes = peakHeapSizeBytes + indefiniteMemoryUsageBytes;
    this.unpaddedPeakHeapSizeBytes =
        unpaddedPeakHeapSizeBytes + indefiniteMemoryUsageBytes;
    this.peakLogicalBuffers = peakLogicalBuffers;
    this.peakHeapSizePosition = peakHeapSizePosition;
    const addend = memory_viewer_utils.bytesToMiB(indefiniteMemoryUsageBytes);
    this.heapSizes = heapSizes.map((item) => {
      return item + addend;
    });
    this.unpaddedHeapSizes = unpaddedHeapSizes.map((item) => {
      return item + addend;
    });
  }

  /**
   * Calculate the indefinite memory usage from the unseen logical buffers.
   * Assume they have indefinite lifetime if they are not in thread-local buffer
   * allocations.
   */
  private findIndefiniteMemoryUsage_(buffers: Set<number>): number {
    let indefiniteMemoryUsageBytes = 0;
    buffers.forEach((id) => {
      const alloc = this.idToBufferAllocation_[id];
      if (alloc.isThreadLocal) {
        return;
      }
      if (!this.seenBufferAllocations_.has(alloc.index)) {
        this.seenBufferAllocations_.add(alloc.index);
        indefiniteMemoryUsageBytes += alloc.size;

        // Show the logical buffer assiciated with this buffer allocation.
        this.addHeapObject_(this, this.idToBuffer_[id], alloc.groupName);
      }
    });
    this.indefiniteMemoryUsageBytes = indefiniteMemoryUsageBytes;
    return indefiniteMemoryUsageBytes;
  }
}

} // namespace memory_viewer_usage
