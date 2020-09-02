import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';

import {AnnotationComponent} from './annotations_list_row_component';
import {AnnotationsListRowContainer} from './annotations_list_row_container';

@NgModule({
  declarations: [AnnotationsListRowContainer, AnnotationComponent],
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatIconModule],
  exports: [AnnotationsListRowContainer],
})
export class AnnotationsListRowModule {}
