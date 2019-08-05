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

namespace memory_viewer_line_chart {
  Polymer({
    is: 'mv-line-chart',
    properties: {
      data: {
        type: Object,
        notify: true,
        observer: '_dataChanged',
      },
      active: {
        type: Object,
        notify: true,
        observer: '_renderSpans',
      },
      bufferSizes: {
        type: Array,
        notify: true,
      },
      unpaddedBufferSizes: {
        type: Array,
        notify: true,
      },
      maxHeap: {
        type: Array,
        notify: true,
      },
      maxHeapBySize: {
        type: Array,
        notify: true,
      },
      spanPlot: {
        type: Object,
        notify: true,
      },
      colorScale: {
        type: Object,
        notify: true,
      },
      _selectedEntityInSrcChart: {
        type: Object,
        notify: true,
        observer: '_selectedEntityChanged',
      },
      _selectedEntityInDstChart: {
        type: Object,
        notify: true,
        observer: '_selectedEntityChanged',
      },
      _symbolToEventCallback: {
        type: Object,
        value: () => new Map(),
      },
    },
    _makeChartDataset() {
      if (!this.data) {
        return;
      }
      this.bufferSizes = this.data.heapSizes.map((val, index) => [index, val]);
      this.unpaddedBufferSizes = this.data.unpaddedHeapSizes.map(
        (val, index) => [index, val]
      );
      let maxHeap = this.data.maxHeap;
      this.data.maxHeap.reduce(function(sum, item, i) {
        maxHeap[i]['offset'] = sum;
        return sum + item.sizeMiB;
      }, 0);
      this.maxHeap = maxHeap;
      let maxHeapBySize = this.data.maxHeapBySize;
      this.data.maxHeapBySize.reduce(function(sum, item, i) {
        maxHeapBySize[i]['offsetBySize'] = sum;
        return sum + item.sizeMiB;
      }, 0);
      this.maxHeapBySize = maxHeapBySize;
    },
    /**
     * Draw heap memory allocation line charts in program order. We also draw the
     * breakdown of peak heap allocation in program order and by size. The
     * position of the peak heap allocation is annotated on the graph. And an
     * additional span is plotted to indicate the life range of the logical buffer
     * allocation.
     */
    _drawProgramOrder() {
      if (!this.data) {
        return;
      }
      let xScale = new Plottable.Scales.Linear();
      let yScale = new Plottable.Scales.Linear();
      let xAxis = new Plottable.Axes.Numeric(xScale, 'bottom');
      let yAxis = new Plottable.Axes.Numeric(yScale, 'left');

      // Draw buffer sizes line.
      let bufferSizesLine = new Plottable.Plots.Line();
      bufferSizesLine.addDataset(new Plottable.Dataset(this.bufferSizes));
      bufferSizesLine
        .x(function(d) {
          return d[0];
        }, xScale)
        .y(function(d) {
          return d[1];
        }, yScale)
        .attr('stroke', 'red');

      let unpaddedBufferSizesLine = new Plottable.Plots.Line();
      unpaddedBufferSizesLine.addDataset(
        new Plottable.Dataset(this.unpaddedBufferSizes)
      );
      unpaddedBufferSizesLine
        .x(function(d) {
          return d[0];
        }, xScale)
        .y(function(d) {
          return d[1];
        }, yScale)
        .attr('stroke', 'grey');

      // Draw a band of width 10 to indicate the peak heap size location.
      let bandPlot = new Plottable.Plots.Rectangle();
      let bandWidth = this.bufferSizes.length / 40.0;
      bandPlot.addDataset(
        new Plottable.Dataset([
          this.bufferSizes[this.data.peakHeapSizePosition],
        ])
      );
      bandPlot
        .x(function(d) {
          return d[0] - bandWidth / 2.0;
        }, xScale)
        .y(function(d) {
          return 0;
        }, yScale)
        .x2(function(d) {
          return d[0] + bandWidth / 2.0;
        })
        .y2(function(d) {
          return d[1];
        })
        .attr('fill', 'red')
        .attr('opacity', 0.3);

      // Draw a span to indicate the life range of this buffer allocation.
      let colorScale = this.colorScale;
      let spanPlot = new Plottable.Plots.Rectangle();
      let logicalBufferSpans = this.data.logicalBufferSpans;
      let spans = this.maxHeap.map((item) => {
        const span = logicalBufferSpans[item.logicalBufferId];
        if (!span) return null;
        return {
          id: item.logicalBufferId,
          span: span,
          size: item.sizeMiB,
          color: item.color,
        };
      });
      spans = spans.filter((d) => d !== null);
      spanPlot.addDataset(new Plottable.Dataset(spans));
      spanPlot
        .x(function(d) {
          return d.span[0];
        }, xScale)
        .y(function(d) {
          return 0;
        }, yScale)
        .x2(function(d) {
          return d.span[1];
        })
        .y2(function(d) {
          return d.size;
        })
        .attr(
          'fill',
          function(d) {
            return (d.color % 10).toString();
          },
          colorScale
        )
        .attr('fill-opacity', 0);
      this.spanPlot = spanPlot;

      let cs = new Plottable.Scales.Color();
      cs.range(['red', 'grey']);
      cs.domain(['Sizes', 'Unpadded Sizes']);
      let legend = new Plottable.Components.Legend(cs);
      legend.maxEntriesPerRow(2);

      let gridlines = new Plottable.Components.Gridlines(xScale, yScale);

      let plots = new Plottable.Components.Group([
        bandPlot,
        bufferSizesLine,
        unpaddedBufferSizesLine,
        gridlines,
        spanPlot,
      ]);

      let table = new Plottable.Components.Table([
        [null, legend],
        [yAxis, plots],
        [null, xAxis],
      ]);

      let chartSelection = d3.select(this.$.chartdiv);
      chartSelection.selectAll('.component').remove();
      table.renderTo(chartSelection);
    },
    /**
     * Draw maxHeap stack boxes and add the interactions.
     */
    _drawMaxHeap() {
      let yScale = new Plottable.Scales.Linear();
      let xScale = new Plottable.Scales.Linear();

      let xAxis = new Plottable.Axes.Numeric(xScale, 'top');
      let yAxis = new Plottable.Axes.Numeric(yScale, 'left');

      let cs = this.colorScale;

      d3.select(this.$.maxheapchart)
        .selectAll('.component')
        .remove();
      d3.select(this.$.maxheapsizechart)
        .selectAll('.component')
        .remove();
      if (this._maxHeapChartMouseMoveKey) {
        this._unlisten(this._maxHeapChartMouseMoveKey);
        this._maxHeapChartMouseMoveKey = null;
      }

      if (this._maxHeapSizeChartMouseMoveKey) {
        this._unlisten(this._maxHeapSizeChartMouseMoveKey);
        this._maxHeapSizeChartMouseMoveKey = null;
      }

      let maxHeapChart = new Plottable.Plots.Rectangle();
      maxHeapChart
        .addDataset(new Plottable.Dataset(this.maxHeap))
        .x(function(d) {
          return d.offset;
        }, xScale)
        .y(function(d) {
          return 0;
        }, yScale)
        .x2(function(d) {
          return d.offset + d.sizeMiB;
        })
        .y2(function(d) {
          return 12;
        })
        .attr(
          'fill',
          function(d) {
            return (d.color % 10).toString();
          },
          cs
        )
        .attr('opacity', '0.6')
        .renderTo(d3.select(this.$.maxheapchart));

      let maxHeapSizeChart = new Plottable.Plots.Rectangle();
      maxHeapSizeChart
        .addDataset(new Plottable.Dataset(this.maxHeapBySize))
        .x(function(d) {
          return d.offsetBySize;
        }, xScale)
        .y(function(d) {
          return 0;
        }, yScale)
        .x2(function(d) {
          return d.offsetBySize + d.sizeMiB;
        })
        .y2(function(d) {
          return 12;
        })
        .attr(
          'fill',
          function(d) {
            return (d.color % 10).toString();
          },
          cs
        )
        .attr('opacity', '0.6')
        .renderTo(d3.select(this.$.maxheapsizechart));

      this._maxHeapChartMouseMoveKey = this._listen(
        this.$.maxheapchart,
        'mousemove',
        (event: MouseEvent) => {
          this._onHoverInteraction(
            event,
            maxHeapChart,
            maxHeapSizeChart,
            this.data.maxHeapToBySize
          );
        },
        {passive: true}
      );

      this._maxHeapSizeChartMouseMoveKey = this._listen(
        this.$.maxheapsizechart,
        'mousemove',
        (event: MouseEvent) => {
          this._onHoverInteraction(
            event,
            maxHeapSizeChart,
            maxHeapChart,
            this.data.bySizeToMaxHeap
          );
        },
        {passive: true}
      );
    },

    _listen(
      node: Node,
      eventName: string,
      callback: (event: MouseEvent) => void,
      options = null
    ): Symbol {
      const symbol = Symbol();
      node.addEventListener(eventName, callback, options);
      this._symbolToEventCallback.set(symbol, {
        eventName,
        node,
        callback,
        options,
      });
      return symbol;
    },

    _unlisten(symbol: Symbol): void {
      console.assert(
        this._symbolToEventCallback.has(symbol),
        'Cannot unlisten an unknown event'
      );
      const listenerKey = this._symbolToEventCallback.get(symbol);
      const {callback, eventName, node, options} = listenerKey;
      node.removeEventListener(eventName, callback, options);
    },

    /**
     * Highlights the item when mouse hovering over an item in the srcChart.
     * Also highlight the item in the other chart. Renders the buffer details.
     */
    _onHoverInteraction(
      event: MouseEvent,
      srcChart: Plottable.Plots.Rectangle<number, number>,
      dstChart: Plottable.Plots.Rectangle<number, number>,
      map
    ): void {
      const srcRootElement = srcChart.rootElement().node() as Element;
      const {left} = srcRootElement.getBoundingClientRect();
      const relativeX: number = event.clientX - left;
      const entities = srcChart.entities();
      const entity = entities.find((entity) => {
        const {x, width} = entity.bounds;
        return x <= relativeX && x + width >= relativeX;
      });
      if (!entity) {
        this._selectedEntityInSrcChart = null;
        this._selectedEntityInDstChart = null;
        this.active = null;
      } else {
        this.active = entity.datum;
        this._selectedEntityInSrcChart = entity;
        this._selectedEntityInDstChart = dstChart.entities()[map[entity.index]];
      }
    },
    /**
     * Highlights the newly selected entity and unhighlights the old one.
     */
    _selectedEntityChanged(newValue, oldValue) {
      if (oldValue) {
        oldValue.selection.attr('opacity', '0.6');
      }
      if (newValue) {
        newValue.selection.attr('opacity', '1.0');
      }
    },
    /**
     * Render the buffer life span on the line charts for the selected buffer.
     */
    _renderSpans(item) {
      if (!this.spanPlot) {
        return;
      }
      this.spanPlot.selections().attr('fill-opacity', '0');
      if (!item) {
        return;
      }
      this.spanPlot.entities().forEach(function(entity) {
        entity.selection.attr(
          'fill-opacity',
          entity.datum.id === item.logicalBufferId ? 1.0 : 0
        );
      });
    },
    /**
     * Redraw the chart.
     */
    _redraw: function() {
      if (!this.data) return;
      this.colorScale = new Plottable.Scales.Color('Category10');
      this._makeChartDataset();
      this._drawProgramOrder();
      this._drawMaxHeap();
    },
    /**
     * Redraw the chart when data changes.
     */
    _dataChanged(newData) {
      if (!newData) {
        return;
      }
      this._redraw();
    },
    attached: function() {
      this._redraw();
    },
  });
} // namespace memory_viewer_line_chart
