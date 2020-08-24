import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatTooltipModule} from '@angular/material/tooltip';

import {AnnotationsListHeaderComponent} from './annotations_list_header_component';
import {AnnotationsListHeaderContainer} from './annotations_list_header_container';

@NgModule({
  declarations: [
    AnnotationsListHeaderComponent,
    AnnotationsListHeaderContainer,
  ],
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatTooltipModule],
  exports: [AnnotationsListHeaderContainer],
})
export class AnnotationsListHeaderModule {}
