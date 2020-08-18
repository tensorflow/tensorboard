import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';

import {MetricArithmeticElementComponent} from './metric_arithmetic_element_component';
import {MetricArithmeticElementContainer} from './metric_arithmetic_element_container';

@NgModule({
  declarations: [
    MetricArithmeticElementComponent,
    MetricArithmeticElementContainer,
  ],
  imports: [CommonModule, FormsModule, MatIconModule],
  exports: [MetricArithmeticElementContainer],
})
export class MetricArithmeticElementModule {}
