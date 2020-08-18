import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MetricArithmeticComponent} from './metric_arithmetic_component';
import {MetricArithmeticContainer} from './metric_arithmetic_container';
import {MetricArithmeticElementModule} from './metric_arithmetic_element/metric_arithmetic_element_module';
import {MetricArithmeticOperatorModule} from './metric_arithmetic_operator/metric_arithmetic_operator_module';

@NgModule({
  declarations: [MetricArithmeticComponent, MetricArithmeticContainer],
  imports: [
    CommonModule,
    FormsModule,
    MetricArithmeticElementModule,
    MetricArithmeticOperatorModule,
  ],
  exports: [MetricArithmeticContainer],
})
export class MetricArithmeticModule {}
