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

/**
 * WARNING: This file serves as an escape hatch. Ideally all app configuration
 * would take place in app_module.ts. Prefer adding top-level configuration
 * there, instead of here.
 *
 * Every exported symbol in this file must be accompanied by a `RATIONALE`.
 */

/**
 * RATIONALE:
 *
 * It is not sufficient for app_module.ts to use DI to provide
 * `MAT_CHECKBOX_DEFAULT_OPTIONS` from '@angular/material/checkbox'.
 *
 * Individual components may wish to override `MAT_CHECKBOX_DEFAULT_OPTIONS`
 * with {clickAction: 'noop'}. However, doing so would override the 'color'
 * property. In order to preserve the color property defined at the app-level,
 * we need to store the app's default checkbox color option. Then, components
 * can provide like so:
 *
 * // GOOD
 * {
 *   provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
 *   useValue: {
 *     clickAction: 'noop',
 *     color: MAT_CHECKBOX_DEFAULT_COLOR,
 *   },
 * }
 *
 * // BAD
 * {
 *   provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
 *   useValue: {color: 'primary'},
 * }
 */
export const MAT_CHECKBOX_DEFAULT_COLOR = 'accent';
