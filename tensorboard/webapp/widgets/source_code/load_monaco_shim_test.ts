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

import {
  MonacoShim,
  TEST_ONLY,
  WindowWithRequireAndMonaco,
} from './load_monaco_shim';

describe('loadMonaco shim', () => {
  function createFakeRequire(): Require {
    let require = ((modules: string[], callback: Function) => {
      callback();
    }) as any;
    return Object.assign(require, {
      config: () => {},
      toUrl: () => {},
      defined: () => {},
      specified: () => {},
      onError: () => {},
      undef: () => {},
      onResourceLoad: () => {},
    });
  }

  // TODO(cais): Explore better typing by depending on external libraries.
  function createFakeMonaco() {
    return {};
  }

  function createFakeWindow(): WindowWithRequireAndMonaco {
    return {
      require: createFakeRequire(),
    } as unknown as WindowWithRequireAndMonaco;
  }

  let windowWithRequireAndMonaco: WindowWithRequireAndMonaco;
  let requireSpy: jasmine.Spy;
  beforeEach(() => {
    windowWithRequireAndMonaco = createFakeWindow();
    spyOn(TEST_ONLY.utils, 'getWindow').and.returnValue(
      windowWithRequireAndMonaco
    );

    requireSpy = spyOn(
      windowWithRequireAndMonaco as any,
      'require'
    ).and.callThrough();
  });

  afterEach(() => {
    delete windowWithRequireAndMonaco.monaco;
  });

  it('async function returns without error', async () => {
    await MonacoShim.loadMonaco();
    expect(requireSpy).toHaveBeenCalled();
  });

  it('does not reload monaco module if already loaded', async () => {
    windowWithRequireAndMonaco.monaco = createFakeMonaco();
    await MonacoShim.loadMonaco();
    expect(requireSpy).not.toHaveBeenCalled();
  });

  it('rejects if require.js is unavailable', async () => {
    delete windowWithRequireAndMonaco.require;

    await expectAsync(MonacoShim.loadMonaco()).toBeRejected();
  });
});
