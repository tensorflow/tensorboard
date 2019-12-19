import {PolymerElement, html} from '@polymer/polymer';
import {customElement, property, observe} from '@polymer/decorators';
import * as d3 from 'd3';
import * as _ from 'lodash';
import * as Plottable from 'plottable';
import {PointerInteraction} from '../vz_chart_helpers/plottable-interactions';
import {
  GenericTooltipColumn,
  Datum,
} from '../vz_chart_helpers/vz-chart-helpers';

interface D3Entry<T> {
  key: string;
  value: T;
}

type BarChartTooltipColumn = GenericTooltipColumn<D3Entry<Bar>>;

/**
 * Encapsulates information for a single bar to rendered onto the chart.
 */
export interface Bar {
  // The label on the X-axis for this bar.
  x: string;
  // The height of the bar.
  y: number;
}

@customElement('vz-bar-chart')
class VzBarChart extends PolymerElement {
  static readonly template = html`
    <div id="tooltip">
      <table>
        <thead>
          <tr id="tooltip-table-header-row"></tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
    <div id="chartdiv"></div>
    <style include="plottable-style"></style>
    <style>
      :host {
        -webkit-user-select: none;
        -moz-user-select: none;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        flex-shrink: 1;
        position: relative;
        outline: none;
      }
      div {
        -webkit-user-select: none;
        -moz-user-select: none;
        flex-grow: 1;
        flex-shrink: 1;
      }
      td {
        padding-left: 5px;
        padding-right: 5px;
        font-size: 13px;
        opacity: 1;
      }
      #tooltip {
        pointer-events: none;
        position: absolute;
        opacity: 0;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        font-size: 14px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 4px;
        line-height: 1.4em;
        padding: 8px;
        z-index: 5;
        cursor: none;
        margin-top: 10px;
      }
      .swatch {
        border-radius: 50%;
        width: 14px;
        height: 14px;
        display: block;
        border: 2px solid rgba(0, 0, 0, 0);
      }
      .closest .swatch {
        border: 2px solid white;
      }
      th {
        padding-left: 5px;
        padding-right: 5px;
        text-align: left;
      }
    </style>
  `;

  /**
   * How to feed data to the bar chart.
   *
   * Each key within the `data` object corresponds to a data series,
   * each of which is associated with its own color of bars.
   *
   * Each entry within a list corresponds to an X-axis label (the string
   * 'x' property) and bar height (The numeric 'y' property).
   *
   * Example:
   * data = {'series0':[{ x: 'a', y: 1 }, { x: 'c', y: 3 }, { x: 'b', y: 2 }],
   *        'series1':[{ x: 'a', y: 4 }, { x: 'g', y: 3 }, { x: 'e', y: 5 }]}
   *
   * This will generate a Plottable ClusteredBar chart with two series and
   * 5 distinct classes ('a', 'b', 'c', 'g', 'e').
   */
  @property({type: Object})
  data!: {[id: string]: Bar[]};

  /**
   * How to feed optional overlaid lines into the bar chart.
   *
   * Each key within the `lines` object corresponds to a data series,
   * each of which is associated with its own line color.
   *
   * Each entry within a list corresponds to an X-axis label (the string
   * 'x' property) and line's y value (The numeric 'y' property).
   *
   * Example:
   * lines = {'series0':[{ x: 'a', y: 1 }, { x: 'b', y: 3 }],
   *          'series1':[{ x: 'a', y: 4 }, { x: 'b', y: 3 }]}
   *
   * This will generate a Plottable line chart with two series over the
   * ClusteredBar chart created for the `data` object.
   */
  @property({
    type: Object,
  })
  lines: {[id: string]: Bar[]} = {};

  @property({
    type: Object,
  })
  colorScale = new Plottable.Scales.Color().range(d3.schemeCategory10.slice());

  @property({
    type: Object,
  })
  linesColorScale = new Plottable.Scales.Color().range(
    d3.schemeCategory10.slice()
  );

  @property({
    type: Array,
  })
  tooltipColumns: BarChartTooltipColumn[] = [
    {
      title: 'Name',
      evaluate: function(d) {
        return d.key;
      },
    },
    {
      title: 'X',
      evaluate: function(d) {
        return d.value.x;
      },
    },
    {
      title: 'Y',
      evaluate: function(d) {
        return String(d.value.y);
      },
    },
  ];

  @property({type: Boolean})
  _attached: boolean = false;

  @property({type: Object})
  _chart: BarChart | null = null;

  /**
   * Re-renders the chart. Useful if e.g. the container size changed.
   */
  redraw() {
    if (this._chart) {
      this._chart.redraw();
    }
  }

  attached() {
    this._attached = true;
  }
  detached() {
    this._attached = false;
  }

  /**
   * Creates a chart, and asynchronously renders it. Fires a chart-rendered
   * event after the chart is rendered.
   */
  @observe(
    'data',
    'lines',
    'colorScale',
    'linesColorScale',
    'tooltipColumns',
    '_attached'
  )
  _makeChart() {
    if (this._chart) this._chart.destroy();
    var tooltip = d3.select(this.$.tooltip);
    // We directly reference properties of `this` because this call is
    // asynchronous, and values may have changed in between the call being
    // initiated and actually being run.
    var chart = new BarChart(
      this.data,
      this.lines,
      this.colorScale,
      this.linesColorScale,
      tooltip,
      this.tooltipColumns
    );
    var div = d3.select(this.$.chartdiv);
    chart.renderTo(div);
    this._chart = chart;
  }
}

class BarChart {
  private data: {
    [key: string]: Bar[];
  };
  private lines: {
    [key: string]: Bar[];
  };
  private colorScale: Plottable.Scales.Color;
  private linesColorScale: Plottable.Scales.Color;
  private tooltip: d3.Selection<any, any, any, any>;
  private outer: Plottable.Components.Table | null;
  private plot: Plottable.Plots.ClusteredBar<string, number> | null;

  constructor(
    data: {
      [key: string]: Bar[];
    },
    lines: {
      [key: string]: Bar[];
    },
    colorScale: Plottable.Scales.Color,
    linesColorScale: Plottable.Scales.Color,
    tooltip: d3.Selection<any, any, any, any>,
    tooltipColumns: BarChartTooltipColumn[]
  ) {
    // Assign each class a color.
    colorScale.domain(_.sortBy(_.keys(data)));
    // Assign arguments passed in constructor for future use.
    this.data = data;
    this.lines = lines;
    this.colorScale = colorScale;
    this.linesColorScale = linesColorScale;
    this.tooltip = tooltip;
    this.plot = null;
    this.outer = null;
    // Do things to actually build the chart.
    this.buildChart(data, lines, colorScale);
    this.setupTooltips(tooltipColumns);
  }
  private buildChart(
    data: {
      [key: string]: Bar[];
    },
    lines: {
      [key: string]: Bar[];
    },
    colorScale: Plottable.Scales.Color
  ) {
    if (this.outer) {
      this.outer.destroy();
    }
    const xScale = new Plottable.Scales.Category();
    const yScale = new Plottable.Scales.Linear();
    const xAxis = new Plottable.Axes.Category(xScale, 'bottom');
    const yAxis = new Plottable.Axes.Numeric(yScale, 'left');
    const plot = new Plottable.Plots.ClusteredBar<string, number>();
    plot.x(function(d) {
      return d.x;
    }, xScale);
    plot.y(function(d) {
      return d.y;
    }, yScale);
    const seriesNames = _.keys(data);
    seriesNames.forEach((seriesName) =>
      plot.addDataset(
        new Plottable.Dataset(data[seriesName]).metadata(seriesName)
      )
    );
    plot.attr('fill', function(d, i, dataset) {
      return colorScale.scale(dataset.metadata());
    });
    this.plot = plot;
    // If lines have been provided to overlay on the bar chart, then
    // create a line plot and put it in a group with the bar chart.
    const lineNames = _.keys(lines);
    if (lineNames.length > 0) {
      const linePlot = new Plottable.Plots.Line();
      linePlot.x(function(d) {
        return d.x;
      }, xScale);
      linePlot.y(function(d) {
        return d.y;
      }, yScale);
      lineNames.forEach((lineName) =>
        linePlot.addDataset(
          new Plottable.Dataset(lines[lineName]).metadata(lineName)
        )
      );
      linePlot.attr(
        'stroke',
        (d: Datum, i: number, dataset: Plottable.Dataset) =>
          this.linesColorScale.scale(dataset.metadata())
      );
      const group = new Plottable.Components.Group([plot, linePlot]);
      this.outer = new Plottable.Components.Table([
        [yAxis, group],
        [null, xAxis],
      ]);
    } else {
      this.outer = new Plottable.Components.Table([
        [yAxis, plot],
        [null, xAxis],
      ]);
    }
  }
  private setupTooltips(tooltipColumns: BarChartTooltipColumn[]) {
    // Set up tooltip column headers.
    const tooltipHeaderRow = this.tooltip.select('thead tr');
    tooltipHeaderRow
      .selectAll('th')
      .data(tooltipColumns)
      .enter()
      .append('th')
      .text((d) => d.title);
    // Prepend empty header cell for the data series colored circle icon.
    tooltipHeaderRow.insert('th', ':first-child');
    const plot = this.plot;
    const pointer = new PointerInteraction();
    pointer.attachTo(plot!);
    var hideTooltips = () => {
      this.tooltip.style('opacity', 0);
    };
    pointer.onPointerMove((p) => {
      const target = plot!.entityNearest(p);
      if (target) {
        this.drawTooltips(target, tooltipColumns);
      }
    });
    pointer.onPointerExit(hideTooltips);
  }
  private drawTooltips(
    target: Plottable.Plots.IPlotEntity,
    tooltipColumns: BarChartTooltipColumn[]
  ) {
    const hoveredClass = target.datum.x;
    const hoveredSeries = target.dataset.metadata();
    // The data is formatted in the way described on the  main element.
    // e.g. {'series0': [{ x: 'a', y: 1 }, { x: 'c', y: 3 },
    //       'series1': [{ x: 'a', y: 4 }, { x: 'g', y: 3 }, { x: 'e', y: 5 }]}
    // Filter down the data so each value contains 0 or 1 elements in the array,
    // which correspond to the value of the closest clustered bar (e.g. 'c').
    // This generates {series0: Array(1), series1: Array(0)}.
    let bars = _.mapValues(this.data, (allValuesForSeries) =>
      _.filter(allValuesForSeries, (elt) => elt.x == hoveredClass)
    );
    // Remove the keys that map to an empty array, and unpack the array.
    // This generates {series0: { x: 'c', y: 3 }}
    bars = _.pickBy(bars, (val) => val.length > 0);
    const singleBars = _.mapValues(bars, (val) => val[0]);
    // Rearrange the object for convenience.
    // This yields: [{key: 'series0', value: { x: 'c', y: 3 }}, ]
    const barEntries = d3.entries(singleBars);
    // Bind the bars data structure to the tooltip.
    const rows = this.tooltip
      .select('tbody')
      .html('')
      .selectAll('tr')
      .data(barEntries)
      .enter()
      .append('tr');
    rows.style('white-space', 'nowrap');
    rows.classed('closest', (d) => d.key == hoveredSeries);
    const colorScale = this.colorScale;
    rows
      .append('td')
      .append('div')
      .classed('swatch', true)
      .style('background-color', (d) => colorScale.scale(d.key));
    _.each(tooltipColumns, (column) => {
      rows.append('td').text((d) => {
        return column.evaluate(d);
      });
    });
    const left = target.position.x;
    const top = target.position.y;
    this.tooltip.style('transform', 'translate(' + left + 'px,' + top + 'px)');
    this.tooltip.style('opacity', 1);
  }

  public renderTo(targetSVG: d3.Selection<any, any, any, any>) {
    // TODO(chihuahua): Figure out why we store targetSVG as a property.
    this.outer!.renderTo(targetSVG);
  }

  public redraw() {
    this.outer!.redraw();
  }

  public destroy() {
    this.outer!.destroy();
  }
}
