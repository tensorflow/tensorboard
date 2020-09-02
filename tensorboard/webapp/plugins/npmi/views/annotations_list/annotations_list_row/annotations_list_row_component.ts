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
  templateUrl: './annotations_list_row_component.ng.html',
  styleUrls: ['./annotations_list_row_component.css'],
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
  @ViewChild('annotation', {static: true, read: ElementRef})
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
  private svg: any;
  private mainContainer: any;
  private dotsGroup: any;
  private countDotsGroup: any;
  private textsGroup: any;
  private countTextsGroup: any;
  private runHintGroup: any;
  // Scales
  private xScale: any;
  private yScale: any;
  private sizeScale: any;
  private countSizeScale: any;
  private rgbColors = ['240, 120, 80', '46, 119, 182', '190, 64, 36'];

  ngOnChanges(changes: SimpleChanges) {
    if (this.svg) {
      this.redraw();
    }
  }

  ngAfterViewInit(): void {
    this.svg = d3.select(this.annotationContainer.nativeElement).select('svg');
    this.xScale = d3.scalePoint();
    this.yScale = d3.scalePoint();
    this.sizeScale = d3.scaleLinear();
    this.countSizeScale = d3.scaleLinear();
    this.mainContainer = this.svg
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
    this.dotsGroup = this.mainContainer.append('g');
    this.countDotsGroup = this.mainContainer.append('g');
    this.textsGroup = this.mainContainer.append('g');
    this.countTextsGroup = this.mainContainer.append('g');
    this.runHintGroup = this.svg.append('g');
    this.redraw();
  }

  private redraw() {
    this.setTextColor();
    this.updateAxes();
    this.drawRunIndicators();
    this.draw();
  }

  private setTextColor() {
    this.textColor = 'black';
    if (this.flaggedAnnotations.includes(this.annotation)) {
      this.textColor = '#F57C00';
    } else if (this.hiddenAnnotations.includes(this.annotation)) {
      this.textColor = 'lightgrey';
    }
  }

  private updateAxes() {
    this.xScale = d3.scalePoint();
    this.xScale
      .rangeRound([
        0,
        this.chartWidth - this.chartWidth / this.activeMetrics.length,
      ])
      .padding(0)
      .domain(this.activeMetrics.map((d) => stripMetricString(d)));

    this.yScale = d3.scalePoint();
    this.yScale
      .rangeRound([0, this.chartHeight - 30])
      .padding(0)
      .domain(this.runs.map((d) => d));

    this.sizeScale = d3.scaleLinear();
    this.sizeScale
      .range([0, this.chartWidth / this.activeMetrics.length])
      .domain([0.0, 1.0]);

    this.countSizeScale = d3.scaleLinear();
    this.countSizeScale.range([2, 10]).domain([0, this.maxCount]);
  }

  private drawRunIndicators() {
    this.runHintGroup.selectAll('.hint-clip').remove();
    this.runHintGroup
      .append('clipPath')
      .attr('id', 'hint-clip')
      .attr('class', 'hint-clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.margin.left - 30)
      .attr('height', this.chartHeight);

    this.runHintGroup
      .selectAll('.hint')
      .data([...this.runs])
      .join('g')
      .attr('class', 'hint')
      .attr(
        'transform',
        function(this: AnnotationComponent, d: string) {
          return `translate(10, ${this.yScale(d) + 5})`;
        }.bind(this)
      )
      .append('path')
      .attr(
        'fill',
        function(this: AnnotationComponent, d: string) {
          return `rgb(${this.rgbColors[0]})`;
        }.bind(this)
      )
      .attr('d', 'M 0 0 L 15 0 L 10 10 L 15 20 L 0 20 Z');

    this.runHintGroup
      .selectAll('.hintText')
      .data([...this.runs])
      .join('text')
      .attr('class', 'hintText')
      .attr('x', 25)
      .attr(
        'y',
        function(this: AnnotationComponent, d: string) {
          return this.yScale(d) + 15;
        }.bind(this)
      )
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .attr('clip-path', 'url(#hint-clip)')
      .attr('fill', this.textColor)
      .text(function(d: string) {
        return d;
      });
  }

  private draw() {
    this.drawDots();
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

  private drawDots() {
    this.dotsGroup
      .selectAll('.dot')
      .data(this.data)
      .join('rect')
      .attr('class', 'dot')
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
          return this.xScale(d.metric);
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run) + 5;
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
  }

  private drawCountDots() {
    this.countDotsGroup
      .selectAll('.countDot')
      .data(this.data)
      .join('circle')
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
          return this.xScale(d.metric) + 70;
        }.bind(this)
      )
      .attr(
        'cy',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run) + 15;
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
  }

  private drawTexts() {
    this.textsGroup
      .selectAll('.npmiBackgroundText')
      .data(this.data)
      .join('text')
      .attr('class', 'npmiBackgroundText')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', 'white')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric) + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run) + 15;
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
    this.textsGroup
      .selectAll('.npmiText')
      .data(this.data)
      .join('text')
      .attr('class', 'npmiText')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric) + 5;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run) + 15;
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
  }

  private drawCountTexts() {
    this.countTextsGroup
      .selectAll('.countBackgroundText')
      .data(this.data)
      .join('text')
      .attr('class', 'countBackgroundText')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('stroke', 'white')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric) + 82;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run) + 15;
        }.bind(this)
      )
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .text(function(d: ValueData) {
        return numberFormat.formatLargeNumberComma(d.countValue);
      });

    this.countTextsGroup
      .selectAll('.countText')
      .data(this.data)
      .join('text')
      .attr('class', 'countText')
      .attr(
        'x',
        function(this: AnnotationComponent, d: ValueData) {
          return this.xScale(d.metric) + 82;
        }.bind(this)
      )
      .attr(
        'y',
        function(this: AnnotationComponent, d: ValueData) {
          return this.yScale(d.run) + 15;
        }.bind(this)
      )
      .attr('font-size', '10px')
      .attr('alignment-baseline', 'middle')
      .text(function(d: ValueData) {
        return numberFormat.formatLargeNumberComma(d.countValue);
      });
  }
}
