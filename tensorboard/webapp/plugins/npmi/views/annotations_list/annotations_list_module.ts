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
import {NgModule} from '@angular/core';
import {AnnotationModule} from './annotation/annotation_module';
import {AnnotationsListComponent} from './annotations_list_component';
import {AnnotationsListContainer} from './annotations_list_container';
import {AnnotationsListToolbarModule} from './annotations_list_toolbar/annotations_list_toolbar_module';
import {HeaderModule} from './header/header_module';
import {LegendModule} from './legend/legend_module';

@NgModule({
  declarations: [AnnotationsListComponent, AnnotationsListContainer],
  imports: [
    CommonModule,
    AnnotationsListToolbarModule,
    HeaderModule,
    LegendModule,
    ScrollingModule,
    AnnotationModule,
  ],
  exports: [AnnotationsListContainer],
})
export class AnnotationsListModule {}
