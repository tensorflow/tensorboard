import {
  ChangeDetectionStrategy,
  Component,
  Input,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {ValueData} from '../../../store/npmi_types';
import * as d3 from 'd3';
import {stripMetricString} from '../../../util/metric_type';
import * as numberFormat from '../../../util/number_format';

@Component({
  selector: 'annotation-component',
  templateUrl: './annotation_component.ng.html',
  styleUrls: ['./annotation_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationComponent implements AfterViewInit, OnChanges {
  @Input() data!: ValueData[];
  @Input() maxCount!: number;
  @Input() selectedAnnotations!: string[];
  @Input() flaggedAnnotations!: string[];
  @Input() hiddenAnnotations!: string[];
  @Input() activeMetrics!: string[];
  @Input() showCounts!: boolean;
  @Input() annotation!: string;
  @ViewChild('chart', {static: true, read: ElementRef})
  private readonly annotationContainer!: ElementRef<HTMLDivElement>;
  get height(): number {
    return this.runs.length * 30;
  }
  get width(): number {
    return parseInt(
      d3.select(this.annotationContainer.nativeElement).style('width'),
      10
    );
  }
  private readonly margin = {top: 0, right: 0, bottom: 0, left: 100};
  get chartWidth(): number {
    return this.width - this.margin.left - this.margin.right;
  }
  get chartHeight(): number {
    return this.height - this.margin.top - this.margin.bottom;
  }
  private textColor = 'black';
  get runs(): string[] {
    const runs = new Set<string>();
    this.data.forEach((element) => runs.add(element.run));
    return [...runs];
  }
  // Drawing containers
  private svg!: d3.Selection<SVGElement, unknown, null, undefined>;
  private mainContainer!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private barsGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private countDotsGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private textsGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private countTextsGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private runHintGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  // Scales
  private xScale!: d3.ScalePoint<string>;
  private yScale!: d3.ScalePoint<string>;
  private sizeScale!: d3.ScaleLinear<number, number>;
  private countSizeScale!: d3.ScaleLinear<number, number>;

  private runClipPath!: d3.Selection<SVGRectElement, unknown, null, undefined>;
  private rgbColors = ['240, 120, 80', '46, 119, 182', '190, 64, 36'];

  ngAfterViewInit(): void {
    this.svg = d3.select(this.annotationContainer.nativeElement).select('svg');
    this.xScale = d3.scalePoint<string>().padding(0);
    this.yScale = d3.scalePoint<string>().padding(0);
    this.sizeScale = d3.scaleLinear().domain([0.0, 1.0]);
    this.countSizeScale = d3.scaleLinear().range([2, 10]);
    this.mainContainer = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    this.barsGroup = this.mainContainer.append('g');
    this.countDotsGroup = this.mainContainer.append('g');
    this.textsGroup = this.mainContainer.append('g');
    this.countTextsGroup = this.mainContainer.append('g');
    this.runHintGroup = this.svg.append('g');
    this.runClipPath = this.runHintGroup
      .append('clipPath')
      .attr('id', 'hint-clip')
      .attr('class', 'hint-clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.margin.left - 30)
      .attr('height', this.chartHeight);
    this.redraw();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.svg) {
      this.redraw();
    }
  }

  private redraw() {
    this.setTextColor();
    this.updateAxes();
    this.draw();
  }

  // Initializing/Updating the visualization props.
  private setTextColor() {
    this.textColor = 'black';
    if (this.flaggedAnnotations.includes(this.annotation)) {
      this.textColor = '#F57C00';
    } else if (this.hiddenAnnotations.includes(this.annotation)) {
      this.textColor = 'lightgrey';
    }
  }

  private updateAxes() {
    this.xScale
      .rangeRound([
        0,
        this.chartWidth - this.chartWidth / this.activeMetrics.length,
      ])
      .domain(this.activeMetrics.map((d) => stripMetricString(d)));

    this.yScale
      .rangeRound([0, this.chartHeight - 30])
      .domain(this.runs.map((d: string) => d));

    this.sizeScale.range([0, this.chartWidth / this.activeMetrics.length]);

    this.countSizeScale.domain([0, this.maxCount]);
  }

  // Drawing UI
  private draw() {
    this.drawRunIndicators();
    this.drawRunHintTexts();
    this.drawBars();
    this.drawTexts();
    if (this.showCounts) {
      this.drawCountDots();
      this.drawCountTexts();
    } else {
      this.countDotsGroup.selectAll('.countDot').remove();
      this.countTextsGroup.selectAll('.countBackgroundText').remove();
      this.countTextsGroup.selectAll('.countText').remove();
    }
  }

  private drawRunIndicators() {
    this.runClipPath.attr('height', this.chartHeight);

    const indicators = this.runHintGroup
      .selectAll('.hint')
      .data([...this.runs]);

    indicators
      .enter()
      .append('g')
      .attr('class', 'hint')
      .attr(
        'transform',
        function(this: AnnotationComponent, d: string) {
          return `translate(10, ${this.yScale(d)! + 5})`;
        }.bind(this)
      )
      .attr(
        'fill',
        function(this: AnnotationComponent, d: string) {
          return `rgb(${this.rgbColors[0]})`;
        }.bind(this)
      )
      .append('path')
      .attr('d', 'M 0 0 L 15 0 L 10 10 L 15 20 L 0 20 Z');

    indicators
      .attr(
        'transform',
        function(this: AnnotationComponent, d: string) {
          return `translate(10, ${this.yScale(d)! + 5})`;
        }.bind(this)
      )
      .attr(
        'fill',
        function(this: AnnotationComponent, d: string) {
          return `rgb(${this.rgbColors[0]})`;
        }.bind(this)
      );

    indicators.exit().remove();
  }

  private drawRunHintTexts() {
    const hintTexts = this.runHintGroup
      .selectAll('.hintText')
      .data([...this.runs]);

    hintTexts
      .enter()
      .append('text')
      .attr('class', 'hintText')
      .attr('x', 25)
      .attr(
        'y',
        function(this: AnnotationComponent, d: string) {
          return this.yScale(d)! + 15;
        }.bind(this)
      )
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .attr('clip-path', 'url(#hint-clip)')
      .attr('fill', this.textColor)
      .text(function(d: string) {
        return d;
      });

    hintTexts
      .attr(
        'y',
        function(this: AnnotationComponent, d: string) {
          return this.yScale(d)! + 15;
        }.bind(this)
      )
      .attr('fill', this.textColor)
      .text(function(d: string) {
        return d;
      });

    hintTexts.exit().remove();
  }

  private drawBars() {
    const bars = this.barsGroup.selectAll('.bar').data(this.data);

    bars
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('fill', function(d: ValueData) {
        if (d.nPMIValue === null) {
          return 'white';
        } else if (d.nPMIValue >= 0) {
          return d3.interpolateBlues(d.nPMIValue);
        } else {
          return d3.interpolateReds(d.nPMIValue * -1);
        }
      })
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)!;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 5;
        }.bind(this)
      )
      .attr(
        'width',
        function(this: AnnotationComponent, d: ValueData) {
          if (d.nPMIValue === null) {
            return 0;
          } else {
            return this.sizeScale(Math.abs(d.nPMIValue));
          }
        }.bind(this)
      )
      .attr('height', 20);

    bars
      .attr('fill', function(d: ValueData) {
        if (d.nPMIValue === null) {
          return 'white';
        } else if (d.nPMIValue >= 0) {
          return d3.interpolateBlues(d.nPMIValue);
        } else {
          return d3.interpolateReds(d.nPMIValue * -1);
        }
      })
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)!;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 5;
        }.bind(this)
      )
      .attr(
        'width',
        function(this: AnnotationComponent, d: ValueData) {
          if (d.nPMIValue === null) {
            return 0;
          } else {
            return this.sizeScale(Math.abs(d.nPMIValue));
          }
        }.bind(this)
      );

    bars.exit().remove();
  }

  private drawCountDots() {
    const countDots = this.countDotsGroup
      .selectAll('.countDot')
      .data(this.data);

    countDots
      .enter()
      .append('circle')
      .attr('class', 'countDot')
      .attr(
        'fill',
        function(this: AnnotationComponent, d: ValueData) {
          if (d.countValue === null) {
            return 'white';
          } else {
            return d3.interpolateGreys(d.countValue / this.maxCount);
          }
        }.bind(this)
      )
      .attr('stroke', 'black')
      .attr(
        'cx',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 70;
        }.bind(this)
      )
      .attr(
        'cy',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .attr(
        'r',
        function(this: AnnotationComponent, d: ValueData) {
          if (d.countValue === null) {
            return 0;
          } else {
            return this.countSizeScale(d.countValue);
          }
        }.bind(this)
      );

    countDots
      .attr(
        'fill',
        function(this: AnnotationComponent, d: ValueData) {
          if (d.countValue === null) {
            return 'white';
          } else {
            return d3.interpolateGreys(d.countValue / this.maxCount);
          }
        }.bind(this)
      )
      .attr(
        'cx',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 70;
        }.bind(this)
      )
      .attr(
        'cy',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .attr(
        'r',
        function(this: AnnotationComponent, d: ValueData) {
          if (d.countValue === null) {
            return 0;
          } else {
            return this.countSizeScale(d.countValue);
          }
        }.bind(this)
      );

    countDots.exit().remove();
  }

  private drawTexts() {
    const backgroundTexts = this.textsGroup
      .selectAll('.npmiBackgroundText')
      .data(this.data);

    backgroundTexts
      .enter()
      .append('text')
      .attr('class', 'npmiBackgroundText')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', 'white')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .attr('font-size', '13px')
      .attr('alignment-baseline', 'middle')
      .text(function(d: ValueData) {
        let value =
          d.nPMIValue === null
            ? 'null'
            : Math.round((d.nPMIValue + Number.EPSILON) * 1000) / 1000;
        return value;
      });

    backgroundTexts
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .text(function(d: ValueData) {
        let value =
          d.nPMIValue === null
            ? 'null'
            : Math.round((d.nPMIValue + Number.EPSILON) * 1000) / 1000;
        return value;
      });

    backgroundTexts.exit().remove();

    const texts = this.textsGroup.selectAll('.npmiText').data(this.data);

    texts
      .enter()
      .append('text')
      .attr('class', 'npmiText')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .attr('font-size', '13px')
      .attr('alignment-baseline', 'middle')
      .text(function(d: ValueData) {
        let value =
          d.nPMIValue === null
            ? 'null'
            : Math.round((d.nPMIValue + Number.EPSILON) * 1000) / 1000;
        return value;
      });

    texts
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .text(function(d: ValueData) {
        let value =
          d.nPMIValue === null
            ? 'null'
            : Math.round((d.nPMIValue + Number.EPSILON) * 1000) / 1000;
        return value;
      });

    texts.exit().remove();
  }

  private drawCountTexts() {
    const countBackgroundTexts = this.countTextsGroup
      .selectAll('.countBackgroundText')
      .data(this.data);

    countBackgroundTexts
      .enter()
      .append('text')
      .attr('class', 'countBackgroundText')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', 'white')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 82;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .text(function(d: ValueData) {
        return numberFormat.formatLargeNumberComma(d.countValue);
      });

    countBackgroundTexts
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 82;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .text(function(d: ValueData) {
        return numberFormat.formatLargeNumberComma(d.countValue);
      });

    countBackgroundTexts.exit().remove();

    const countTexts = this.countTextsGroup
      .selectAll('.countText')
      .data(this.data);

    countTexts
      .enter()
      .append('text')
      .attr('class', 'countText')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 82;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .text(function(d: ValueData) {
        return numberFormat.formatLargeNumberComma(d.countValue);
      });

    countTexts
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric)! + 82;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run)! + 15;
        }.bind(this)
      )
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .text(function(d: ValueData) {
        return numberFormat.formatLargeNumberComma(d.countValue);
      });

    countTexts.exit().remove();
  }
}
