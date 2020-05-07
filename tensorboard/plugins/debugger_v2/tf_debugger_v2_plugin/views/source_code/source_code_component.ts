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
  SimpleChanges,
  ViewChild,
  OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {fromEvent, interval, Subject} from 'rxjs';
import {debounce, takeUntil, tap} from 'rxjs/operators';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

const DEFAULT_CODE_LANGUAGE = 'python';
const DEFAULT_CODE_FONT_SIZE = 10;

const RESIZE_DEBOUNCE_INTERAVL_MS = 50;

@Component({
  selector: 'source-code-component',
  templateUrl: './source_code_component.ng.html',
  styleUrls: ['./source_code_component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCodeComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  lines: string[] | null = null; // TODO(cais): Add spinner for `null`.

  @Input()
  focusedLineno: number | null = null;

  // TODO(cais): Explore better typing by depending on external libraries.
  @Input()
  monaco: any | null = null;

  @ViewChild('codeViewerContainer', {static: true, read: ElementRef})
  private readonly codeViewerContainer!: ElementRef<HTMLDivElement>;

  private editor: any = null;

  private decorations: string[] = [];

  private readonly ngUnsubscribe = new Subject();

  ngOnInit(): void {
    // Listen to window resize event. When resize happens, re-layout
    // monaco editor, so its width is always up-to-date with respect to
    // the window size. Do this with `debounce()` to prevent re-layouting
    // at too high a rate.
    const resizePipe = fromEvent(window, 'resize')
      .pipe(
        takeUntil(this.ngUnsubscribe),
        debounce(() => interval(RESIZE_DEBOUNCE_INTERAVL_MS)),
        tap(() => {
          if (this.editor !== null) {
            this.editor.layout();
          }
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.monaco === null) {
      return;
    }
    const currentLines: string[] | null = changes['monaco']
      ? this.lines
      : changes['lines']
      ? changes['lines'].currentValue
      : null;
    if (currentLines) {
      const value = currentLines.join('\n');
      if (this.editor === null) {
        this.editor = this.monaco.editor.create(
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

    const currentFocusedLineno: number | null = changes['monaco']
      ? this.focusedLineno
      : changes['focusedLineno']
      ? changes['focusedLineno'].currentValue
      : null;
    if (currentFocusedLineno && this.lines && this.monaco !== null) {
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
  }
}

export const TEST_ONLY = {
  RESIZE_DEBOUNCE_INTERAVL_MS,
};
