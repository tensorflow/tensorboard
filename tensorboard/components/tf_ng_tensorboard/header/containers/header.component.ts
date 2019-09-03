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
import {Component} from '@angular/core';
import {Store, select, createSelector} from '@ngrx/store';
import {combineLatest, of} from 'rxjs';

import {State, getActivePlugin, getPlugins} from '../../core/core.reducers';
import {changePlugin} from '../../core/core.actions';

/** @typehack */ import * as _typeHackRxjs from 'rxjs';

const selectPlugins = createSelector(
  getPlugins,
  (listing) =>
    Object.keys(listing).map((key) =>
      Object.assign({}, {id: key}, listing[key])
    )
);

const selectActivePluginIndex = createSelector(
  getPlugins,
  getActivePlugin,
  (plugins, activePlugin) => {
    return Object.keys(plugins).findIndex(
      (pluginId) => pluginId === activePlugin
    );
  }
);

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  activePluginIndex$ = this.store.pipe(select(selectActivePluginIndex));
  plugins$ = this.store.pipe(select(selectPlugins));

  constructor(private store: Store<State>) {}

  onPluginSelectionChanged(index: number) {
    const index$ = of(index);
    combineLatest(this.plugins$, index$).subscribe(([plugins, index]) => {
      this.store.dispatch(changePlugin({plugin: plugins[index].id}));
    });
  }
}
