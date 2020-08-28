import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';

import {ViolinFilterComponent} from './violin_filter_component';
import {ViolinFilterContainer} from './violin_filter_container';

@NgModule({
  declarations: [ViolinFilterComponent, ViolinFilterContainer],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  exports: [ViolinFilterContainer],
})
export class ViolinFilterModule {}
