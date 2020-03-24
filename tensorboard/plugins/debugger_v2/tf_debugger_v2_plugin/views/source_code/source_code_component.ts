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
import {Component, Input, OnInit} from '@angular/core';

import {loadMonaco, WindowWithRequireAndMonaco} from '../source_code/load_monaco_shim';

const windowWithRequireAndMonaco: WindowWithRequireAndMonaco = window;

@Component({
  selector: 'source-code-component',
  templateUrl: './source_code_component.ng.html',
  styleUrls: ['./source_code_component.css'],
})
export class SourceCodeComponent implements OnInit {
  @Input()
  lines: string[] | null = null;  // TODO(cais): Add spinner for `null`.

  // @Input()
  // focusedLineno: number | null = null;

  async ngOnInit(): Promise<void> {
    console.log('SourceCodeComponent.ngOnInit(): lines=', this.lines);  // DEBUG
    if (windowWithRequireAndMonaco.monaco === undefined) {
      await loadMonaco();
      console.log('Done loading monaco:', windowWithRequireAndMonaco.monaco);
    }
  }
}
