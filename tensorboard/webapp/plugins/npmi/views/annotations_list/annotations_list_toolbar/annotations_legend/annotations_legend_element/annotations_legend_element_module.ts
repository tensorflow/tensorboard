import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {AnnotationsLegendElementComponent} from './annotations_legend_element_component';

@NgModule({
  declarations: [AnnotationsLegendElementComponent],
  imports: [CommonModule, FormsModule],
  exports: [AnnotationsLegendElementComponent],
})
export class AnnotationsLegendElementModule {}
