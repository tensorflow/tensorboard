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
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSliderModule} from '@angular/material/slider';
import {TruncatedPathModule} from '../../../widgets/text/truncated_path_module';
import {ImageCardComponent} from './image_card_component';
import {ImageCardContainer} from './image_card_container';
import {FeatureFlagDirectiveModule} from '../../../feature_flag/directives/feature_flag_directive_module';
import {RunNameModule} from './run_name_module';
import {VisLinkedTimeSelectionWarningModule} from './vis_linked_time_selection_warning_module';

@NgModule({
  declarations: [ImageCardContainer, ImageCardComponent],
  exports: [ImageCardContainer],
  imports: [
    CommonModule,
    FeatureFlagDirectiveModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    RunNameModule,
    TruncatedPathModule,
    VisLinkedTimeSelectionWarningModule,
  ],
})
export class ImageCardModule {}
