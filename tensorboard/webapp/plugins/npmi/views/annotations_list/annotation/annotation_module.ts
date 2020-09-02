import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';

import {AnnotationComponent} from './annotation_component';
import {AnnotationContainer} from './annotation_container';

@NgModule({
  declarations: [AnnotationContainer, AnnotationComponent],
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatIconModule],
  exports: [AnnotationContainer],
})
export class AnnotationModule {}
