import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MetricArithmeticOperatorComponent} from './metric_arithmetic_operator_component';

@NgModule({
  declarations: [MetricArithmeticOperatorComponent],
  imports: [
    CommonModule,
    FormsModule,
  ],
  exports: [MetricArithmeticOperatorComponent],
})
export class MetricArithmeticOperatorModule {}
