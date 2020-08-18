import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  ArithmeticElement,
  MetricFilterListing,
} from './../../../store/npmi_types';

@Component({
  selector: 'metric-arithmetic-component',
  templateUrl: './metric_arithmetic_component.ng.html',
  styleUrls: ['./metric_arithmetic_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricArithmeticComponent {
  @Input() metricArithmetic!: ArithmeticElement[];
  @Input() metricFilters!: MetricFilterListing;
}
