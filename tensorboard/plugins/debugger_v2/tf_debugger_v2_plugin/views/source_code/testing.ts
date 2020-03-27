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
 * Testing utilities (fakes and spies) for testing monaco-editor-based source
 * code components.
 */

import * as loadMonacoShim from './load_monaco_shim';

export class FakeRange {
  constructor(
    readonly startLineNumber: number,
    readonly startColumn: number,
    readonly endLineNumber: number,
    readonly endColumn: number
  ) {}
}

export let loadMonacoSpy: jasmine.Spy;
// TODO(cais): Explore better typing by depending on 3rd-party libraries.
export let editorSpy: jasmine.SpyObj<any>;
export let fakeMonaco: any;

export function setUpMonacoFakes() {
  async function fakeLoadMonaco() {
    fakeMonaco = {
      editor: {
        create: () => {
          editorSpy = jasmine.createSpyObj('editorSpy', [
            'deltaDecorations',
            'layout',
            'revealLineInCenter',
            'setValue',
          ]);
          return editorSpy;
        },
        ScrollType: {
          Immediate: 1,
          Smooth: 0,
        },
      },
      Range: FakeRange,
    };
    loadMonacoShim.windowWithRequireAndMonaco.monaco = fakeMonaco;
  }
  loadMonacoSpy = spyOn(loadMonacoShim, 'loadMonaco').and.callFake(
    fakeLoadMonaco
  );
}

export function tearDownMonacoFakes() {
  if (loadMonacoShim.windowWithRequireAndMonaco.monaco !== undefined) {
    delete loadMonacoShim.windowWithRequireAndMonaco.monaco;
  }
}
