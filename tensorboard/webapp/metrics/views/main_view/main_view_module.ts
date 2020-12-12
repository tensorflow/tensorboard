/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';

import {CardRendererModule} from '../card_renderer/card_renderer_module';
import {RightPaneModule} from '../right_pane/right_pane_module';

import {CardGridComponent} from './card_grid_component';
import {CardGridContainer} from './card_grid_container';
import {CardGroupsComponent} from './card_groups_component';
import {CardGroupsContainer} from './card_groups_container';
import {MetricsFilterInputComponent} from './filter_input_component';
import {MetricsFilterInputContainer} from './filter_input_container';
import {FilteredViewComponent} from './filtered_view_component';
import {FilteredViewContainer} from './filtered_view_container';
import {MainViewComponent} from './main_view_component';
import {MainViewContainer} from './main_view_container';
import {PinnedViewComponent} from './pinned_view_component';
import {PinnedViewContainer} from './pinned_view_container';

@NgModule({
  declarations: [
    CardGridComponent,
    CardGridContainer,
    CardGroupsComponent,
    CardGroupsContainer,
    FilteredViewComponent,
    FilteredViewContainer,
    MainViewComponent,
    MainViewContainer,
    MetricsFilterInputComponent,
    MetricsFilterInputContainer,
    PinnedViewComponent,
    PinnedViewContainer,
  ],
  exports: [MainViewContainer],
  imports: [
    CardRendererModule,
    CommonModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    RightPaneModule,
    ScrollingModule,
  ],
})
export class MainViewModule {}
