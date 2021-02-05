/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the 'License');
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an 'AS IS' BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/
import {ActionEvent} from './types';

export * from './types';

/**
 * A method used only by Polymer code for notifying TensorBoard developers
 * locally about events for debugging purposes. Do not use these events as
 * lifecycle hooks in production.
 *
 * It is intentionally a no-op. There is no usage tracking in TensorBoard.
 */
export function notifyActionEventFromPolymer(actionEvent: ActionEvent) {}
