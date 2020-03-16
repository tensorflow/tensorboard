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
 * Shim for the `loadMonaco()` function in different build environments.
 *
 * This file exports the version of `loadMonaco()` appropriate for the
 * open-source environment.
 */

// TODO(cais): Explore better typing by depending on external libraries.
export interface WindowWithRequireAndMonaco extends Window {
  require?: Require;
  monaco?: any;
}
export const windowWithRequireAndMonaco: WindowWithRequireAndMonaco = window;

const MONACO_PATH_PREFIX = 'vs';
const MONACO_IMPORT_PATH = '/tf-imports/vs';

/**
 * If `window.monaco` is undefined, load the monaco-editor API object onto that
 * global path dynamically. If `window.monaco` is already defined, this function
 * is a no-op.
 */
export function loadMonaco(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (windowWithRequireAndMonaco.monaco !== undefined) {
      return resolve();
    }

    if (windowWithRequireAndMonaco.require) {
      const require = windowWithRequireAndMonaco.require;
      require.config({
        paths: {
          [MONACO_PATH_PREFIX]: MONACO_IMPORT_PATH,
        },
      });
      require([`${MONACO_PATH_PREFIX}/editor/editor.main`], () => {
        require([`${MONACO_PATH_PREFIX}/python/python.contribution`], () => {
          return resolve();
        });
      });
    } else {
      return reject(
        'loadMonaco() failed because function require() is unavailable'
      );
    }
  });
}
