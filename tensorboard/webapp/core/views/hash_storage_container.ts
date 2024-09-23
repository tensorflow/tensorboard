/* Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
import {select, Store} from '@ngrx/store';
import {pluginUrlHashChanged} from '../actions';
import {State} from '../state';
import {getActivePlugin} from '../store';
import {ChangedProp} from './hash_storage_component';

@Component({
  standalone: false,
  selector: 'hash-storage',
  template: `
    <hash-storage-component
      [activePluginId]="activePluginId$ | async"
      (onValueChange)="onValueChanged($event)"
    >
    </hash-storage-component>
  `,
  styles: [
    `
      :host {
        display: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HashStorageContainer {
  readonly activePluginId$;

  constructor(private readonly store: Store<State>) {
    this.activePluginId$ = this.store.pipe(select(getActivePlugin));
  }

  onValueChanged(change: {prop: ChangedProp; value: string}) {
    switch (change.prop) {
      case ChangedProp.ACTIVE_PLUGIN:
        this.store.dispatch(pluginUrlHashChanged({plugin: change.value}));
        break;
    }
  }
}
