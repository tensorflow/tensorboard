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
  ChangeDetectorRef,
  Component,
  Input,
  NO_ERRORS_SCHEMA,
} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MonacoShim} from './load_monaco_shim';
import {SourceCodeDiffComponent} from './source_code_diff_component';
import {SourceCodeDiffContainer} from './source_code_diff_container';
import {fakes, setUpMonacoFakes, spies, tearDownMonacoFakes} from './testing';

// Does not use OnPush change detector, making it easier to test with.
@Component({
  standalone: false,
  selector: 'testable-component',
  template: `
    <source-code-diff [useDarkMode]="useDarkMode"></source-code-diff>
  `,
})
class TestableComponent {
  @Input()
  useDarkMode?: boolean;
}

describe('Source Code Diff', () => {
  beforeEach(async () => {
    setUpMonacoFakes();
    await TestBed.configureTestingModule({
      declarations: [
        TestableComponent,
        SourceCodeDiffComponent,
        SourceCodeDiffContainer,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  afterEach(() => {
    tearDownMonacoFakes();
  });

  it('renders a side-by-side diff using monaco', async () => {
    const fixture = TestBed.createComponent(SourceCodeDiffContainer);
    const component = fixture.componentInstance;
    component.firstText = 'foo';
    component.secondText = 'bar';
    component.renderSideBySide = true;
    fixture.detectChanges();

    // Simlulate loading monaco.
    await MonacoShim.loadMonaco();
    fixture.detectChanges();

    expect(spies.createDiffEditorSpy).toHaveBeenCalledTimes(1);
    expect(
      spies.createDiffEditorSpy.calls.allArgs()[0][1].renderSideBySide
    ).toBe(true);
    expect(spies.diffEditorSpy.setModel).toHaveBeenCalledTimes(1);
  });

  it('renders an inline diff using monaco', async () => {
    const fixture = TestBed.createComponent(SourceCodeDiffContainer);
    const component = fixture.componentInstance;
    component.firstText = 'foo';
    component.secondText = 'bar';
    component.renderSideBySide = false;
    fixture.detectChanges();

    // Simlulate loading monaco.
    await MonacoShim.loadMonaco();
    fixture.detectChanges();

    expect(spies.createDiffEditorSpy).toHaveBeenCalledTimes(1);
    expect(
      spies.createDiffEditorSpy.calls.allArgs()[0][1].renderSideBySide
    ).toBe(false);
    expect(spies.diffEditorSpy.setModel).toHaveBeenCalledTimes(1);
  });

  it('updates an existing editor when renderSideBySide changes', async () => {
    const fixture = TestBed.createComponent(SourceCodeDiffContainer);
    const changeDetector = fixture.debugElement.injector.get(ChangeDetectorRef);
    const component = fixture.componentInstance;
    component.firstText = 'foo';
    component.secondText = 'bar';
    component.renderSideBySide = false;
    fixture.detectChanges();

    // Simlulate loading monaco.
    await MonacoShim.loadMonaco();
    changeDetector.detectChanges();

    expect(spies.diffEditorSpy.updateOptions).not.toHaveBeenCalled();

    component.renderSideBySide = true;
    changeDetector.detectChanges();

    expect(spies.diffEditorSpy.updateOptions).toHaveBeenCalledWith(
      jasmine.objectContaining({renderSideBySide: true})
    );

    component.renderSideBySide = false;
    changeDetector.detectChanges();

    expect(spies.diffEditorSpy.updateOptions).toHaveBeenCalledWith(
      jasmine.objectContaining({renderSideBySide: false})
    );
  });

  it('calls loadMonaco() on ngOnInit()', () => {
    const fixture = TestBed.createComponent(SourceCodeDiffContainer);
    const component = fixture.componentInstance;
    component.ngOnInit();
    expect(spies.loadMonacoSpy!).toHaveBeenCalledTimes(1);
  });

  describe('useDarkMode', () => {
    it('updates theme when useDarkMode changes', async () => {
      const fixture = TestBed.createComponent(TestableComponent);
      const component = fixture.componentInstance;
      fixture.detectChanges();

      await MonacoShim.loadMonaco();
      fixture.detectChanges();

      component.useDarkMode = true;
      fixture.detectChanges();

      component.useDarkMode = false;
      fixture.detectChanges();

      expect(fakes.fakeMonaco.editor.setTheme.calls.allArgs()).toEqual([
        ['vs-dark'],
        ['vs'],
      ]);
    });
  });
});
