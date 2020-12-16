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

// TODO(cais): Explore better typing by depending on 3rd-party libraries.
export const spies: {
  loadMonacoSpy?: jasmine.Spy;
  editorSpy?: jasmine.SpyObj<any>;
  createDiffEditorSpy?: jasmine.SpyObj<any>;
  diffEditorSpy?: jasmine.SpyObj<any>;
  createModelSpy?: jasmine.SpyObj<any>;
} = {};

export const fakes: {
  fakeMonaco?: any;
} = {};

export const windowWithRequireAndMonaco: any = window;

export function setUpMonacoFakes() {
  async function fakeLoadMonaco() {
    fakes.fakeMonaco = {
      editor: {
        create: () => {
          spies.editorSpy = jasmine.createSpyObj('editorSpy', [
            'deltaDecorations',
            'layout',
            'revealLineInCenter',
            'setValue',
          ]);
          return spies.editorSpy;
        },
        createDiffEditor: () => {
          spies.diffEditorSpy = jasmine.createSpyObj('diffEditorSpy', [
            'layout',
            'setModel',
            'updateOptions',
          ]);
          return spies.diffEditorSpy;
        },
        createModel: () => {
          spies.createModelSpy = jasmine.createSpy();
          return spies.createModelSpy;
        },
        ScrollType: {
          Immediate: 1,
          Smooth: 0,
        },
      },
      Range: FakeRange,
    };
    spies.createDiffEditorSpy = spyOn(
      fakes.fakeMonaco.editor,
      'createDiffEditor'
    ).and.callThrough();
    windowWithRequireAndMonaco.monaco = fakes.fakeMonaco;
  }
  spies.loadMonacoSpy = spyOn(loadMonacoShim, 'loadMonaco').and.callFake(
    fakeLoadMonaco
  );
}

export function tearDownMonacoFakes() {
  if (windowWithRequireAndMonaco.monaco !== undefined) {
    delete windowWithRequireAndMonaco.monaco;
  }
}
