import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

@Component({
  selector: 'metric-arithmetic-element-component',
  templateUrl: './metric_arithmetic_element_component.ng.html',
  styleUrls: ['./metric_arithmetic_element_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricArithmeticElementComponent {
  @Input() metric!: string;
  @Input() filterExtremes!: {min: string; max: string};
  @Input() minFilterValid!: boolean;
  @Input() maxFilterValid!: boolean;
  @Output() onRemove = new EventEmitter<string>();
  @Output() onFilterChange = new EventEmitter<{min: string; max: string}>();
}
