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
import {ScrollingModule} from '@angular/cdk/scrolling';
import {CommonModule} from '@angular/common';
import {CustomizationModule} from '../../../customization/customization_module';
import {NgModule} from '@angular/core';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {FilterInputModule} from '../../../widgets/filter_input/filter_input_module';
import {CardRendererModule} from '../card_renderer/card_renderer_module';
import {RightPaneModule} from '../right_pane/right_pane_module';
import {ScalarColumnEditorModule} from '../right_pane/scalar_column_editor/scalar_column_editor_module';
import {CardGridComponent} from './card_grid_component';
import {CardGridContainer} from './card_grid_container';
import {CardGroupsComponent} from './card_groups_component';
import {CardGroupsContainer} from './card_groups_container';
import {CardGroupToolBarComponent} from './card_group_toolbar_component';
import {CardGroupToolBarContainer} from './card_group_toolbar_container';
import {EmptyTagMatchMessageComponent} from './empty_tag_match_message_component';
import {EmptyTagMatchMessageContainer} from './empty_tag_match_message_container';
import {FilteredViewComponent} from './filtered_view_component';
import {FilteredViewContainer} from './filtered_view_container';
import {MetricsFilterInputComponent} from './filter_input_component';
import {MetricsFilterInputContainer} from './filter_input_container';
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
    CardGroupToolBarComponent,
    CardGroupToolBarContainer,
    EmptyTagMatchMessageComponent,
    EmptyTagMatchMessageContainer,
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
    CustomizationModule,
    FilterInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RightPaneModule,
    ScalarColumnEditorModule,
    ScrollingModule,
  ],
})
export class MainViewModule {}
