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
      observer:'_dataChanged'
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
    },
    spanPlot: {
      type:Object,
      notify:true,
    },
    colorScale: {
      type:Object,
      notify:true,
    },
  },
  _makeChartDataset() {
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
    let maxHeap = this.data.maxHeap;
    this.data.maxHeap.reduce(function(sum, item, i) {
        maxHeap[i]['offset'] = sum;
        return sum + item.data[0][0];
      }, 0);
    this.maxHeap = maxHeap;
    let maxHeapBySize = this.data.maxHeapBySize;
    this.data.maxHeapBySize.reduce(function(sum, item, i) {
        maxHeapBySize[i]['offsetBySize'] = sum;
        return sum + item.data[0][0];
      }, 0);
    this.maxHeapBySize = maxHeapBySize;
  },
  /**
   * Draw heap memory allocation line chart in program order.
   */
  _drawProgramOrder() {
    if (!this.data) { return;}
    let xScale = new Plottable.Scales.Linear();
    let yScale = new Plottable.Scales.Linear();
    let xAxis = new Plottable.Axes.Numeric(xScale, "bottom");
    let yAxis = new Plottable.Axes.Numeric(yScale, "left");

    let bufferSizesLine = new Plottable.Plots.Line();
    bufferSizesLine.addDataset(new Plottable.Dataset(this.bufferSizes));
    bufferSizesLine.x(function(d) {return d[0]; }, xScale)
                   .y(function(d) {return d[1]; }, yScale)
                   .attr("stroke", "#888888");

    let unpaddedBufferSizesLine = new Plottable.Plots.Line();
    unpaddedBufferSizesLine.addDataset(
        new Plottable.Dataset(this.unpaddedBufferSizes));
    unpaddedBufferSizesLine.x(function(d) {return d[0]; }, xScale)
                           .y(function(d) {return d[1]; }, yScale)
                           .attr("stroke", "#DE4406");

    let bandPlot = new Plottable.Plots.Rectangle();
    bandPlot.addDataset(
        new Plottable.Dataset(
          [this.bufferSizes[this.data.peakHeapSizePosition]]));
    bandPlot.x(function(d) { return d[0]; }, xScale)
            .y(function(d) { return 0; }, yScale)
            .x2(function(d) { return d[0] + 10; })
            .y2(function(d) { return d[1]; })
            .attr("fill", "#DE4406")
            .attr("opacity", 0.3);

    let colorScale = this.colorScale;
    let spanPlot = new Plottable.Plots.Rectangle();
    let logicalBufferSpans = this.data.logicalBufferSpans;
    let spans = this.maxHeap.map((item) => {
        const span = logicalBufferSpans[item.logicalBufferId];
        if (!span) return null;
        return {'id': item.logicalBufferId,
            'span': span,
            'size': item.data[0][0],
            'color': item.color};
            });
    spans = spans.filter(d => d !==null);
    spanPlot.addDataset(new Plottable.Dataset(spans));
    spanPlot.x(function(d) { return d.span[0]; }, xScale)
              .y(function(d) { return 0;}, yScale)
              .x2(function(d) { return d.span[1]; })
              .y2(function(d) { return d.size; })
              .attr('fill', function(d) { return (d.color % 10).toString(); },
                                          colorScale)
              .attr('fill-opacity', 0);

    this.spanPlot = spanPlot;

    let cs = new Plottable.Scales.Color();
    cs.range(["#888888", "#DE4406"]);
    cs.domain(["Sizes", "Unpadded Sizes"]);
    let legend = new Plottable.Components.Legend(cs);
    legend.maxEntriesPerRow(2);

    let gridlines = new Plottable.Components.Gridlines(xScale, yScale);

    let plots = new Plottable.Components.Group(
        [bandPlot, bufferSizesLine, unpaddedBufferSizesLine,
         gridlines, spanPlot]);

    let table = new Plottable.Components.Table([[null, legend],
                                               [yAxis, plots],
                                               [null, xAxis]]);

    table.renderTo(d3.select(this.$.chartdiv));
  },
  /**
   * Draw maxHeap stack boxes and add the interactions.
   */
  _drawMaxHeap() {
    let yScale = new Plottable.Scales.Linear();
    let xScale = new Plottable.Scales.Linear();

    let xAxis = new Plottable.Axes.Numeric(xScale, "top");
    let yAxis = new Plottable.Axes.Numeric(yScale, "left");

    let cs = this.colorScale;

    let maxHeapChart = new Plottable.Plots.Rectangle();

    maxHeapChart.addDataset(new Plottable.Dataset(this.maxHeap))
                .x(function(d) { return d.offset; }, xScale)
                .y(function(d) { return 0; }, yScale)
                .x2(function(d) { return d.offset + d.data[0][0]; })
                .y2(function(d) { return 12; })
                .attr('fill', function(d) {
                                return (d.color % 10).toString(); }, cs)
                .attr('opacity', '0.6')
                .renderTo(d3.select(this.$.maxheapchart));

    let maxHeapSizeChart = new Plottable.Plots.Rectangle();
    maxHeapSizeChart.addDataset(new Plottable.Dataset(this.maxHeapBySize))
                .x(function(d) { return d.offsetBySize; }, xScale)
                .y(function(d) { return 0; }, yScale)
                .x2(function(d) { return d.offsetBySize + d.data[0][0]; })
                .y2(function(d) { return 12; })
                .attr('fill', function(d) {
                                return (d.color % 10).toString(); }, cs)
                .attr('opacity', '0.6')
                .renderTo(d3.select(this.$.maxheapsizechart));

    const maxHeapToBySizeIndex = this.data.maxHeapToBySize;
    const bySizeToMaxHeapIndex = this.data.bySizeToMaxHeap;
    let parent = this;

    new Plottable.Interactions.Pointer()
    .attachTo(maxHeapChart)
    .onPointerMove(function(p) {
        let entity = maxHeapChart.entityNearest(p);
        maxHeapChart.selections().attr('opacity', '0.6');
        entity.selection.attr('opacity', '1');
        const maxHeapIndex = entity.index;
        const maxHeapBySizeIndex = maxHeapToBySizeIndex[maxHeapIndex];
        maxHeapSizeChart.selections().attr('opacity', '0.6');
        maxHeapSizeChart.entities()[maxHeapBySizeIndex]
                        .selection.attr('opacity', '1');
        parent._renderDetails(entity.datum);
    });

    new Plottable.Interactions.Pointer()
    .attachTo(maxHeapSizeChart)
    .onPointerMove(function(p) {
        let entity = maxHeapSizeChart.entityNearest(p);
        maxHeapSizeChart.selections().attr('opacity', '0.6');
        entity.selection.attr('opacity', '1.0');
        const maxHeapBySizeIndex = entity.index;
        const maxHeapIndex = bySizeToMaxHeapIndex[maxHeapBySizeIndex];
        maxHeapChart.selections().attr('opacity', '0.6');
        maxHeapChart.entities()[maxHeapIndex].selection.attr('opacity', '1.0');
        parent._renderDetails(entity.datum);
    });
  },
  /**
   * Render the buffer details card and annotate the span on the line charts.
   */
  _renderDetails(item) {
    this.spanPlot.selections().attr('fill-opacity', '0');
    this.spanPlot.entities().forEach(function(entity) {
        entity.selection.attr(
            'fill-opacity', entity.datum.id === item.logicalBufferId ? 0.5 : 0);
    });
    this.active = item;
  },
  /**
   * Redraw the chart when data changes.
   */
  _dataChanged:function() {
    if (!this.data) { return;}
    this.colorScale = new Plottable.Scales.Color("Category10");
    this._makeChartDataset();
    this._drawProgramOrder();
    this._drawMaxHeap();
  }
});

} // namespace memory_viewer
