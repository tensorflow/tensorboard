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
  HostListener,
  Input,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {
  loadMonaco,
  WindowWithRequireAndMonaco,
} from '../source_code/load_monaco_shim';

const windowWithRequireAndMonaco: WindowWithRequireAndMonaco = window;

const DEFAULT_CODE_LANGUAGE = 'python';
const DEFAULT_CODE_FONT_SIZE = 10;

/**
 * SoureCodeComponent displays the content of a source-code file.
 *
 * It displays the code with visual features including syntax highlighting.
 * It additionally provides functionalities to:
 * - Scroll to and highlight a given line by its line number.
 *
 * TODO(cais): Add support for line decoration and symbol decoration.
 *
 * Unlike SourceFilesComponent, SourceCodeComponent handles only one file at a
 * time.
 */
@Component({
  selector: 'source-code-component',
  templateUrl: './source_code_component.ng.html',
  styleUrls: ['./source_code_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCodeComponent {
  // Lines of the source-code file, split at line breaks.
  @Input()
  lines: string[] | null = null; // TODO(cais): Add spinner for `null`.

  // Line number to scroll to and highlight, 1-based.
  @Input()
  focusedLineno: number | null = null;

  @ViewChild('codeViewerContainer', {static: true, read: ElementRef})
  private readonly codeViewerContainer!: ElementRef<HTMLDivElement>;

  private editor: any = null;

  private decorations: string[] = [];

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await loadMonaco();
    const monaco = windowWithRequireAndMonaco.monaco;
    let currentLines: string[] | null = this.lines;
    if (changes.lines && changes.lines.currentValue !== null) {
      currentLines = changes.lines.currentValue;
      const value = changes.lines.currentValue.join('\n');
      if (this.editor === null) {
        this.editor = monaco.editor.create(
          this.codeViewerContainer.nativeElement,
          {
            value,
            language: DEFAULT_CODE_LANGUAGE,
            readOnly: true,
            fontSize: DEFAULT_CODE_FONT_SIZE,
            minimap: {
              enabled: true,
            },
          }
        );
      } else {
        this.editor.setValue(value);
      }
    }
    if (
      changes.focusedLineno &&
      changes.focusedLineno.currentValue &&
      currentLines &&
      this.editor !== null
    ) {
      this.editor.revealLineInCenter(
        changes.focusedLineno.currentValue,
        monaco.editor.ScrollType.Smooth
      );
      const lineLength =
        currentLines[changes.focusedLineno.currentValue - 1].length;
      this.decorations = this.editor.deltaDecorations(this.decorations, [
        {
          range: new monaco.Range(
            changes.focusedLineno.currentValue,
            1,
            changes.focusedLineno.currentValue,
            1
          ),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: 'highlight-gutter',
          },
        },
        {
          range: new monaco.Range(
            changes.focusedLineno.currentValue,
            1,
            changes.focusedLineno.currentValue,
            lineLength + 1
          ),
          options: {
            inlineClassName: 'highlight-line',
          },
        },
      ]);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (this.editor !== null) {
      this.editor.layout();
    }
  }
}
