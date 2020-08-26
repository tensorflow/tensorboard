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
import {FormsModule} from '@angular/forms';
import {ScrollingModule} from '@angular/cdk/scrolling';

import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {AnnotationsListComponent} from './annotations_list_component';
import {AnnotationsListContainer} from './annotations_list_container';
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
  ],
  exports: [AnnotationsListContainer],
})
export class AnnotationsListModule {}
