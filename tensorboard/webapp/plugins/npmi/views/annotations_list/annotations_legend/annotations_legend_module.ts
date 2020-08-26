import {NgModule} from '@angular/core';

import {AnnotationsLegendComponent} from './annotations_legend_component';
import {AnnotationsLegendElementModule} from './annotations_legend_element/annotations_legend_element_module';

@NgModule({
  declarations: [AnnotationsLegendComponent],
  imports: [AnnotationsLegendElementModule],
  exports: [AnnotationsLegendComponent],
})
export class AnnotationsLegendModule {}
