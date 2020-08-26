import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ScrollingModule} from '@angular/cdk/scrolling';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatInputModule} from '@angular/material/input';

import {AnnotationsListToolbarComponent} from './annotations_list_toolbar_component';
import {AnnotationsListToolbarContainer} from './annotations_list_toolbar_container';

@NgModule({
  declarations: [
    AnnotationsListToolbarComponent,
    AnnotationsListToolbarContainer,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ScrollingModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    BrowserAnimationsModule,
    MatSlideToggleModule,
    MatInputModule,
  ],
  exports: [AnnotationsListToolbarContainer],
})
export class AnnotationsListToolbarModule {}
