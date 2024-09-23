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
  getMonacoThemeString,
  RESIZE_DEBOUNCE_INTERVAL_MS,
} from './editor_options';

@Component({
  standalone: false,
  selector: 'source-code-diff-component',
  template: `
    <div
      #codeViewerContainer
      class="code-viewer-container"
      detectResize
      [resizeEventDebouncePeriodInMs]="RESIZE_DEBOUNCE_INTERVAL_MS"
      (onResize)="onResize()"
    ></div>
  `,
  styles: [
    `
      .code-viewer-container {
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCodeDiffComponent implements OnChanges {
  @Input()
  firstText: string | null = null;

  @Input()
  secondText: string | null = null;

  // When a diff is shown, the two versions can be rendered in one of 2 modes:
  // - side by side: 2 scrollable frames with a vertical separator
  // - inline: 1 scrollable frame showing modified and original lines
  @Input()
  renderSideBySide: boolean = true;

  @Input()
  monaco: typeof monaco | null = null;

  @Input()
  useDarkMode!: boolean;

  @ViewChild('codeViewerContainer', {static: true, read: ElementRef})
  private readonly codeViewerContainer!: ElementRef<HTMLDivElement>;

  private editor: any = null;
  readonly RESIZE_DEBOUNCE_INTERVAL_MS = RESIZE_DEBOUNCE_INTERVAL_MS;

  onResize() {
    if (this.editor) {
      this.editor.layout();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // All changes depend on Monaco.
    if (!this.monaco) {
      return;
    }

    const willCreateEditor = !this.editor;
    if (willCreateEditor) {
      this.editor = this.monaco.editor.createDiffEditor(
        this.codeViewerContainer.nativeElement,
        {
          readOnly: true,
          fontSize: DEFAULT_CODE_FONT_SIZE,
          minimap: {
            enabled: true,
          },
          renderSideBySide: this.renderSideBySide,
          theme: getMonacoThemeString(this.useDarkMode),
        }
      );
    }

    if (willCreateEditor || changes['firstText'] || changes['secondText']) {
      this.editor.setModel({
        original: this.monaco.editor.createModel(this.firstText || ''),
        modified: this.monaco.editor.createModel(this.secondText || ''),
      });
    }

    if (changes['renderSideBySide']) {
      this.editor.updateOptions({renderSideBySide: this.renderSideBySide});
    }

    if (changes['useDarkMode']) {
      this.monaco.editor.setTheme(getMonacoThemeString(this.useDarkMode));
    }
  }
}
