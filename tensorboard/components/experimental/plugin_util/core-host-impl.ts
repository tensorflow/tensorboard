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
/**
 * Implements core plugin APIs.
 */
import '../../../webapp/tb_polymer_interop_types';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {distinctUntilChanged, filter} from 'rxjs/operators';
import {State} from '../../../webapp/app_state';
import {getAppLastLoadedTimeInMs} from '../../../webapp/selectors';
import {MessageId} from './message_types';
import {Ipc} from './plugin-host-ipc';

@Injectable({providedIn: 'root'})
export class PluginCoreApiHostImpl {
  constructor(
    private readonly ipc: Ipc,
    private readonly store: Store<State>
  ) {}

  init() {
    this.ipc.listen(MessageId.GET_URL_DATA, (context) => {
      if (!context) {
        return;
      }
      const prefix = `p.${context.pluginName}.`;
      const result: {
        [key: string]: string;
      } = {};

      const urlDict = window.tensorboard.tf_storage.getUrlHashDict();
      for (let key in urlDict) {
        if (key.startsWith(prefix)) {
          const pluginKey = key.substring(prefix.length);
          result[pluginKey] = urlDict[key];
        }
      }
      return result;
    });

    this.store
      .select(getAppLastLoadedTimeInMs)
      .pipe(
        filter((lastLoadedTimeInMs) => lastLoadedTimeInMs !== null),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.ipc.broadcast(MessageId.DATA_RELOADED, void {});
      });
  }
}
