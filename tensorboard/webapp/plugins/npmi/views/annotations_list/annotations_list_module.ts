import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ScrollingModule} from '@angular/cdk/scrolling';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {AnnotationsListComponent} from './annotations_list_component';
import {AnnotationsListContainer} from './annotations_list_container';
// import {AnnotationModule} from './annotation/annotation_module';
import {AnnotationsListHeaderModule} from './annotations_list_header/annotations_list_header_module';
import {AnnotationsListToolbarModule} from './annotations_list_toolbar/annotations_list_toolbar_module';

@NgModule({
  declarations: [AnnotationsListComponent, AnnotationsListContainer],
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    BrowserAnimationsModule,
    AnnotationsListToolbarModule,
    AnnotationsListHeaderModule,
  ],
  exports: [AnnotationsListContainer],
})
export class AnnotationsListModule {}
