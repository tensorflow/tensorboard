/* Copyright 2017 The TensorFlow Authors. All Rights Reserved.

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
 * Implements run related plugin APIs.
 */
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, of} from 'rxjs';
import {distinctUntilChanged, map, mergeMap, take} from 'rxjs/operators';
import {State} from '../../../webapp/app_state';
import {getExperimentIdsFromRoute, getRuns} from '../../../webapp/selectors';
import {MessageId} from './message_types';
import {Ipc} from './plugin-host-ipc';

@Injectable({providedIn: 'root'})
export class PluginRunsApiHostImpl {
  constructor(
    private readonly ipc: Ipc,
    private readonly store: Store<State>
  ) {}

  init() {
    const getRuns$ = this.store.select(getExperimentIdsFromRoute).pipe(
      mergeMap((experimentIds) => {
        if (!experimentIds) {
          return of([]);
        }
        const runObservables = experimentIds.map((experimentId) => {
          return this.store.select(getRuns, {experimentId});
        });

        return combineLatest(runObservables).pipe(
          map((runsList) => {
            return runsList.flat();
          }),
          distinctUntilChanged((before, after) => {
            return (
              before.length === after.length &&
              before.every((val, index) => after[index].id === val.id)
            );
          }),
          map((runs) => {
            // Current API contract is to return list of experiment names instead
            // of their ids.
            return runs.map(({name}) => name);
          })
        );
      })
    );

    getRuns$.subscribe((runs) => {
      this.ipc.broadcast(MessageId.RUNS_CHANGED, runs);
    });

    this.ipc.listen(MessageId.GET_RUNS, () => {
      return getRuns$.pipe(take(1)).toPromise();
    });
  }
}
