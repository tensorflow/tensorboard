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
import {Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs';
import {State as OtherAppState} from '../../../../../webapp/app_state';
import {getDarkModeEnabled} from '../../../../../webapp/selectors';
import {
  getFocusedSourceFileContent,
  getFocusedSourceLineSpec,
} from '../../store';
import {State as DebuggerState} from '../../store/debugger_types';

@Component({
  standalone: false,
  selector: 'tf-debugger-v2-source-files',
  template: `
    <source-files-component
      [focusedSourceFileContent]="focusedSourceFileContent$ | async"
      [focusedSourceLineSpec]="focusedSourceLineSpec$ | async"
      [useDarkMode]="useDarkMode$ | async"
    ></source-files-component>
  `,
})
export class SourceFilesContainer {
  constructor(private readonly store: Store<DebuggerState & OtherAppState>) {
    this.focusedSourceFileContent$ = this.store.select(
      getFocusedSourceFileContent
    );
    this.focusedSourceLineSpec$ = this.store.select(getFocusedSourceLineSpec);
    this.useDarkMode$ = this.store.select(getDarkModeEnabled);
  }

  readonly focusedSourceFileContent$;

  readonly focusedSourceLineSpec$;

  readonly useDarkMode$: Observable<boolean>;
}
