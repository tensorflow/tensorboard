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
import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {from, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {MonacoShim} from './load_monaco_shim';

/**
 * A component that renders a diff of 2 separate text contents. Diffs can be
 * viewed inline or side by side.
 * - side by side: 2 scrollable frames with a vertical separator
 * - inline: 1 scrollable frame showing modified and original lines
 */
@Component({
  standalone: false,
  selector: 'source-code-diff',
  template: `
    <source-code-diff-component
      [firstText]="firstText"
      [secondText]="secondText"
      [renderSideBySide]="renderSideBySide"
      [monaco]="monaco$ | async"
      [useDarkMode]="useDarkMode"
    ></source-code-diff-component>
  `,
  styles: [
    `
      source-code-diff-component {
        display: block;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceCodeDiffContainer implements OnInit {
  @Input()
  firstText: string | null = null;

  @Input()
  secondText: string | null = null;

  @Input()
  renderSideBySide: boolean = true;

  @Input()
  useDarkMode: boolean = false;

  monaco$: Observable<typeof monaco> | null = null;

  ngOnInit(): void {
    this.monaco$ = from(MonacoShim.loadMonaco()).pipe(map(() => window.monaco));
  }
}
