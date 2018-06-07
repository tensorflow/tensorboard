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

namespace memory_viewer {

Polymer({
  is:'mv-line-chart',
  properties:{
    data:{
      type:Object,
      notify:true,
      observer:'dataChanged_'
    },
    active:{
      type:Object,
      notify:true,
    },
    bufferSizes:{
      type:Array,
      notify:true,
    },
    unpaddedBufferSizes:{
      type:Array,
      notify:true,
    },
    maxHeap:{
      type:Array,
      notify:true,
    },
    maxHeapBySize:{
      type:Array,
      notify:true,
    }
  }, 
  makeChartDataset_() {
    if (!this.data) { return;}
    let bufferSizes = [];
    let unpaddedBufferSizes = [];
    const N = this.data.heapSizes.length;
    if (this.data.unpaddedHeapSizes.length !== N) {
      console.error('Heap sizes not match.');
      return;
    }
    for (let i = 0; i < N; i++) {
      bufferSizes.push([i, this.data.heapSizes[i]]);
      unpaddedBufferSizes.push([i, this.data.unpaddedHeapSizes[i]]);
    }
    this.bufferSizes = bufferSizes;
    this.unpaddedBufferSizes = unpaddedBufferSizes;
    this.maxHeap = this.data.maxHeap;
    this.maxHeapBySize = this.data.maxHeapBySize;
  }, 
  /**
   * Draw heap memory allocation line chart in program order.
   */
  drawProgramOrder_(linePoints?: number[][], color?: number) {
    if (!this.data) { return;}
    let chartData = [];
    chartData = [{'data':this.bufferSizes,
                  'label':'Size'
                 }, 
                 {'data':this.unpaddedBufferSizes,
                  'label':'Unpadded Size'
                 },
                ];
    if (linePoints) {
      chartData.push({
                      'data':[linePoints[0]],
                      'color':color,
                      'bars': {
                               show:true,
                               fill:true,
                               barWidth:linePoints[1][0] - linePoints[0][0],
                              }
                     });
    }
    const options = {
                     series:{points:{show:false}},
                     grid:{
                           markings:[{xaxis:{from:this.data.peakHeapSizePosition, to:this.data.peakHeapSizePosition + 10}}]}};
    //this.$.plot(this.$('#lc-placeholder'), chartData, options);
  }, 
  /**
   * Draw heap memory allocation line chart in program order.
   */
  renderDetails_(item) {
    const itemMiB = item.data[0][0];
    const span = this.data.logicalBufferSpans[item.logicalBufferId];
    if (span) {
      let linePoints = [[span[0], itemMiB], [span[1], itemMiB]];
      this.drawProgramOrder_(linePoints, item.color);
    }
    this.active = item;
  }, 
  /**
   * Redraw the chart when data changes.
   */
  dataChanged_:function() {
    if (!this.data) { return;}
    this.makeChartDataset_();
    this.drawProgramOrder_();
    /*let maxHeapPlaceholder = this.$.plot(this.$('#maxheap-placeholder'), this.maxHeap, {series:{stack:true, lines:{show:false}, bars:{show:true, barWidth:0.6, horizontal:true}}, grid:{hoverable:true}, legend:{show:false}, yaxis:{ticks:[], max:0.6}});
    let maxHeapSizePlaceholder = this.$.plot(this.$('#maxheap-size-placeholder'), this.maxHeapBySize, {series:{stack:true, lines:{show:false}, bars:{show:true, barWidth:0.6, horizontal:true}}, grid:{hoverable:true}, legend:{show:false}, yaxis:{ticks:[], max:0.6}});
    let parent = this;
    const maxHeapToBySizeIndex = this.data.maxHeapToBySize;
    const bySizeToMaxHeapIndex = this.data.bySizeToMaxHeap;
    this.$('#maxheap-placeholder').bind('plothover', 
      function(event, pos, item) {
      if (!item) { return;}
      const maxHeapIndex = item.seriesIndex;
      const maxHeapBySizeIndex = maxHeapToBySizeIndex[maxHeapIndex];
      maxHeapSizePlaceholder.unhighlight();
      maxHeapSizePlaceholder.highlight(maxHeapBySizeIndex, 0);
      const heapItem = parent.maxHeap[maxHeapIndex];
      parent.renderDetails_(heapItem);
    });
    this.$('#maxheap-size-placeholder').bind('plothover', 
      function(event, pos, item) {
      if (!item) { return;}
      const maxHeapBySizeIndex = item.seriesIndex;
      const maxHeapIndex = bySizeToMaxHeapIndex[maxHeapBySizeIndex];
      maxHeapPlaceholder.unhighlight();
      maxHeapPlaceholder.highlight(maxHeapIndex, 0);
      const heapItem = parent.maxHeapBySize[maxHeapBySizeIndex];
      parent.renderDetails_(heapItem);
    });*/
  }
});

} // namespace memory_viewer
