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
var memory_viewer_xla;
(function (memory_viewer_xla) {
    /**
     * HLO buffer allocation representation.
     * @final
     */
    var BufferAllocation = /** @class */ (function () {
        function BufferAllocation(alloc) {
            this.index = parseInt(alloc.index, 10);
            this.size = parseInt(alloc.size, 10);
            this.isThreadLocal = alloc.isThreadLocal || false;
            this.assigned = alloc.assigned.map(function (assigned) { return new memory_viewer_xla.BufferAllocationAssigned(assigned); });
            this.groupName = this.getGroupName(alloc);
        }
        BufferAllocation.prototype.getGroupName = function (alloc) {
            if (alloc.isEntryComputationParameter) {
                return 'Parameter';
            }
            else {
                if (alloc.maybeLiveOut) {
                    return 'Output';
                }
                else {
                    if (alloc.isThreadLocal) {
                        return 'Thread-local';
                    }
                    else {
                        return 'Temporary';
                    }
                }
            }
        };
        return BufferAllocation;
    }());
    memory_viewer_xla.BufferAllocation = BufferAllocation;
})(memory_viewer_xla || (memory_viewer_xla = {})); // namespace memory_viewer_xla
