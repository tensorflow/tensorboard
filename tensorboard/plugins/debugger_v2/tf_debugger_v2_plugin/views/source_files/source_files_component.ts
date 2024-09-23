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
import {Component, Input} from '@angular/core';
import {SourceFileContent, StackFrame} from '../../store/debugger_types';

/**
 * Renders the content of source file(s).
 *
 * Unlike `SourceCodeComponent`, which displays only the content of a single
 * source-code file, `SourceFilesComponent`is aware of the meta-informaton about
 * the files being displayed, such their file paths. Such meta-information is
 * displayed by this component.
 */
@Component({
  standalone: false,
  selector: 'source-files-component',
  templateUrl: './source_files_component.ng.html',
  styleUrls: ['./source_files_component.css'],
})
export class SourceFilesComponent {
  @Input()
  focusedSourceFileContent: SourceFileContent | null = null;

  @Input()
  focusedSourceLineSpec: StackFrame | null = null;

  @Input()
  useDarkMode!: boolean;
}
