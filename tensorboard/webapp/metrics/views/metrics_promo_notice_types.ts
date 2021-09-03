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

import {Component, InjectionToken, Type} from '@angular/core';

/**
 * When this token exists, it will replace Metrics promotion message by the
 * content of the provided component.
 */
export const METRICS_PROMO_MESSAGE_COMPONENT = new InjectionToken<
  Type<Component>
>('[Metrics] METRICS_Promo Message Component');
