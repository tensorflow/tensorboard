/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

import {NgModule} from '@angular/core';
import {ContentWrappingInputComponent} from './content_wrapping_input_component';

/**
 * Provides <content-wrapping-input> that behaves like an <input> but with
 * different UX. Its width changes based on value typed, or placeholder when
 * value is empty. When not focused, it looks like a simple span with a text.
 *
 * UX was largely inpsired by the title editor in Google Docs.
 */
@NgModule({
  exports: [ContentWrappingInputComponent],
  declarations: [ContentWrappingInputComponent],
})
export class ContentWrappingInputModule {}
