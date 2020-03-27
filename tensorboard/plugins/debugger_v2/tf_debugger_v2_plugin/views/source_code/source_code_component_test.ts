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
 * Unit tests for the the Source Files component and container.
 */
import {SimpleChange} from '@angular/core';
import {TestBed} from '@angular/core/testing';

import {SourceCodeComponent} from './source_code_component';
import {
  editorSpy,
  fakeMonaco,
  loadMonacoSpy,
  setUpMonacoFakes,
  tearDownMonacoFakes,
} from './testing';

describe('Source Code Component', () => {
  beforeEach(async () => {
    setUpMonacoFakes();
    await TestBed.configureTestingModule({
      declarations: [SourceCodeComponent],
    }).compileComponents();
  });

  afterEach(() => {
    tearDownMonacoFakes();
  });

  const lines1 = ['import tensorflow as tf', '', 'print("hello, world")'];
  const lines2 = [
    'model = tf.keras.Sequential',
    'model.add(tf.keras.layers.Dense(1))',
  ];

  it('renders a file and change to a new file', async () => {
    const fixture = TestBed.createComponent(SourceCodeComponent);
    const component = fixture.componentInstance;
    await component.ngOnChanges({
      lines: new SimpleChange(null, lines1, true),
      focusedLineno: new SimpleChange(null, 3, true),
    });
    component.lines = lines1;
    component.focusedLineno = 3;

    expect(loadMonacoSpy).toHaveBeenCalledTimes(1);
    // Initial rendering of code uses monaco editor's constructor instead of
    // using `setValue()`.
    expect(editorSpy.setValue).not.toHaveBeenCalled();
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      3,
      fakeMonaco.editor.ScrollType.Smooth
    );
    expect(editorSpy.deltaDecorations).toHaveBeenCalledTimes(1);

    await component.ngOnChanges({
      lines: new SimpleChange(lines1, lines2, false),
      focusedLineno: new SimpleChange(3, 1, false),
    });

    expect(editorSpy.setValue).toHaveBeenCalledTimes(1);
    expect(editorSpy.setValue).toHaveBeenCalledWith(
      'model = tf.keras.Sequential\nmodel.add(tf.keras.layers.Dense(1))'
    );
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledTimes(2);
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      1,
      fakeMonaco.editor.ScrollType.Smooth
    );
    expect(editorSpy.deltaDecorations).toHaveBeenCalledTimes(2);
  });

  it('switches to a different line in the same file', async () => {
    const fixture = TestBed.createComponent(SourceCodeComponent);
    const component = fixture.componentInstance;
    await component.ngOnChanges({
      lines: new SimpleChange(null, lines1, true),
      focusedLineno: new SimpleChange(null, 2, true),
    });
    component.lines = lines1;
    component.focusedLineno = 2;
    await component.ngOnChanges({
      focusedLineno: new SimpleChange(2, 1, false),
    });

    // setValue() shouldn't have been called because there is no change in file
    // content.
    expect(editorSpy.setValue).toHaveBeenCalledTimes(0);
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledTimes(2);
    // This is the call for the old lineno.
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      2,
      fakeMonaco.editor.ScrollType.Smooth
    );
    // This is the call for the new lineno.
    expect(editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      1,
      fakeMonaco.editor.ScrollType.Smooth
    );
  });

  it('calls monaco editor layout() on resize', async () => {
    const fixture = TestBed.createComponent(SourceCodeComponent);
    const component = fixture.componentInstance;
    await component.ngOnChanges({
      lines: new SimpleChange(null, lines1, true),
      focusedLineno: new SimpleChange(null, 3, true),
    });
    component.onResize(new Event('resize'));
    expect(editorSpy.layout).toHaveBeenCalledTimes(1);
  });
});
