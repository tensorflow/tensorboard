import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';

import {SelectedAnnotationsComponent} from './selected_annotations_component';
import {SelectedAnnotationsContainer} from './selected_annotations_container';

@NgModule({
  declarations: [SelectedAnnotationsComponent, SelectedAnnotationsContainer],
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  exports: [SelectedAnnotationsContainer],
})
export class SelectedAnnotationsModule {}
