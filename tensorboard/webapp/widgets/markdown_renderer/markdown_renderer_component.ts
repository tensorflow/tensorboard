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
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  SimpleChange,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import {marked} from '../../third_party/marked';

@Component({
  standalone: false,
  selector: 'markdown-renderer',
  templateUrl: './markdown_renderer_component.ng.html',
  styleUrls: ['./markdown_renderer_component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownRendererComponent implements OnChanges {
  @Input()
  markdown!: string;

  markdownHTML: string = '';

  constructor(public readonly changeDetectorRef: ChangeDetectorRef) {}

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['markdown']) {
      const markdownChange: SimpleChange = changes['markdown'];
      if (markdownChange.previousValue !== this.markdown) {
        this.markdownHTML = await marked.parse(this.markdown);
        this.changeDetectorRef.detectChanges();
      }
    }
  }
}
