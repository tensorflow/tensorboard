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
  Component,
  ElementRef,
  Input,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {loadMonaco, WindowWithRequireAndMonaco} from '../source_code/load_monaco_shim';

const windowWithRequireAndMonaco: WindowWithRequireAndMonaco = window;

const DEFAULT_CODE_FONT_SIZE = 10;

@Component({
  selector: 'source-code-component',
  templateUrl: './source_code_component.ng.html',
  styleUrls: ['./source_code_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SourceCodeComponent implements OnInit {
  @Input()
  lines: string[] | null = null;  // TODO(cais): Add spinner for `null`.

  @Input()
  focusedLineno: number | null = null;

  @ViewChild('codeViewerContainer', {static: true, read: ElementRef})
  private readonly codeViewerContainer!: ElementRef<HTMLDivElement>;

  private editor: any = null;

  private decorations: string[] = [];

  async ngOnInit(): Promise<void> {
    // if (windowWithRequireAndMonaco.monaco === undefined) {
    //   await loadMonaco();
    //   console.log('Done loading monaco: lines=', this.lines);
    // }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    console.log('SourceCodeComponent.ngOnChanges():', changes);  // DEBUG
    await loadMonaco();
    const monaco = windowWithRequireAndMonaco.monaco;
    if (changes.lines && this.lines !== null) {
      const value = this.lines.join("\n");
      if (this.editor === null) {
        this.editor = monaco.editor.create(this.codeViewerContainer.nativeElement, {
          value,
          language: 'python',
          readOnly: true,
          fontSize: DEFAULT_CODE_FONT_SIZE,
          minimap: {
            enabled: true,
          },
        });
        console.log('element:', this.codeViewerContainer.nativeElement);
      } else {
        this.editor.setValue(value);
      }
    }
    if (changes.focusedLineno && this.lines && this.focusedLineno) {
      console.log('focusedLineno = ', this.focusedLineno);  // DEBUG
      this.editor.revealLineInCenter(
        this.focusedLineno, monaco.editor.ScrollType.Smooth);
      const lineLength = this.lines[this.focusedLineno - 1].length;
      this.decorations = this.editor.deltaDecorations(this.decorations, [
        {
          range: new monaco.Range(this.focusedLineno, 1, this.focusedLineno, 1),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: 'highlight-gutter',
          }
        },
        {
          range: new monaco.Range(this.focusedLineno, 1, this.focusedLineno, lineLength + 1),
          options: {
            inlineClassName: 'highlight-line',
          }
        },
      ]);
    }
  }
}
