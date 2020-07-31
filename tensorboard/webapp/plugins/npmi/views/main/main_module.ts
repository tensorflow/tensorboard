import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';

import {MatCheckboxModule} from '@angular/material/checkbox';

import {MainComponent} from './main_component';
import {MainContainer} from './main_container';
import {RunsModule} from '../../../../runs/runs_module';

@NgModule({
  declarations: [MainComponent, MainContainer],
  imports: [CommonModule, FormsModule, MatCheckboxModule, RunsModule],
  exports: [MainContainer],
})
export class MainModule {}
