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

import {CommonModule} from '@angular/common';
import {Component, Input, NO_ERRORS_SCHEMA, ViewChild} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
} from '@angular/core/testing';
import {MarkdownRendererComponent} from './markdown_renderer_component';

@Component({
  standalone: false,
  selector: 'testable-markdown-renderer',
  template: `<markdown-renderer [markdown]="content"> </markdown-renderer>`,
})
class TestableComponent {
  @ViewChild(MarkdownRendererComponent)
  component!: MarkdownRendererComponent;

  @Input() content!: string;
}

describe('markdown_renderer/markdown_renderer test', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, MarkdownRendererComponent],
      imports: [CommonModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  function createComponent(): ComponentFixture<TestableComponent> {
    return TestBed.createComponent(TestableComponent);
  }

  function getComponent(fixture: ComponentFixture<TestableComponent>) {
    return fixture.nativeElement.querySelector('markdown-renderer');
  }

  it('renders markdown into html', fakeAsync(() => {
    const fixture = createComponent();
    fixture.componentInstance.content = '# title';
    fixture.detectChanges();

    flush();
    const component = getComponent(fixture);
    const content = component.querySelector('.content');
    expect(content.innerHTML.trim()).toBe('<h1>title</h1>');
  }));
});
