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
import {Component, Input, NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MonacoShim} from './load_monaco_shim';
import {SourceCodeComponent} from './source_code_component';
import {SourceCodeContainer} from './source_code_container';
import {fakes, setUpMonacoFakes, spies, tearDownMonacoFakes} from './testing';

@Component({
  standalone: false,
  selector: 'testable-component',
  template: `
    <source-code
      [lines]="lines"
      [focusedLineno]="focusedLineno"
      [useDarkMode]="useDarkMode"
    ></source-code>
  `,
})
class TestableComponent {
  @Input()
  lines!: string[];

  @Input()
  focusedLineno!: number;

  @Input()
  useDarkMode!: boolean;
}

describe('Source Code Component', () => {
  beforeEach(async () => {
    setUpMonacoFakes();
    await TestBed.configureTestingModule({
      declarations: [
        SourceCodeComponent,
        SourceCodeContainer,
        TestableComponent,
      ],
      schemas: [NO_ERRORS_SCHEMA],
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

  it('creates editor with proper paremeter', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const component = fixture.componentInstance;
    component.lines = lines1;
    component.focusedLineno = 2;
    component.useDarkMode = true;
    fixture.detectChanges();
    // Simlulate loading monaco and setting the `monaco` input after loading.
    await MonacoShim.loadMonaco();
    fixture.detectChanges();

    expect(fakes.fakeMonaco.editor.create).toHaveBeenCalledOnceWith(
      jasmine.any(HTMLElement),
      {
        value: 'import tensorflow as tf\n\nprint("hello, world")',
        language: 'python',
        readOnly: true,
        fontSize: 10,
        minimap: {enabled: true},
        theme: 'vs-dark',
      }
    );
    expect(spies.editorSpy.revealLineInCenter).toHaveBeenCalledOnceWith(
      2,
      fakes.fakeMonaco.editor.ScrollType.Smooth
    );
    expect(fakes.fakeMonaco.editor.setTheme).not.toHaveBeenCalled();
  });

  it('renders a file and change to a new file', async () => {
    const fixture = TestBed.createComponent(TestableComponent);
    const component = fixture.componentInstance;
    component.lines = lines1;
    component.focusedLineno = 3;
    fixture.detectChanges();

    // Simlulate loading monaco and setting the `monaco` input after loading.
    await MonacoShim.loadMonaco();
    fixture.detectChanges();

    // Initial rendering of code uses monaco editor's constructor instead of
    // using `setValue()`.
    expect(spies.editorSpy.setValue).not.toHaveBeenCalled();
    expect(spies.editorSpy.revealLineInCenter).toHaveBeenCalledTimes(1);
    expect(spies.editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      3,
      fakes.fakeMonaco.editor.ScrollType.Smooth
    );
    expect(spies.editorSpy.deltaDecorations).toHaveBeenCalledTimes(1);

    component.lines = lines2;
    component.focusedLineno = 1;
    fixture.detectChanges();

    expect(spies.editorSpy.setValue).toHaveBeenCalledTimes(1);
    expect(spies.editorSpy.setValue).toHaveBeenCalledWith(
      'model = tf.keras.Sequential\nmodel.add(tf.keras.layers.Dense(1))'
    );
    expect(spies.editorSpy.revealLineInCenter).toHaveBeenCalledTimes(2);
    expect(spies.editorSpy.revealLineInCenter).toHaveBeenCalledWith(
      1,
      fakes.fakeMonaco.editor.ScrollType.Smooth
    );
    expect(spies.editorSpy.deltaDecorations).toHaveBeenCalledTimes(2);
  });

  describe('features', () => {
    let fixture: ComponentFixture<TestableComponent>;

    beforeEach(async () => {
      fixture = TestBed.createComponent(TestableComponent);
      fixture.componentInstance.lines = lines1;
      fixture.detectChanges();
      await MonacoShim.loadMonaco();
      fixture.detectChanges();
    });

    it('switches to a different line in the same file', () => {
      const component = fixture.componentInstance;
      component.focusedLineno = 2;
      fixture.detectChanges();
      component.focusedLineno = 1;
      fixture.detectChanges();

      // setValue() shouldn't have been called because there is no change in file
      // content.
      expect(spies.editorSpy!.setValue).toHaveBeenCalledTimes(0);
      expect(spies.editorSpy!.revealLineInCenter).toHaveBeenCalledTimes(2);
      // This is the call for the old lineno.
      expect(spies.editorSpy!.revealLineInCenter).toHaveBeenCalledWith(
        2,
        fakes.fakeMonaco.editor.ScrollType.Smooth
      );
      // This is the call for the new lineno.
      expect(spies.editorSpy.revealLineInCenter).toHaveBeenCalledWith(
        1,
        fakes.fakeMonaco.editor.ScrollType.Smooth
      );
    });

    it('uses different theme when `useDarkMode` changes', () => {
      // Forget the calls from initialization.
      fakes.fakeMonaco.editor.setTheme.calls.reset();
      const component = fixture.componentInstance;

      component.useDarkMode = true;
      fixture.detectChanges();
      expect(fakes.fakeMonaco.editor.setTheme).toHaveBeenCalledOnceWith(
        'vs-dark'
      );

      component.useDarkMode = false;
      fixture.detectChanges();
      expect(fakes.fakeMonaco.editor.setTheme.calls.allArgs()).toEqual([
        ['vs-dark'],
        ['vs'],
      ]);
    });
  });
});
