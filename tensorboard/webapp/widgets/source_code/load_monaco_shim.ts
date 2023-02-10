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

function getWindow(): WindowWithRequireAndMonaco {
  return window;
}

const utils = {
  getWindow,
};

const MONACO_PATH_PREFIX = 'vs';
const MONACO_IMPORT_PATH = '/tf-imports/vs';

/**
 * require.js's require() wrapped as an async function that returns a Promise.
 *
 * This wrapped version does not support callback-function arguments.
 *
 * @param paths
 */
function requireAsPromise(paths: string[]): Promise<void> {
  const require = utils.getWindow().require!;
  return new Promise((resolve) => {
    require(paths, resolve);
  });
}

/**
 * If `window.monaco` is undefined, load the monaco-editor API object onto that
 * global path dynamically using require.js. If `window.monaco` is already
 * defined, this function is a no-op.
 */
async function loadMonaco(): Promise<void> {
  const window = utils.getWindow();
  if (window.monaco !== undefined) {
    return;
  }

  if (window.require) {
    const require = window.require;
    require.config({
      paths: {
        [MONACO_PATH_PREFIX]: MONACO_IMPORT_PATH,
      },
    });
    await requireAsPromise([`${MONACO_PATH_PREFIX}/editor/editor.main`]);
    await requireAsPromise([
      `${MONACO_PATH_PREFIX}/python/python.contribution`,
    ]);
  } else {
    throw new Error(
      'loadMonaco() failed because function require() is unavailable'
    );
  }
}

export const MonacoShim = {
  loadMonaco,
};

export const TEST_ONLY = {
  utils,
};
