import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {ParallelCoordinatesComponent} from './parallel_coordinates_component';
import {ParallelCoordinatesContainer} from './parallel_coordinates_container';

@NgModule({
  declarations: [ParallelCoordinatesComponent, ParallelCoordinatesContainer],
  imports: [CommonModule, FormsModule],
  exports: [ParallelCoordinatesContainer],
})
export class ParallelCoordinatesModule {}
