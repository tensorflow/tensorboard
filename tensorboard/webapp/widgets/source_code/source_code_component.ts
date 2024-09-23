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
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  DEFAULT_CODE_FONT_SIZE,
  DEFAULT_CODE_LANGUAGE,
  getMonacoThemeString,
  RESIZE_DEBOUNCE_INTERVAL_MS,
} from './editor_options';

@Component({
  standalone: false,
  selector: 'source-code-component',
  templateUrl: './source_code_component.ng.html',
  styleUrls: ['./source_code_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCodeComponent implements OnChanges {
  @Input()
  lines: string[] | null = null; // TODO(cais): Add spinner for `null`.

  @Input()
  focusedLineno: number | null = null;

  @Input()
  monaco: typeof monaco | null = null;

  @Input()
  useDarkMode!: boolean;

  @ViewChild('codeViewerContainer', {static: true, read: ElementRef})
  private readonly codeViewerContainer!: ElementRef<HTMLDivElement>;

  private editor: any = null;
  private decorations: string[] = [];
  readonly RESIZE_DEBOUNCE_INTERVAL_MS = RESIZE_DEBOUNCE_INTERVAL_MS;

  onResize() {
    if (this.editor) {
      this.editor.layout();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.monaco === null) {
      return;
    }
    const editorNewlyCreated = changes['monaco'] && this.editor === null;

    if (this.editor === null) {
      this.editor = this.monaco.editor.create(
        this.codeViewerContainer.nativeElement,
        {
          value: (this.lines ?? []).join('\n'),
          language: DEFAULT_CODE_LANGUAGE,
          readOnly: true,
          fontSize: DEFAULT_CODE_FONT_SIZE,
          minimap: {
            enabled: true,
          },
          theme: getMonacoThemeString(this.useDarkMode),
        }
      );
    }

    if (changes['lines'] && this.lines) {
      this.editor.setValue(this.lines.join('\n'));
    }

    const currentFocusedLineno: number | null =
      editorNewlyCreated || changes['focusedLineno']
        ? this.focusedLineno
        : null;
    if (currentFocusedLineno && this.lines) {
      this.editor.revealLineInCenter(
        currentFocusedLineno,
        this.monaco.editor.ScrollType.Smooth
      );
      const lineLength = this.lines[currentFocusedLineno - 1].length;
      this.decorations = this.editor.deltaDecorations(this.decorations, [
        {
          range: new this.monaco.Range(
            currentFocusedLineno,
            1,
            currentFocusedLineno,
            1
          ),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: 'highlight-gutter',
          },
        },
        {
          range: new this.monaco.Range(
            currentFocusedLineno,
            1,
            currentFocusedLineno,
            lineLength + 1
          ),
          options: {
            inlineClassName: 'highlight-line',
          },
        },
      ]);
    }

    if (changes['useDarkMode']) {
      this.monaco.editor.setTheme(getMonacoThemeString(this.useDarkMode));
    }
  }
}
