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
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {MarkdownRendererComponent} from './markdown_renderer_component';

@Component({
  selector: 'markdown-renderer',
  template: `
  <markdown-renderer [markdown]="content">
  </markdown-renderer>
  `,
  styles: [''],
})
class TestableComponent {
  @ViewChild(MarkdownRendererComponent)
  component!: MarkdownRendererComponent;

  @Input()
  markdown!: string;

}

describe('markdown_renderer/markdown_renderer test', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestableComponent, MarkdownRendererComponent],
      imports: [CommonModule],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

  });

  function createComponent(input: {
      markdown: string;
  }): ComponentFixture<TestableComponent> {
    const fixture = TestBed.createComponent(TestableComponent);
    fixture.componentInstance.markdown = input.markdown;

    return fixture;
  }

  it('sets', () => {
    const fixture = createComponent({
      markdown: "# title",
    });
    fixture.detectChanges();

    expect(1).toBe(0);
  });
});
