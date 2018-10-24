/* Copyright 2018 The TensorFlow Authors. All Rights Reserved.

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
 * web-component-tester adds useful utilities like `flush` which is missing
 * DefinitelyTyped definition.
 */

// From: https://github.com/Polymer/web-component-tester/blob/3bef18fd439a8384e496a4e2139fc6bd9a289676/browser/environment/helpers.ts#L216
export function flush(callback: () => void) {}
export function animationFrameFlush(callback: () => void) {}

declare global {
  interface Window {
    flush: typeof flush;
    animationFrameFlush: typeof animationFrameFlush;
  }
}
