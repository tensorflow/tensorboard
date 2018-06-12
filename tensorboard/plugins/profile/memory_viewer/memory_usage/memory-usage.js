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
var memory_viewer;
(function (memory_viewer) {
    /**
     * Provides calculation of memory usage from xla buffer assignment.
     * @final
     */
    var MemoryUsage = /** @class */ (function () {
        /**
         * @param json Json message that contains the hloModule,
         *     hloOrdering and bufferAssignment.
         */
        function MemoryUsage(json) {
            this.buffers_ = [];
            this.idToBuffer_ = {};
            this.idToBufferAllocation_ = {};
            this.nameToHlo_ = {};
            this.nColor_ = 0;
            this.rest_ = 0;
            this.peakHeapSizeBytes = 0;
            this.unpaddedPeakHeapSizeBytes = 0;
            this.peakLogicalBuffers = [];
            this.peakHeapSizePosition = 0;
            this.indefiniteMemoryUsageBytes = 0;
            this.heapSizes = [];
            this.unpaddedHeapSizes = [];
            this.maxHeap = [];
            this.maxHeapBySize = [];
            this.bySizeToMaxHeap = [];
            this.maxHeapToBySize = [];
            this.logicalBufferSpans = {};
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
        MemoryUsage.prototype.initHloInstructions_ = function (hloModule) {
            if (!hloModule) {
                console.warn('Missing hloModule, skipping unpadded allocation size analysis');
                return;
            }
            for (var _i = 0, _a = hloModule.computations; _i < _a.length; _i++) {
                var comp = _a[_i];
                for (var _b = 0, _c = comp.instructions; _b < _c.length; _b++) {
                    var inst = _c[_b];
                    if (inst.name) {
                        this.nameToHlo_[inst.name] = new memory_viewer.HloInstruction(inst);
                    }
                }
            }
        };
        /**
         * Initializes memory usage of the module.
         */
        MemoryUsage.prototype.initMemoryUsage_ = function (bufferAssignment) {
            if (!bufferAssignment) {
                console.error('No buffer assignment info');
                return;
            }
            this.initBuffers_(bufferAssignment);
            this.initAllocations_(bufferAssignment);
            this.findPeakMemoryUsage_(bufferAssignment);
        };
        /**
         * Creates a sorted buffer list and an id to buffer map from
         * `bufferAssignment`.
         */
        MemoryUsage.prototype.initBuffers_ = function (bufferAssignment) {
            for (var _i = 0, _a = bufferAssignment.logicalBuffers; _i < _a.length; _i++) {
                var jsonBuffer = _a[_i];
                var buffer = new memory_viewer.LogicalBuffer(jsonBuffer);
                this.buffers_.push(buffer);
                this.idToBuffer_[buffer.id] = buffer;
                this.unSeenLogicalBuffers_.add(buffer.id);
            }
        };
        /**
         * Creates a logical buffer id to buffer allocation map from
         * `bufferAssignment`.
         */
        MemoryUsage.prototype.initAllocations_ = function (bufferAssignment) {
            for (var _i = 0, _a = bufferAssignment.bufferAllocations; _i < _a.length; _i++) {
                var jsonAlloc = _a[_i];
                var alloc = new memory_viewer.BufferAllocation(jsonAlloc);
                for (var _b = 0, _c = jsonAlloc.assigned; _b < _c.length; _b++) {
                    var assigned = _c[_b];
                    if (assigned.logicalBufferId) {
                        this.idToBufferAllocation_[assigned.logicalBufferId] = alloc;
                    }
                }
            }
        };
        /**
         * Creates a heap object that is displayed in a plot in the memory
         * visualization.
         */
        MemoryUsage.prototype.newHeapObject_ = function (color, buffer, shape, inst, groupName) {
            var unpaddedSize = shape ? memory_viewer.bytesToMiB(shape.unpaddedHeapSizeBytes()) : 0;
            var dict = {
                'instructionName': buffer.instructionName,
                'logicalBufferId': buffer.id,
                'unpaddedSizeMiB': unpaddedSize,
                'tfOpName': inst.tfOpName,
                'opcode': inst.opcode,
                'sizeMiB': memory_viewer.bytesToMiB(buffer.size),
                'color': color,
                'shape': shape ? shape.humanStringWithLayout() : '',
                'groupName': groupName,
            };
            return dict;
        };
        /**
         * Adds the logical buffer as an element in the maxHeap with constitutent
         * logical buffers. If the logical buffer size is smaller than the specified
         * small buffer size, return the size without adding into the maxHeap.
         * Otherwise, return 0.
         */
        MemoryUsage.prototype.addHeapObject_ = function (parent, buffer, groupName) {
            if (buffer.size <= parent.smallBufferSize) {
                parent.rest_ += buffer.size;
                return;
            }
            if (!buffer.instructionName) {
                return;
            }
            var inst = parent.nameToHlo_[buffer.instructionName];
            if (!inst) {
                return;
            }
            var shape = inst.shape.resolveShapeIndex(buffer.shapeIndex);
            parent.maxHeap.push(parent.newHeapObject_(parent.nColor_++, buffer, shape, inst, groupName));
        };
        /**
         * Accumulate data for use in a stacked bar plot.
         * We accumulate it in "program order" -- the order in which it was placed
         * into the logical_buffers sequence above was program order, and we iterate
         * that order to create data points.
         **/
        MemoryUsage.prototype.initMaxHeap_ = function () {
            for (var _i = 0, _a = this.peakLogicalBuffers; _i < _a.length; _i++) {
                var id = _a[_i];
                var alloc = this.idToBufferAllocation_[id];
                var groupName = alloc ? alloc.groupName : '';
                this.addHeapObject_(this, this.idToBuffer_[id], groupName);
            }
            if (this.rest_ != 0) {
                var small = 'small (<' + this.smallBufferSize / 1024 + ' KiB)';
                this.maxHeap.push({
                    'instructionName': small,
                    'sizeMiB': memory_viewer.bytesToMiB(this.rest_),
                    'color': 0,
                    'groupName': small
                });
            }
            var indexedMaxHeap = this.maxHeap.map(function (e, i) {
                return { ind: i, val: e };
            });
            indexedMaxHeap.sort(function (a, b) { return b.val.sizeMiB - a.val.sizeMiB; });
            this.maxHeapBySize = indexedMaxHeap.map(function (e) {
                return e.val;
            });
            this.bySizeToMaxHeap = indexedMaxHeap.map(function (e) {
                return e.ind;
            });
            this.maxHeapToBySize.length = this.maxHeap.length;
            for (var i = 0; i < this.bySizeToMaxHeap.length; i++) {
                this.maxHeapToBySize[this.bySizeToMaxHeap[i]] = i;
            }
        };
        /**
         * Finds the peak memory usage from the `bufferAssignment`.
         */
        MemoryUsage.prototype.findPeakMemoryUsage_ = function (bufferAssignment) {
            var heapSizes = [];
            var unpaddedHeapSizes = [];
            var logicalBuffers = [];
            var peakLogicalBuffers = [];
            var heapSizeBytes = 0;
            var unpaddedHeapSizeBytes = 0;
            var peakHeapSizeBytes = 0;
            // Unpadded size at peak.
            var unpaddedPeakHeapSizeBytes = 0;
            var peakHeapSizePosition = 0;
            var _loop_1 = function (event_1) {
                heapSizes.push(memory_viewer.bytesToMiB(heapSizeBytes));
                unpaddedHeapSizes.push(memory_viewer.bytesToMiB(unpaddedHeapSizeBytes));
                var eventId = parseInt(event_1.bufferId, 10);
                var buffer = this_1.idToBuffer_[eventId];
                this_1.unSeenLogicalBuffers_.delete(eventId);
                var alloc = this_1.idToBufferAllocation_[eventId];
                if (alloc) {
                    this_1.seenBufferAllocations_.add(alloc.index);
                }
                var shape = null;
                if (buffer.instructionName && buffer.instructionName != '') {
                    shape = this_1.nameToHlo_[buffer.instructionName].shape.resolveShapeIndex(buffer.shapeIndex);
                }
                switch (event_1.kind.toString()) {
                    case 'ALLOC':
                        logicalBuffers.push(eventId);
                        heapSizeBytes += buffer.size;
                        // Caculates the unpadded heap size when we have shape info.
                        if (shape) {
                            unpaddedHeapSizeBytes += shape.unpaddedHeapSizeBytes();
                        }
                        this_1.logicalBufferSpans[eventId] = [heapSizes.length, -1];
                        if (heapSizeBytes > peakHeapSizeBytes) {
                            peakHeapSizeBytes = heapSizeBytes;
                            unpaddedPeakHeapSizeBytes = unpaddedHeapSizeBytes;
                            // The next element to be pushed to heapSizes is the maxium.
                            peakHeapSizePosition = heapSizes.length;
                            peakLogicalBuffers = logicalBuffers.slice();
                        }
                        break;
                    case 'FREE':
                        logicalBuffers = logicalBuffers.filter(function (item) {
                            return item !== eventId;
                        });
                        heapSizeBytes -= buffer.size;
                        if (shape) {
                            unpaddedHeapSizeBytes -= shape.unpaddedHeapSizeBytes();
                        }
                        this_1.logicalBufferSpans[eventId][1] = heapSizes.length;
                        if (heapSizeBytes < 0) {
                            console.error('heap_size_bytes < 0');
                        }
                        break;
                    case 'SHARE_WITH':
                        // Nothing to do, but note we've seen the shared thing.
                        this_1.unSeenLogicalBuffers_.delete(parseInt(event_1.shareWithCanonicalId, 10));
                        break;
                    default:
                        console.log('ERROR: unknown heap event kind:', event_1);
                        break;
                }
            };
            var this_1 = this;
            for (var _i = 0, _a = bufferAssignment.heapSimulatorTraces[0].events; _i < _a.length; _i++) {
                var event_1 = _a[_i];
                _loop_1(event_1);
            }
            heapSizes.push(memory_viewer.bytesToMiB(heapSizeBytes));
            var indefiniteMemoryUsageBytes = this.findIndefiniteMemoryUsage_(this.unSeenLogicalBuffers_);
            this.peakHeapSizeBytes = peakHeapSizeBytes + indefiniteMemoryUsageBytes;
            this.unpaddedPeakHeapSizeBytes =
                unpaddedPeakHeapSizeBytes + indefiniteMemoryUsageBytes;
            this.peakLogicalBuffers = peakLogicalBuffers;
            this.peakHeapSizePosition = peakHeapSizePosition;
            var addend = memory_viewer.bytesToMiB(indefiniteMemoryUsageBytes);
            this.heapSizes = heapSizes.map(function (item) {
                return item + addend;
            });
            this.unpaddedHeapSizes = unpaddedHeapSizes.map(function (item) {
                return item + addend;
            });
        };
        /**
         * Calculate the indefinite memory usage from the unseen logical buffers.
         * Assume they have indefinite lifetime if they are not in thread-local buffer
         * allocations.
         */
        MemoryUsage.prototype.findIndefiniteMemoryUsage_ = function (buffers) {
            var _this = this;
            var indefiniteMemoryUsageBytes = 0;
            buffers.forEach(function (id) {
                var alloc = _this.idToBufferAllocation_[id];
                if (alloc.isThreadLocal) {
                    return;
                }
                if (!_this.seenBufferAllocations_.has(alloc.index)) {
                    _this.seenBufferAllocations_.add(alloc.index);
                    indefiniteMemoryUsageBytes += alloc.size;
                    // Show the logical buffer assiciated with this buffer allocation.
                    _this.addHeapObject_(_this, _this.idToBuffer_[id], alloc.groupName);
                }
            });
            this.indefiniteMemoryUsageBytes = indefiniteMemoryUsageBytes;
            return indefiniteMemoryUsageBytes;
        };
        return MemoryUsage;
    }());
    memory_viewer.MemoryUsage = MemoryUsage;
})(memory_viewer || (memory_viewer = {})); // namespace memory_viewer
