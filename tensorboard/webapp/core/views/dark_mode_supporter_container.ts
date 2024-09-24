/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {Store} from '@ngrx/store';
import {State} from '../../app_state';
import {getDarkModeEnabled} from '../../selectors';

@Component({
  standalone: false,
  selector: 'dark-mode-supporter',
  template: ``,
  styles: [
    `
      :host {
        display: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DarkModeSupportContainer {
  constructor(store: Store<State>) {
    store.select(getDarkModeEnabled).subscribe((darkMode) => {
      // When changing the class name `dark-mode`, we need to update the
      // DarkModeMixin which relies on the class name.
      document.body.classList.toggle('dark-mode', darkMode);
    });
  }
}
