import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {AnnotationsLegendElementComponent} from './annotations_legend_element_component';

@NgModule({
  declarations: [AnnotationsLegendElementComponent],
  imports: [CommonModule],
  exports: [AnnotationsLegendElementComponent],
})
export class AnnotationsLegendElementModule {}
