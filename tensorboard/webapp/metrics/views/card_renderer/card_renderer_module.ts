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
import {IntersectionObserverModule} from '../../../widgets/intersection_observer/intersection_observer_module';
import {CardLazyLoader} from './card_lazy_loader';
import {CardViewComponent} from './card_view_component';
import {CardViewContainer} from './card_view_container';
import {HistogramCardModule} from './histogram_card_module';
import {ImageCardModule} from './image_card_module';
import {ScalarCardModule} from './scalar_card_module';

@NgModule({
  declarations: [CardLazyLoader, CardViewComponent, CardViewContainer],
  exports: [CardLazyLoader, CardViewContainer],
  imports: [
    CommonModule,
    ImageCardModule,
    ScalarCardModule,
    HistogramCardModule,
    IntersectionObserverModule,
  ],
})
export class CardRendererModule {}
