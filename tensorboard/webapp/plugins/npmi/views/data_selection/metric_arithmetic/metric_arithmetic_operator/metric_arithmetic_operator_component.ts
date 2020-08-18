import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Store} from '@ngrx/store';
import {Operator} from './../../../../store/npmi_types';

@Component({
  selector: 'npmi-metric-arithmetic-operator',
  templateUrl: './metric_arithmetic_operator_component.ng.html',
  styleUrls: ['./metric_arithmetic_operator_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricArithmeticOperatorComponent {
  @Input() operator!: Operator;
  get operatorText(): string {
    switch (+this.operator) {
      case Operator.AND:
        return '&';
      default:
        return '';
    }
  }

  constructor(private store: Store<any>) {}
}
