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
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import {Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';

import {
  DEFAULT_CODE_LANGUAGE,
  DEFAULT_CODE_FONT_SIZE,
  RESIZE_DEBOUNCE_INTERVAL_MS,
} from './editor_options';

@Component({
  selector: 'source-code-diff-component',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCodeDiffComponent implements OnInit, OnChanges, OnDestroy {
  @Input()
  firstText: string | null = null;

  @Input()
  secondText: string | null = null;

  // When a diff is shown, the two versions can be rendered in one of 2 modes:
  // - side by side: 2 scrollable frames with a vertical separator
  // - inline: 1 scrollable frame showing modified and original lines
  // This component does not respond to changes in this property.
  @Input()
  renderSideBySide: boolean = true;

  @Input()
  monaco: any;

  private editor: any = null;
  private readonly ngUnsubscribe$ = new Subject();
  private readonly onResize$ = new Subject<void>();

  constructor(private readonly ref: ElementRef) {
    const resizeObserver = new ResizeObserver(() => {
      this.onResize$.next();
    });
    resizeObserver.observe(ref.nativeElement);
    this.ngUnsubscribe$.subscribe(() => {
      resizeObserver.unobserve(ref.nativeElement);
    });
  }

  ngOnInit() {
    // When the element resizes, notify Monaco that it can recalculate layout.
    this.onResize$
      .pipe(
        debounceTime(RESIZE_DEBOUNCE_INTERVAL_MS),
        takeUntil(this.ngUnsubscribe$)
      )
      .subscribe(() => {
        if (this.editor) {
          this.editor.layout();
        }
      });
  }

  ngOnDestroy() {
    this.ngUnsubscribe$.next();
    this.ngUnsubscribe$.complete();
  }

  ngOnChanges(changes: SimpleChanges) {
    // All changes depend on Monaco.
    if (!this.monaco) {
      return;
    }

    const willCreateEditor = !this.editor;
    if (willCreateEditor) {
      this.editor = this.monaco.editor.createDiffEditor(
        this.ref.nativeElement,
        {
          language: DEFAULT_CODE_LANGUAGE,
          readOnly: true,
          fontSize: DEFAULT_CODE_FONT_SIZE,
          minimap: {
            enabled: true,
          },
          renderSideBySide: this.renderSideBySide,
        }
      );
    }

    if (willCreateEditor || changes['firstText'] || changes['secondText']) {
      this.editor.setModel({
        original: this.monaco.editor.createModel(this.firstText || ''),
        modified: this.monaco.editor.createModel(this.secondText || ''),
      });
    }
  }
}

export const TEST_ONLY = {
  RESIZE_DEBOUNCE_INTERVAL_MS,
};
