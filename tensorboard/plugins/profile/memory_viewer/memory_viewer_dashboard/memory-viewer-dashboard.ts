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

namespace memory_viewer_dashboard {

Polymer({
  is:'memory-viewer-dashboard',
  properties:{
    // Data is XLA HloProto in JSON format.
    _data:{
      type:Object,
      notify:true,
      observer:'dataChanged_'
    },
    hloModule_:{
      type:Object
    },
    moduleName_:{
      type:String
    },
    peakHeapSizeMiB_:{
      type:String
    },
    unpaddedPeakHeapSizeMiB_:{
      type:String
    },
    usage:{
      type:Object,
      notify:true
    },
    active: {
      type: Object,
      notify: true,
      value: null,
    },
  },
  dataChanged_(newData) {
    if (newData && newData.hloModule && newData.bufferAssignment) {
      this.hloModule_ = newData.hloModule;
      this.moduleName_ = this.hloModule_.name ? this.hloModule_.name : '';
      this.usage = new memory_viewer_usage.MemoryUsage(newData);
      this.peakHeapSizeMiB_ = memory_viewer_utils.bytesToMiB(
        this.usage.peakHeapSizeBytes).toFixed(2);
      this.unpaddedPeakHeapSizeMiB_ = memory_viewer_utils.bytesToMiB(
        this.usage.unpaddedPeakHeapSizeBytes).toFixed(2);
    }
  }
});

} // namespace memory_viewer_dashboard
